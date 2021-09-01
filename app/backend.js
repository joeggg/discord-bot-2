'use strict';
const discord = require('discord.js');
const nconf = require('nconf');
const zmq = require('zeromq');

const logger = require('./util/logger');

class ZMQRouter {
    constructor() {
        this.sck = zmq.socket('req');
        const address = nconf.get('backend_endpoint');
        this.sck.connect(address);
        logger.logInfo(`Backend socket connected at ${address}`);
        this.response = null;
        this.maxWait = 30*1000000000;
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

async function say_test(text) {
    if (!router) setupRouter();

    const req = {
        command: 'say_test',
        params: {
            text: text.join(' ')
        }
    };
    const response = await router.make_call(req);
    if (response.result === 'success') {
        const file = new discord.MessageAttachment(nconf.get('texttospeech_dir'));
        return {content: '', files: [file]};

    }
    throw new Error('Backend failure');
}

async function dice(args){
    if (!router) setupRouter();

    const req = {
        command: 'dnd_dice_roll',
        params: {
            rolls: args
        }
    };
    const response = await router.make_call(req);
    if (response.result instanceof Object) {
        let message = '';
        for (const [dice, res] of Object.entries(response.result)) {
            message += `${dice}: [${res}]\n`;
        }
        return message;
    } else if (response.result === 'failure') {
        throw new Error('Backend failure');
    }
    throw new Error('Could not parse results');
}

let router = null;

module.exports = {
    router,
    say_test: say_test,
    dice: dice,
};
