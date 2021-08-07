'use strict';
const { Bishop } = require('./pieces/bishop');
const { King } = require('./pieces/king');
const { Knight } = require('./pieces/knight');
const { Pawn } = require('./pieces/pawn');
const { Queen } = require('./pieces/queen');
const { Rook } = require('./pieces/rook');
const { Empty } = require('./pieces/empty');
const { index_to_str } = require('./util/mappings');
const { board, showNotification, setNotification, setupPieces } = require('./util/board');

const SQUARE_WIDTH = 7;
const SQUARE_HEIGHT = 3;
const NUM_SQUARES = 8;
const BOARD_WIDTH = (NUM_SQUARES*SQUARE_WIDTH) + (NUM_SQUARES+1); // width of squares + borders

/**
 * Builds the whole board text row by row, prints it to console, and displays any game
 * update that occurred.
 */
 function drawBoard() {
    let output = '';
    // Iterate over layers
    for (let i = 0; i < NUM_SQUARES; i++) {
        output += createLayer(i);
    }
    // Add final border
    output += '-'.repeat(BOARD_WIDTH) + '\n';
    // Add letters
    // for (const letter of Object.values(NUMMAP)) {
    //     output += `    ${letter}   `;
    // }
    output += '\n';
    console.clear();
    console.log(output);
    showNotification();
    setNotification('');
}

/**
 * Creates a board row in text, uses unicode chess pieces placed in the centre of the square
 * and displays each square's coordinate in its top left corner.
 * 
 * @param {number} y coordinate 
 * @returns {string} 
 */
function createLayer(y) {
    let output = '';
    // Add top border
    output += '-'.repeat(BOARD_WIDTH) + '\n';
    // Draw a line at a time
    for (let i = 0; i < SQUARE_HEIGHT; i++) {
        output += '|';
        // Draw a line of a square at a time
        for (let x = 0; x < NUM_SQUARES; x++) {
            if (i === 0) {
                // Draw square coordinates if on first layer
                output += `${index_to_str.X_MAP(x)}${index_to_str.Y_MAP(y)}${' '.repeat(SQUARE_WIDTH-2)}|`;
            } else if (i === 1) {
                // Draw piece if in centre
                output += `   ${board[y][x].symbol}   |`;
            } else {
                output += ' '.repeat(SQUARE_WIDTH) + '|';
            }
        }
        // Numbers on edge
        // if (i == 1) {
        //     output += `  ${8-y}`;
        // }
        output += '\n';
    }
    return output;
}

/**
 * Fills the board array with instances of all the piece objects in their starting positions.
 */
 function setupBoard() {
    board.push(getFirstRow('Black'));
    board.push(getSecondRow('Black'));
    // Add rows of empty spaces from rows 3-6
    for (let y = 2; y < NUM_SQUARES-2; y++) {
        board.push([]);
        for (let x = 0; x < NUM_SQUARES; x++) {
            board[y].push(new Empty());
        }
    }
    board.push(getSecondRow('White'));
    board.push(getFirstRow('White'));
    setupPieces();
}

// Returns the first layer of pieces for each player, depending on the colour input
function getFirstRow(colour) {
    const y = (colour === 'White') ? 7 : 0;
    return [
        new Rook(0, y, colour),
        new Knight(1, y, colour),
        new Bishop(2, y, colour),
        new Queen(3, y, colour),
        new King(4, y, colour),
        new Bishop(5, y, colour),
        new Knight(6, y, colour),
        new Rook(7, y, colour)
    ];
}

// Returns the second layer of pieces for each player, depending on the colour input
function getSecondRow(colour) {
    const y = (colour === 'White') ? 6 : 1;
    const row = [];
    for (let i = 0; i < NUM_SQUARES; i++) {
        row.push(new Pawn(i, y, colour));
    }
    return row;
}

module.exports = {
    drawBoard: drawBoard,
    setupBoard: setupBoard,
};
