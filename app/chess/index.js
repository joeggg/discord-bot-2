'use strict';
const discord = require('discord.js');

const display = require('./display');
const player = require('./player');
const { gameOver } = require('./util/config');
const config = require('../config/config');

let playerOne = true;

// Program entry point, sets up the initial board and starts the game
function setupGame() {
    display.setupBoard();
    return display.drawBoard();
}

// Main game loop, 2 player only currently
async function run() {
    while (!gameOver()) {
        try {
            await player.turn('White');
            await player.turn('Black');
        } catch(err) {
            console.log(`An unexpected error occurred: ${err.message}`);
            console.log(err.stack);
            break;
        }
    }
}

function twoPlayerRound(args) {

}

async function handleChess(args) {
    if (config.playing) {
        if (args[0] === 'stop') {
            config.playing = false;
            return 'Game cancelled';
        }
        playerOne = !playerOne;
        return args[0];
    } else {
        config.playing = 'chess';
        const disp = '```' + setupGame() + '```';
        const embed = new discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Chess')
            .setDescription(disp);
        return {embed};
    }
}

module.exports = {
    handleChess: handleChess
};
