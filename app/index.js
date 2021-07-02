'use strict';
const discord = require('discord.js');

const config = require('./config/config');
const civ = require('./civ');
const meme = require('./meme');

const COMMANDS = {
    'civ': civ.handleCiv,
    'say': meme.handleSay,
    'bluechan': meme.handleChan,
};

async function botRun() {
    await config.loadConfig();
    const client = new discord.Client();

    client.on('message', (msg) => {
        if (msg.content.startsWith('%')) {
            const args = msg.content.substring(1).trim().split(' ');
            const command = args.shift();

            if (command in COMMANDS) {
                try {
                    const response = COMMANDS[command](args, msg.member);
                    msg.channel.send(response);
                } catch (err) {
                    console.log(err);
                    msg.channel.send('A fatal internal error occurred');
                }
            } else {
                const size = config.phrases.wrongcommand.length;
                const idx = Math.floor(size*Math.random());
                msg.channel.send(config.phrases.wrongcommand[idx]);
            }
        }
    });
    
    client.login(config.token);
    console.log('bluebot is ready to rumble');
}

botRun();
