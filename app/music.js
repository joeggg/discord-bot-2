'use strict';
const { promisify } = require('util');
const wait = promisify(setTimeout);

const discordVoice = require('@discordjs/voice');
const { getInfo } = require('ytdl-core');
const { ytdl } = require('youtube-dl-exec');

const logger = require('./util/logger');

const subscription = null;


async function handleYt(args, msg) {
    const [ command, url ] = args.split(' ');

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
    } else {
        return 'Invalid yt command';
    }
}


async function play(url, msg) {
    if (!msg.member.voice.channel) {
        return 'You aren\'t in a voice channel';
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
                VoiceConnectionStatus.Ready,
                20e3
            );
		} catch (error) {
			logger.logError(error);
			return 'Failed to join voice channel within 20 seconds, please try again later!';
		}

        try {
			await queue(url);
			return `Queued %%${track.title}%%`;
		} catch (error) {
			logger.logError(error);
			return 'Failed to play track, please try again later!';
		}

    }
}

async function skip() {
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


async function queue(url) {
    // Attempt to create a Track from the user's video URL
    const track = await Track.from(url);
    // Enqueue the track and reply a success message to the user
    subscription.enqueue(track);
    return `Queued %%${track.title}%%`;
}


class Track {
	constructor({ url, title, onStart, onFinish, onError }) {
		this.url = url;
		this.title = title;
		this.onStart = onStart;
		this.onFinish = onFinish;
		this.onError = onError;
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
					demuxProbe(stream)
						.then(probe => resolve(
                            createAudioResource(
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
	async from(url) {
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

		this.voiceConnection.on('stateChange', async (_, newState) => {
			if (newState.status === discordVoice.VoiceConnectionStatus.Disconnected) {
				if (
                    newState.reason === discordVoice.VoiceConnectionDisconnectReason.WebSocketClose &&
                    newState.closeCode === 4014
                ) {
					/*
						If the WebSocket closed with a 4014 code, this means that we should not manually attempt to reconnect,
						but there is a chance the connection will recover itself if the reason of the disconnect was due to
						switching voice channels. This is also the same code for the bot being kicked from the voice channel,
						so we allow 5 seconds to figure out which scenario it is. If the bot has been kicked, we should destroy
						the voice connection.
					*/
					try {
						await entersState(
                            this.voiceConnection,
                            discordVoice.VoiceConnectionStatus.Connecting,
                            5_000
                        );
						// Probably moved voice channel
					} catch {
						this.voiceConnection.destroy();
						// Probably removed from voice channel
					}
				} else if (this.voiceConnection.rejoinAttempts < 5) {
					/*
						The disconnect in this case is recoverable, and we also have <5 repeated attempts so we will reconnect.
					*/
					await wait((this.voiceConnection.rejoinAttempts + 1) * 5_000);
					this.voiceConnection.rejoin();
				} else {
					/*
						The disconnect in this case may be recoverable, but we have no more remaining attempts - destroy.
					*/
					this.voiceConnection.destroy();
				}
			} else if (newState.status === discordVoice.VoiceConnectionStatus.Destroyed) {
				/*
					Once destroyed, stop the subscription
				*/
				this.stop();
			} else if (
				!this.readyLock &&
				(
                    newState.status === discordVoice.VoiceConnectionStatus.Connecting ||
                    newState.status === discordVoice.VoiceConnectionStatus.Signalling
                )
			) {
				/*
					In the Signalling or Connecting states, we set a 20 second time limit for the connection to become ready
					before destroying the voice connection. This stops the voice connection permanently existing in one of these
					states.
				*/
				this.readyLock = true;
				try {
					await entersState(this.voiceConnection, discordVoice.VoiceConnectionStatus.Ready, 20_000);
				} catch {
					if (
                        this.voiceConnection.state.status !== discordVoice.VoiceConnectionStatus.Destroyed
                    ) {
                        this.voiceConnection.destroy();
                    }
				} finally {
					this.readyLock = false;
				}
			}
		});

		// Configure audio player
		this.audioPlayer.on ('stateChange', (oldState, newState) => {
			if (
                newState.status === discordVoice.AudioPlayerStatus.Idle &&
                oldState.status !== discordVoice.AudioPlayerStatus.Idle
            ) {
				// If the Idle state is entered from a non-Idle state, it means that an audio resource has finished playing.
				// The queue is then processed to start playing the next track, if one is available.
				void this.processQueue();
			}
		});

		voiceConnection.subscribe(this.audioPlayer);
	}

	/**
	 * Adds a new Track to the queue.
	 *
	 * @param track The track to add to the queue
	 */
	enqueue(track) {
		this.queue.push(track);
		void this.processQueue();
	}

    quit() {
        this.queueLock = true;
        this.audioPlayer.stop(true);
        this.voiceConnection.destroy();
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
			// Attempt to convert the Track into an AudioResource (i.e. start streaming the video)
			const resource = await nextTrack.createAudioResource();
			this.audioPlayer.play(resource);
			this.queueLock = false;
		} catch (error) {
			// If an error occurred, try the next item of the queue instead
			this.queueLock = false;
			return this.processQueue();
		}
	}
}


module.exports = {
    handleYt: handleYt,
};
