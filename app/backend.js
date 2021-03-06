'use strict';
const discord = require('discord.js');
const discordVoice = require('@discordjs/voice');
const nconf = require('nconf');
const zmq = require('zeromq');

const logger = require('./util/logger');
const { subscriptions } = require('./music');

const NS_IN_S = 1000000000;
const say_config_commands = {
    'voice': null,
    'pitch': null,
    'rate': null
};

/**
 * Basic ZMQ REQ interface with async wrapper to make API calls easily
 */
class ZMQRouter {
    constructor() {
        this.sck = zmq.socket('dealer');
        const address = nconf.get('backend_endpoint');
        this.sck.connect(address);
        logger.logInfo(`Backend socket connected at ${address}`);
        this.response = null;
        this.maxWait = 30 * NS_IN_S;
        this.sck.on('message', (res) => {
            this.response = res;
        });
    }

    async make_call(msg) {
        const start = process.hrtime.bigint();
        logger.logInfo(`Making Python api call:\n${JSON.stringify(msg, null, 2)}`);
        this.sck.send(JSON.stringify(msg));

        const response = await this.get_response();
        const parsed = JSON.parse(response);
        const end = process.hrtime.bigint();
        logger.logInfo(`Python call time taken: ${Number(end - start) / 1000000}ms`);

        return parsed;
    }

    async get_response() {
        const start = process.hrtime.bigint();
        let end = process.hrtime.bigint();

        while (!this.response && end - start < this.maxWait) {
            await new Promise(res => setTimeout(res, 1));
            end = process.hrtime.bigint();
        }
        const return_val = this.response;
        this.response = null;
        return return_val;
    }

}

let router = null;

function setupRouter() {
    router = new ZMQRouter();
}

/**
 * Google texttospeech API access via Python backend
 *  2 commands available:
 *    - Request a voice clip of some text (args all input text) 
 *    - Changes the current voice used, args are ['voice', '<voicename>']
 * @param {string[]} args 
 */
async function sayTest(args) {
    if (args.length === 0) {
        return 'No text received';
    }

    const req = { command: null, params: {} };
    let say = true;
    if (args[0] in say_config_commands) {
        say = false;
        req.command = `change_google_${args[0]}`;
        req.params[args[0]] = args[1];
    } else {
        req.command = 'say_test';
        req.params.text = args.join(' ');
    }

    const response = await router.make_call(req);
    if (response.code === 0) {
        if (say) {
            const file = new discord.MessageAttachment(nconf.get('texttospeech_dir'));
            return { content: 'Listen', files: [file] };
        }
        return response.result;
    } else if (response.code === 1) {
        logger.logBackendError(response.error);
        return response.error.msg;
    }
    throw new Error('Unknown failure');
}

async function testAsync() {
    const req = { command: 'test_async', params: {} };

    const response = await router.make_call(req);
    if (response.code === 0) {
        return response.result;
    } else if (response.code === 1) {
        logger.logBackendError(response.error);
        return response.error.msg;
    }
    throw new Error('Unknown failure');
}

/**
 * Change the voice preset being used for the Gooogle TTS
 * 
 * @param {string[]} args 
 */
async function setVoice(args) {
    if (args.length == 0) {
        return 'Missing input';
    }

    const req = {
        command: 'set_google_preset',
        params: {
            preset: args[0]
        }
    };
    const res = await router.make_call(req);
    if (res.code === 1) {
        logger.logBackendError(res.error);
        return res.error.msg;
    }

    return res.result;
}

/**
 * Joins a voice channel and plays the requested text
 * 
 * @param {string[]} args parsed message text
 * @param {discord.Message} msg raw incoming message
 */
async function tell(args, msg) {
    if (args.length < 2) {
        return 'Missing input';
    }
    if (msg.mentions.members.size != 1) {
        return 'Wrong number of mentions';
    }

    const channel = msg.mentions.members.first().voice.channel;
    if (channel) {
        // Send request for voice clip to backend
        const req = {
            command: 'say_test',
            params: {
                text: args.slice(1).join(' ')
            }
        };
        const response = await router.make_call(req);
        if (response.code === 1) {
            logger.logBackendError(response.error);
            return 'Error generating sound';
        }

        // Create audio/voice objects and play
        const subKey = `${channel.id}:${msg.guildId}`;
        if (!subscriptions[subKey]) {
            const player = discordVoice.createAudioPlayer();
            const connection = discordVoice.joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
            });
            const resource = discordVoice.createAudioResource(nconf.get('texttospeech_dir'));
            player.play(resource);
            connection.subscribe(player);

            // Wait for clip to end and cleanup
            await new Promise(res => {
                player.on(discordVoice.AudioPlayerStatus.Idle, () => res());
            });
            player.stop();
            connection.disconnect();
            return;
        } else {
            subscriptions[subKey].enqueue({
                createAudioResource: async () => {
                    return discordVoice.createAudioResource(nconf.get('texttospeech_dir'));
                },
                title: `Message for ${msg.mentions.members.first().displayName}`
            });
            subscriptions[subKey].audioPlayer.stop(true);
            return;
        }
    }

    return 'Person is not in a voice channel';
}

/**
 * Simulates a set of dice rolls for DND,
 *  Args are in the format ['<numRolls><diceType>', ...]
 *  e.g: ['1d4', '4d8', '2d20']
 *  Format checking is done backend-side
 * 
 * @param {string[]} args 
 */
async function dice(args) {
    if (args.length === 0) return 'No arguments';

    const req = {
        command: 'dnd_dice_roll',
        params: {
            rolls: args
        }
    };
    const response = await router.make_call(req);
    if (response.code === 0) {
        if (response.result instanceof Object) {
            let message = '';
            for (const [dice, res] of Object.entries(response.result)) {
                message += `${dice}: [${res}]\n`;
            }
            return message;
        }
    } else if (response.code === 1) {
        logger.logBackendError(response.error);
        return response.error.msg;
    }
    throw new Error('Unknown failure');
}

module.exports = {
    setupRouter: setupRouter,
    sayTest: sayTest,
    testAsync: testAsync,
    setVoice: setVoice,
    dice: dice,
    tell: tell,
};
