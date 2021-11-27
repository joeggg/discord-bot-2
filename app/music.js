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
	const channel = msg.member.voice.channel;

	if (command in MUSIC_COMMANDS) {
		const func = MUSIC_COMMANDS[command];
		return await func(queryString, subKey, channel);
	} else {
		return 'Invalid yt command';
	}
}

async function play(query, subKey, channel) {
	if (!channel) {
		return 'You aren\'t in a voice channel';
	}
	if (!query) {
		return 'No query given';
	}

	if (!subscriptions[subKey]) {
		subscriptions[subKey] = new MusicSubscription(
			discordVoice.joinVoiceChannel({
				channelId: channel.id,
				guildId: channel.guild.id,
				adapterCreator: channel.guild.voiceAdapterCreator,
			})
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
		subscriptions[subKey].audioPlayer.stop(true);
		subscriptions[subKey].queue = [];
		return await queue(query, subKey);
	} catch (error) {
		logger.logError(error);
		return 'Failed to play track, please try again later!';
	}
}

async function queue(query, subKey) {
	// Search for the query on Youtube and return the first video's URL
	const urls = await search(query);
	// Attempt to create a Track from the video URL
	if (urls) {
		let message = '';
		for (const url of urls) {
			const track = await Track.from(url);
			// Enqueue the track and reply a success message to the user
			await subscriptions[subKey].enqueue(track);
			message += `Queued [${track.title}]\n`;
		}
		return message;
	} else {
		return 'Unable to find a URL';
	}
}

async function search(query) {
	if (query.includes('youtube.com/watch?v=')) {
		return query;
	}
	const auth = new google.auth.GoogleAuth({
		keyFile: 'token/google_key.json',
		scopes: ['https://www.googleapis.com/auth/youtube.readonly'],
	});
	const service = google.youtube('v3');
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
	if (itemType === 'youtube#playlist') {
		const videos = await new Promise((res, rej) => {
			service.playlistItems.list({
				auth: auth,
				part: 'contentDetails',
				playlistId: data[0].id.playlistId,
				maxResults: 20,
			}, (err, resp) => {
				if (err) {
					logger.logError(err);
					logger.logInfo(resp);
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

	} else if (itemType === 'youtube#video') {
		const url = `https://youtube.com/watch?v=${data[0].id.videoId}`;
		return [url];
	}
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
				logger.logError(error);
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
	constructor(voiceConnection) {
		this.voiceConnection = voiceConnection;
		this.audioPlayer = discordVoice.createAudioPlayer();
		this.queue = [];
		this.currentTrack = null;

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
