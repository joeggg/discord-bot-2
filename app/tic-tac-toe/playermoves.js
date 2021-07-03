'use strict';
const timeout = require('util').promisify(setTimeout);
const readline = require('readline');
const input = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
const display = require('./display');
const { SpaceFullError } = require('./util/exceptions');

function placePiece(space, char) {
    const board = display.getBoard();
    // Map 1-9 to co-ords (0,0)-(2,2)
    const row = Math.floor((space-1)/3);
    const col = (space-1) - 3*row;
    if (board[row][col] !== 0) {
        throw new SpaceFullError();
    }
    display.setBoard(row, col, char);
}

async function newTurn(player) {
    const char = display.pieces[player-1];
    let asking = true;
    while (asking) {
        let waiting = true;
        input.question(`[${char}]: Enter a space to move from 1 to 9: `, space => {
            try {
                placePiece(space, char);
                asking = false; 
                waiting = false;
            } catch (err) {
                if (err instanceof SpaceFullError) {
                    console.log('Space is full!');
                    waiting = false;
                } else {
                    throw err;
                }
            }
        });
        while (waiting) await timeout(10);
    }
    console.clear();
    display.drawGrid();
    display.checkWon();
    display.checkBoardFull();
}

async function selectPlayers() {
    let mode = null;
    let asking = true;
    while (asking) {
        let waiting = true;
        input.question('Two player (2) or against AI (1)? ', ans => {
            switch(ans.trim()) {
                case '1':
                    mode = 1;
                    break;
                case '2':
                    mode = 2;
                    break;
                default:
                    console.log('Invalid number of players');
                    waiting = false;
                    return;
            }
            asking = false;
            waiting = false;
        });
        while (waiting) await timeout(10);
    }
    return mode;
}

module.exports = {
    placePiece: placePiece,
    newTurn: newTurn,
    selectPlayers: selectPlayers
};
