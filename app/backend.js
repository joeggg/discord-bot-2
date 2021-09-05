'use strict';
const discord = require('discord.js');
const nconf = require('nconf');
const zmq = require('zeromq');

const logger = require('./util/logger');

const NS_IN_S = 1000000000;
const say_config_commands = {'voice': null, 'pitch': null, 'rate': null};

/**
 * Basic ZMQ REQ interface with async wrapper to make API calls easily
 */
class ZMQRouter {
    constructor() {
        this.sck = zmq.socket('req');
        const address = nconf.get('backend_endpoint');
        this.sck.connect(address);
        logger.logInfo(`Backend socket connected at ${address}`);
        this.response = null;
        this.maxWait = 30*NS_IN_S;
        this.sck.on('message', (res)=> {
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
        logger.logInfo(`Python call time taken: ${Number(end-start)/1000000}ms`);

        return parsed;
    }

    async get_response() {
        const start = process.hrtime.bigint();
        let end = process.hrtime.bigint();

        while (!this.response && end-start < this.maxWait) {
            await new Promise(res => setTimeout(res, 10));
            end = process.hrtime.bigint();
        }
        const return_val = this.response;
        this.response = null;
        return return_val;
    }

}

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
async function say_test(args) {
    if (!router) setupRouter();

    if (args.length === 0) return 'No text received';

    const req = {command: null, params: {}};
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
            return {content: '', files: [file]};
        }
    } 
    if (response.result) {
        return response.result;
    }
    throw new Error('Backend failure');
}

/**
 * Simulates a set of dice rolls for DND,
 *  Args are in the format ['<numRolls><diceType>', ...]
 *  e.g: ['1d4', '4d8', '2d20']
 *  Format checking is done backend-side
 * 
 * @param {string[]} args 
 */
async function dice(args){
    if (!router) setupRouter();

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
    }
    if (response.result) {
        return response.result;
    }
    throw new Error('Backend failure');
}

let router = null;

module.exports = {
    router,
    say_test: say_test,
    dice: dice,
};
