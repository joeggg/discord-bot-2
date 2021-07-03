'use strict';
const ai = require('./ai');
const display = require('./display');
const players = require('./playermoves');

async function onePlayerRound() {
    await players.newTurn(1);
    await ai.newTurn();
}

async function twoPlayerRound() {
    await players.newTurn(1);
    await players.newTurn(2);
}

async function run(mode) {
    let playing = true;
    let turn = null;
    if (mode === 1) {
        turn = onePlayerRound;
    } else if (mode === 2) {
        turn = twoPlayerRound;
    }
    console.clear();
    display.drawGrid();
    while (playing) {
        try {
            await turn();
        }
        catch (err) {
            console.log(err.message);
            playing = false;
        }
    }
};

async function launch() {
    console.clear();
    display.setupBoard();
    const mode = await players.selectPlayers();
    run(mode)
        .then(() => console.log('Game complete! Exiting'))
        .catch(err => console.log(`An error occurred: ${err.stack}`));
}

launch();
