'use strict';
const { promisify } = require('util');
const wait = promisify(setTimeout);

const discordVoice = require('@discordjs/voice');
const { getInfo } = require('ytdl-core');
const ytdl = require('youtube-dl-exec').raw;

const logger = require('./util/logger');

let subscription = null;


async function handleYt(args, msg) {
    const command = args[0];
	const url = args[1];

    if (command === 'play') {
        return await play(url, msg);
    } else if (command === 'stop') {
        return await stop();
    } else if (command === 'queue') {
        return await queue(url);
    } else if (command === 'pause') {
        return await pause();
    } else if (command === 'resume') {
        return await resume();
    } else if (command === 'skip') {
        return await skip();
    } else if (command === 'quit') {
		return await quit();
	} else {
        return 'Invalid yt command';
    }
}


async function play(url, msg) {
    if (!msg.member.voice.channel) {
        return 'You aren\'t in a voice channel';
    }
	if (!url) {
		return 'No url given';
	}

    if (!subscription) {
        const channel = msg.member.voice.channel;

        subscription = new MusicSubscription(
            discordVoice.joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
				adapterCreator: channel.guild.voiceAdapterCreator,
            })
        );

        // Make sure the connection is ready before processing the user's request
		try {
			await discordVoice.entersState(
                subscription.voiceConnection,
                discordVoice.VoiceConnectionStatus.Ready,
                20000
            );
		} catch (error) {
			logger.logError(error);
			return 'Failed to join voice channel within 20 seconds, please try again later!';
		}

        try {
			return await queue(url);
		} catch (error) {
			logger.logError(error);
			return 'Failed to play track, please try again later!';
		}

    }
}

async function skip() {
	if (subscription.queue.length === 0) {
		return 'No tracks left';
	}
    subscription.audioPlayer.stop(true);
    return 'Skipped a song';
}

async function pause() {
    subscription.audioPlayer.pause();
}

async function resume() {
    subscription.audioPlayer.unpause();
}


async function stop() {
    subscription.stop();
    return 'Stopped playing music';
}


async function quit() {
	subscription.quit();
	subscription = null;
}


async function queue(url) {
    // Attempt to create a Track from the user's video URL
    const track = await Track.from(url);
    // Enqueue the track and reply a success message to the user
    subscription.enqueue(track);
    return `Queued %%${track.title}%%`;
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
					f: 'bestaudio[ext=webm+acodec=opus+asr=48000]/bestaudio',
					r: '100K',
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
				stream.resume();
				reject(error);
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

		// Configure audio player
		this.audioPlayer.on ('stateChange', async (oldState, newState) => {
			if (
                newState.status === discordVoice.AudioPlayerStatus.Idle &&
                oldState.status !== discordVoice.AudioPlayerStatus.Idle
            ) {
				// If the Idle state is entered from a non-Idle state, it means that an audio resource has finished playing.
				// The queue is then processed to start playing the next track, if one is available.
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
		this.processQueue();
	}

    quit() {
        this.queueLock = true;
        this.audioPlayer.stop(true);
        this.voiceConnection.disconnect();
    }

    next() {
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
		try {
			logger.logInfo('Playing track');
			// Attempt to convert the Track into an AudioResource (i.e. start streaming the video)
			const resource = await nextTrack.createAudioResource();
			this.audioPlayer.play(resource);
			this.voiceConnection.subscribe(this.audioPlayer);
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
