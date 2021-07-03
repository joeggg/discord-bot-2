'use strict';
const discord = require('discord.js');

const config = require('./config/config');
const civ = require('./civ');
const meme = require('./meme');
const tictactoe = require('./tic-tac-toe/index');

const BOTNAME = 'bluebot';

const COMMANDS = {
    'civ': civ.handleCiv,
    'say': meme.handleSay,
    'bluechan': meme.handleChan,
    'tictactoe': tictactoe.handle,
};

/**
 * Main launch function
 */
async function botRun() {
    await config.loadConfig();
    const client = new discord.Client();

    client.on('message', (msg) => {
        if (msg.content.startsWith('%')) {
            const args = msg.content.substring(1).trim().split(' ');
            const command = args.shift();

            if (command in COMMANDS) {
                COMMANDS[command](args, msg.member).then(response => {
                    msg.channel.send(response);
                }).catch(err => {
                    console.log(err);
                    msg.channel.send('A fatal internal error occurred');
                });
            } else {
                msg.channel.send(config.getPhrase('wrongcommand'));
            }

        } else if (config.playing) {
            if (msg.member.user.username !== BOTNAME) {
                const args = msg.content.trim().split(' ');
                COMMANDS[config.playing](args).then(response => {
                    msg.channel.send(response);
                }).catch(err => {
                    console.log(err);
                    msg.channel.send('A fatal internal error occurred');
                });
            }
        }
    });
    
    client.login(config.token);
    console.log('bluebot is ready to rumble');
}

botRun();
