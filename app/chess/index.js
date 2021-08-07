'use strict';
const display = require('./display');
const player = require('./player');
const { gameOver } = require('./util/config');

// Program entry point, sets up the initial board and starts the game
function launch() {
    display.setupBoard();
    display.drawBoard();
    run();
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

launch();
