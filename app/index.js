'use strict';
const discord = require('discord.js');

const config = require('./config/config');
const logger = require('./util/logger');
const civ = require('./civ');
const meme = require('./meme');
const music = require('./music');
const tictactoe = require('./tic-tac-toe/index');
const chess = require('./chess/index');
const backend = require('./backend');

const BOTNAME = 'bluebot';

const COMMANDS = {
    'civ': civ.handleCiv,
    'say': meme.handleSay,
    'amen': meme.handleAmen,
    'bluechan': meme.handleChan,
    'tictactoe': tictactoe.handle,
    'chess': chess.handleChess,
    's': backend.sayTest,
    'd': backend.dice,
    'tell': backend.tell,
    'voice': backend.setVoice,
    'yt': music.handleYt,
    'ta': backend.testAsync,
};

/**
 * Main launch function, sets the high-level behaviour for handling commands and 
 *  logs the bot in.
 */
async function botRun() {
    await config.loadConfig();
    backend.setupRouter();
    const client = new discord.Client({
        intents: [
            discord.Intents.FLAGS.GUILDS,
            discord.Intents.FLAGS.GUILD_MESSAGES,
            discord.Intents.FLAGS.GUILD_VOICE_STATES,
        ]
    });

    client.on('messageCreate', async (msg) => {
        // Standard command
        if (msg.content.startsWith('%')) {
            const args = msg.content.substring(1).trim().split(' ');
            const command = args.shift();

            if (command in COMMANDS) {
                logger.logInfo(`Received command: ${command} with args: ${args}`);
                COMMANDS[command](args, msg)
                    .then(response => {
                        if (response) {
                            msg.channel.send(response);
                            logger.logInfo('Response sent');
                        }
                    })
                    .catch(err => {
                        logger.logError(err);
                        msg.channel.send('A fatal internal error occurred');
                    });
            } else {
                msg.channel.send(config.getPhrase('wrongcommand'));
            }

            // Handle in progress game
        } else if (config.playing) {
            if (msg.member.user.username !== BOTNAME) {
                const args = msg.content.trim().split(' ');
                logger.logInfo(`Turn for ${config.playing} being processed`);
                COMMANDS[config.playing](args)
                    .then(response => {
                        msg.channel.send(response);
                        logger.logInfo('Response sent');
                    })
                    .catch(err => {
                        logger.logError(err);
                        msg.channel.send('A fatal internal error occurred');
                        config.playing = false;
                    });
            }
        }

    });

    client.login(config.token);
    logger.logInfo('bluebot is ready to rumble');
}

botRun();
