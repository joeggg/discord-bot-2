'use strict';
const discordVoice = require('@discordjs/voice');
const { google } = require('googleapis');
const { getInfo } = require('ytdl-core');
const ytdl = require('youtube-dl-exec').raw;

const logger = require('./util/logger');

let subscriptions = {};

const MUSIC_COMMANDS = {
	'play': play,
	'queue': queue,
	'pause': pause,
	'resume': resume,
	'skip': skip,
	'quit': quit,
	'show': show,
};

async function handleYt(args, msg) {
	const command = args[0];
	const queryString = args.slice(1).join(' ');
	const subKey = `${msg.member.voice.channelId}:${msg.guildId}`;
	const channels = {
		voice: msg.member.voice.channel,
		text: msg.channel,
	};

	if (command in MUSIC_COMMANDS) {
		const func = MUSIC_COMMANDS[command];
		return await func(queryString, subKey, channels);
	} else {
		return 'Invalid yt command';
	}
}

/**
 *  Joins channel and queues a track/tracks.
 *  Forces to front of queue if already playing
 */
async function play(query, subKey, channels) {
	if (!channels.voice) {
		return 'You aren\'t in a voice channel';
	}
	if (!query) {
		return 'No query given';
	}

	if (!subscriptions[subKey]) {
		subscriptions[subKey] = new MusicSubscription(
			discordVoice.joinVoiceChannel({
				channelId: channels.voice.id,
				guildId: channels.voice.guild.id,
				adapterCreator: channels.voice.guild.voiceAdapterCreator,
			}),
			channels.text,
		);

		// Make sure the connection is ready before processing the user's request
		try {
			await discordVoice.entersState(
				subscriptions[subKey].voiceConnection,
				discordVoice.VoiceConnectionStatus.Ready,
				20000
			);
		} catch (error) {
			logger.logError(error);
			return 'Failed to join voice channel within 20 seconds, please try again later!';
		}
	}

	try {
		return await queue(query, subKey, channels, true);
	} catch (error) {
		logger.logError(error);
		return 'Failed to play track, please try again later!';
	}
}

/**
 *  Queues a track/tracks
 */
async function queue(query, subKey, channels, force = false) {
	// Search for the query on Youtube and return the first video's URL
	const urls = await search(query);
	if (urls) {
		let message = '';
		if (force) {
			// Make a copy of the queue to append after the forced items
			const queueCopy = subscriptions[subKey].queue;
			subscriptions[subKey].queue = [];
			subscriptions[subKey].audioPlayer.stop(true);
			await queueTracks(urls, subscriptions[subKey], channels.text);
			subscriptions[subKey].queue = [...subscriptions[subKey].queue, ...queueCopy];
		} else {
			await queueTracks(urls, subscriptions[subKey], channels.text);
		}
		return message;
	} else {
		return 'Unable to find a URL';
	}
}

async function queueTracks(urls, subscription, channel) {
	for (const url of urls) {
		try {
			// Attempt to create a Track from the video URL
			const track = await Track.from(url);
			// Enqueue the track and reply a success message to the user
			await subscription.enqueue(track);
			channel.send(`Queued [${track.title}]\n`);
		}
		catch (error) {
			logger.logInfo(`Failed to queue [${url}]`);
			logger.logError(error);
		}
	}
}

/**
 * 	Gets a list of URLs based on an input search term or playlist/video URL
 *  Returns 1 URL for a video result or up to 20 for a playlist
 * 	Uses the Youtube API for searches
 * 
 * @param {string} query search term or playlist/video URL
 * @returns {Array[string]} List of URLS
 */
async function search(query) {
	// Already a video link
	if (query.startsWith('https://www.youtube.com/watch?v=')) {
		return [query];
	}
	// Set up auth and api
	const auth = new google.auth.GoogleAuth({
		keyFile: 'token/google_key.json',
		scopes: ['https://www.googleapis.com/auth/youtube.readonly'],
	});
	const service = google.youtube('v3');
	// Playlist link: return videos from ID
	if (query.startsWith('https://www.youtube.com/playlist?list=')) {
		return getPlaylistVideos(service, auth, query.split('=')[1]);
	}
	// Search for phrase on youtube api 
	const data = await new Promise((res, rej) => {
		service.search.list({
			auth: auth,
			part: 'snippet',
			maxResults: 5,
			q: query,
		}, (err, resp) => {
			if (err) {
				logger.logError(err);
				rej('Failure in Google API');
			} else {
				res(resp.data.items);
			}
		});
	});
	const itemType = data[0].id.kind;
	// Return list of links if playlist else just the one video link
	if (itemType === 'youtube#playlist') {
		return getPlaylistVideos(service, auth, data[0].id.playlistId);

	} else if (itemType === 'youtube#video') {
		const url = `https://youtube.com/watch?v=${data[0].id.videoId}`;
		return [url];
	}
}

/**
 *  Uses Youtube API to get a list of URLS of the first 20 videos of a playlist
 * 
 * @returns {Array[string]} List of URLS
 */
async function getPlaylistVideos(service, auth, playlistId) {
	const videos = await new Promise((res, rej) => {
		service.playlistItems.list({
			auth: auth,
			part: 'contentDetails',
			playlistId: playlistId,
			maxResults: 50,
		}, (err, resp) => {
			if (err) {
				logger.logError(err);
				rej('Failure in Google API');
			} else {
				res(resp.data.items);
			}
		});
	});
	const urls = [];
	for (const video of videos) {
		urls.push(`https://youtube.com/watch?v=${video.contentDetails.videoId}`);
	}
	return urls;
}

