'use strict';
const players = require('./playermoves');
const config = require('../config/config');
const { SpaceFullError } = require('./util/exceptions');

let turn = null;
let playerOne = true;

async function handle(args) {
    if (config.playing) {
        if (args[0] === 'stop') {
            config.playing = false;
            return 'Game cancelled';
        }
        return turn(args[0]);
    } else {
        // Select game mode
        switch (args[0]) {
            case '1':
                turn = onePlayerRound;
                return 'Unimplemented!';
            case '2':
                turn = twoPlayerRound;
                break;
            default:
                return 'Invalid number of players';
        }
        // Set playing states
        config.playing = 'tictactoe';
        playerOne = true;
        return players.setupGame();
    }   
}

// Unimplemented
function onePlayerRound() {}

function twoPlayerRound(args) {
    try {
        const response = players.newTurn(playerOne, args);
        playerOne = !playerOne;
        return response;
    } catch (err) {
        if (err instanceof SpaceFullError) {
            return 'Space is full!';
        }
        // Someone won
        config.playing = false;
        return players.endGame(err.message);
    }
}

module.exports = {
    handle: handle,
};