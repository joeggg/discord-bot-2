'use strict';
const display = require('./display');
const player = require('./player');
const { gameOver } = require('./util/chessConfig');
const config = require('../config/config');

const PLAYERS = {true: 'White', false: 'Black'};
let playerOne = true;

/**
 * Sets up the initial board
 */
function setupGame() {
    display.setupBoard();
    return display.drawBoard()[1];
}

/**
 * Handles a chess command, either a call to start a game or a move.
 *  Input args for a move are a starting point coord
 *   and a destination coord
 * 
 * @param {string[]} args letter/number coordinates
 * @returns Discord channel message response
 */
async function handleChess(args) {
    if (config.playing) {
        // Stopping a game
        if (args[0] === 'stop') {
            config.playing = false;
            return 'Game cancelled';
        }
        // Making a move
        const result = player.turn(PLAYERS[playerOne], args);
        if (!(result instanceof Array)) {
            // Result is an error message
            return result;
        }
        const [notification, board] = result;

        if (gameOver()) {
            config.playing = false;
            return {content: notification, files: [board]};
        }
        playerOne = !playerOne;
        const msg = `\n${PLAYERS[playerOne]}'s turn:`;

        return {content: notification+msg, files: [board]};

    } else {
        // Start a new game
        playerOne = true;
        config.playing = 'chess';
        const msg = `${PLAYERS[playerOne]}'s turn:`;
        return {content: msg, files: [setupGame()]};
    }
}

module.exports = {
    handleChess: handleChess
};
