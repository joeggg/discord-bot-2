'use strict';
const {cross, naught} = require('./graphics/pieces');
const { GameOverError } = require('./util/exceptions');

const PIECES = ['x', 'o'];
const SQUARE_W = 9;
const SQUARE_H = 5;
const BOARD_W = 35;
let board = null;

/*
 *  Draw a horizontal grid line
 */
function drawSlice(char) {
    return `${char.repeat(SQUARE_W)}|${char.repeat(SQUARE_W)}|${char.repeat(SQUARE_W)}\n`;
}

/*
 *  Draw a set of 3 piece squares one layer at a time
 */
function drawPieces(rowNum) {
    let output = '';
    for (let h = 0; h < SQUARE_H; h++) {
        for (let colNum = 0; colNum < 3; colNum++) {
            // Draw slice of a column
            let section;
            switch(board[rowNum][colNum]) {
                case 'x':
                    section = cross.substring(h*(SQUARE_W+1)+1, (h+1)*(SQUARE_W+1));
                    break;
                case 'o':
                    section = naught.substring(h*(SQUARE_W+1)+1, (h+1)*(SQUARE_W+1));
                    break;
                default:
                    if (h == 2) {
                        // Draw num if in centre
                        const num = (rowNum)*3 + colNum+1;
                        section = ' '.repeat(SQUARE_W/2) + num + ' '.repeat(SQUARE_W/2);
                    }
                    else {
                        // Draw blank line 
                        section = ' '.repeat(SQUARE_W);
                    }
                    break;
            }
            output += section;
            if (colNum < 2) {
                output += '|';
            }
        }
        output += '\n';
    }
    return output;
}

function drawGrid() {
    let grid = drawPieces(0);
    grid += drawSlice('-');
    grid += drawPieces(1);
    grid += drawSlice('-');
    grid += drawPieces(2);
    return grid;
}

function setupBoard() {
    board = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
}

function checkBoardFull() {
    for (const row of board) {
        for (const entry of row) {
            if (entry === 0) return;
        }
    }
    throw new GameOverError('Board full!');
}

function checkLine(char, a, b, c) {
    if (board[a[0]][a[1]] == char && board[b[0]][b[1]] == char && board[c[0]][c[1]] == char) {
        throw new GameOverError(`${char} won!`);
    }
}

function checkWon() {
    for (const char of PIECES) {
        checkLine(char, [0, 0], [0, 1], [0, 2]);
        checkLine(char, [1, 0], [1, 1], [1, 2]);
        checkLine(char, [2, 0], [2, 1], [2, 2]);
        checkLine(char, [0, 0], [1, 0], [2, 0]);
        checkLine(char, [0, 1], [1, 1], [2, 1]);
        checkLine(char, [0, 2], [1, 2], [2, 2]);
        checkLine(char, [0, 0], [1, 1], [2, 2]);
        checkLine(char, [2, 0], [1, 1], [0, 2]);
    }
}

function getBoard() {
    return board;
}

function setBoard(row, col, char) {
    board[row][col] = char;
}

module.exports = {
    drawGrid: drawGrid,
    setupBoard: setupBoard,
    getBoard: getBoard,
    setBoard: setBoard,
    checkBoardFull: checkBoardFull,
    checkWon: checkWon,
    pieces: PIECES,
};