async function skip(_, subKey) {
	if (!subscriptions[subKey]) {
		return 'No music playing';
	}
	if (subscriptions[subKey].queue.length === 0) {
		return 'No tracks left';
	}
	subscriptions[subKey].audioPlayer.stop(true);
	return 'Skipped a song';
}

async function pause(_, subKey) {
	if (!subscriptions[subKey]) {
		return 'No music playing';
	}
	subscriptions[subKey].audioPlayer.pause();
}

async function resume(_, subKey) {
	if (!subscriptions[subKey]) {
		return 'No music playing';
	}
	subscriptions[subKey].audioPlayer.unpause();
}

async function quit(_, subKey) {
	if (!subscriptions[subKey]) {
		return 'No music playing';
	}
	subscriptions[subKey].quit();
	subscriptions[subKey] = null;
}

async function show(_, subKey) {
	if (subscriptions[subKey] && subscriptions[subKey].currentTrack) {
		let output = '  Current queue:\n';
		output += `| ->${subscriptions[subKey].currentTrack.title}\n`;
		for (const track of subscriptions[subKey].queue) {
			output += `|   ${track.title}\n`;
		}
		return output;
	}
	return 'No queued tracks to show';
}


class Track {
	constructor({ url, title }) {
		this.url = url;
		this.title = title;
	}

	/**
	 * Creates an AudioResource from this Track.
	 */
	createAudioResource() {
		return new Promise((resolve, reject) => {
			const process = ytdl(
				this.url,
				{
					o: '-',
					q: '',
					r: '4M',
				},
				{ stdio: ['ignore', 'pipe', 'ignore'] },
			);
			if (!process.stdout) {
				reject(new Error('No stdout'));
				return;
			}
			const stream = process.stdout;
			const onError = error => {
				if (!process.killed) process.kill();
				// logger.logError(error);
				stream.resume();
				reject();
			};
			process
				.once('spawn', () => {
					discordVoice.demuxProbe(stream)
						.then(probe => resolve(
							discordVoice.createAudioResource(
								probe.stream,
								{ metadata: this, inputType: probe.type }
							)
						))
						.catch(onError);
				})
				.catch(onError);
		});
	}

	/**
	 * Creates a Track from a video URL and lifecycle callback methods.
	 *
	 * @param url The URL of the video
	 * @param methods Lifecycle callbacks
	 * @returns The created Track
	 */
	static async from(url) {
		const info = await getInfo(url);
		return new Track({
			title: info.videoDetails.title,
			url,
		});
	}
}


/**
 * A MusicSubscription exists for each active VoiceConnection. Each subscription has its own audio player and queue,
 * and it also attaches logic to the audio player and voice connection for error handling and reconnection logic.
 */
class MusicSubscription {
	constructor(voiceConnection, channel) {
		this.voiceConnection = voiceConnection;
		this.audioPlayer = discordVoice.createAudioPlayer();
		this.queue = [];
		this.currentTrack = null;
		this.channel = channel;

		// Configure audio player
		this.audioPlayer.on('stateChange', async (oldState, newState) => {
			if (
				newState.status === discordVoice.AudioPlayerStatus.Idle &&
				oldState.status !== discordVoice.AudioPlayerStatus.Idle
			) {
				// If the Idle state is entered from a non-Idle state, it means that an audio resource has finished playing.
				// The queue is then processed to start playing the next track, if one is available.
				this.currentTrack = null;
				this.processQueue();
			}
		});

		voiceConnection.subscribe(this.audioPlayer);
	}

	/**
	 * Adds a new Track to the queue.
	 *
	 * @param track The track to add to the queue
	 */
	async enqueue(track) {
		this.queueLock = false;
		this.queue.push(track);
		await this.processQueue();
	}

	quit() {
		this.queueLock = true;
		this.audioPlayer.stop(true);
		this.voiceConnection.disconnect();
	}

	clearQueue() {
		this.queue = [];
	}

	/**
	 * Attempts to play a Track from the queue
	 */
	async processQueue() {
		// If the queue is locked (already being processed), is empty, or the audio player is already playing something, return
		if (
			this.queueLock ||
			this.audioPlayer.state.status !== discordVoice.AudioPlayerStatus.Idle ||
			this.queue.length === 0
		) {
			return;
		}
		// Lock the queue to guarantee safe access
		this.queueLock = true;

		// Take the first item from the queue. This is guaranteed to exist due to the non-empty check above.
		const nextTrack = this.queue.shift();
		this.currentTrack = nextTrack;
		try {
			logger.logInfo('Playing track');
			// Attempt to convert the Track into an AudioResource (i.e. start streaming the video)
			const resource = await nextTrack.createAudioResource();
			this.audioPlayer.play(resource);
			this.channel.send(`Playing track: ${nextTrack.title}`);
			this.queueLock = false;
		} catch (error) {
			// If an error occurred, try the next item of the queue instead
			logger.logError(error);
			this.queueLock = false;
			return this.processQueue();
		}
	}
}


module.exports = {
	handleYt: handleYt,
};
