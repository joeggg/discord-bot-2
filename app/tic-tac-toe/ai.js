'use strict';
const display = require('./display');

async function newTurn() {
    const board = display.getBoard();
    const char = display.pieces[1];
    console.log(`[${char}]: AI thinking...`);
    await new Promise(res => setTimeout(res, 1000));

    let row, col;
    do {
        row = Math.floor(3*Math.random());
        col = Math.floor(3*Math.random());
    } while (board[row][col] !== 0);
    
    display.setBoard(row, col, char);
    console.clear();
    display.drawGrid();
    display.checkWon();
    display.checkBoardFull();
}

module.exports = {
    newTurn: newTurn
};
