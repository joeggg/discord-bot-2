'use strict';
const display = require('./display');
const { SpaceFullError } = require('./util/exceptions');

function setupGame() {
    display.setupBoard();
    let response = '```' + display.drawGrid() + '```';
    return response + `[${display.pieces[0]}]: Enter a space to move from 1 to 9: `;
}

function endGame(msg) {
    return '```' + display.drawGrid() + '```' + msg;
}

function placePiece(space, char) {
    const board = display.getBoard();
    // Map 1-9 to co-ords (0,0)-(2,2)
    const row = Math.floor((parseInt(space)-1)/3);
    const col = (parseInt(space)-1) - 3*row;
    if (board[row][col] !== 0) {
        throw new SpaceFullError();
    }
    display.setBoard(row, col, char);
}

function newTurn(playerOne, space) {
    let char, otherChar;
    if (playerOne) {
        [ char, otherChar ] = display.pieces;
    } else {
        [ otherChar, char ] = display.pieces;
    }
    placePiece(space, char);
    display.checkWon();
    display.checkBoardFull();
    let response = '```' + display.drawGrid() + '```';
    return response + `[${otherChar}]: Enter a space to move from 1 to 9: `;
}

module.exports = {
    setupGame: setupGame,
    newTurn: newTurn,
    endGame: endGame,
};
