'use strict';
const { Empty } = require('../pieces/empty');
const { str_to_index } = require('./mappings');

let board = [];
let notification = '';
let pieces = {
    White: [],
    Black: []
};
// For undoing a move if check
let mem = {coords: {}, pieces: {}};
let currentChecking = null;

/**
 * Returns the piece object at an input letter coordinate
 * @param {string} coord 
 */
function getBoard(coord) {
    if (typeof coord === 'string') {
        const [letter, num] = coord.split('');
        return board[str_to_index.Y_MAP(num)][str_to_index.X_MAP(letter)];
    } else {
        return board[coord.y][coord.x];
    } 
}

/**
 * Moves a piece from a starting coord (x.from, y.from) to a new one (x.to, y.to)
 *  Updates the notification if a piece was taken
 * 
 * @param {Object} coord 
 */
function setBoard({x, y}) {
    mem.coords = {x, y};
    mem.pieces.from = board[y.from][x.from];
    const space = board[y.to][x.to];
    mem.pieces.to = space;
    board[y.to][x.to] = board[y.from][x.from];

    if (space instanceof Empty) {
        board[y.from][x.from] = space;
    } else {
        setNotification(`${space.colour}'s ${space.name} was taken`);
        space.alive = false;
        board[y.from][x.from] = new Empty();
    }
}

/**
 * Places a pice into the board object
 */
function setPiece(piece) {
    board[piece._y][piece._x] = piece;
}

function undoSetBoard() {
    const x = mem.coords.x;
    const y = mem.coords.y;
    board[y.from][x.from] = mem.pieces.from;
    board[y.to][x.to] = mem.pieces.to;
    board[y.from][x.from]._x = x.from;
    board[y.from][x.from]._y = y.from;
    board[y.to][x.to]._x = x.to;
    board[y.to][x.to]._y = y.to;
    board[y.to][x.to].alive = true;
}

/**
 * Applies a castling move to the board, assumes path has been checked
 */
function setCastle(rook_x, y) {
    const k = (rook_x === 0) ? 1 : -1;
    const king_x = 4;
    // Swap the empty spaces with the rook and king
    [board[y][rook_x+k], board[y][king_x]] = [board[y][king_x], board[y][rook_x+k]];
    [board[y][rook_x+2*k], board[y][rook_x]] = [board[y][rook_x], board[y][rook_x+2*k]];
}

/**
 * Returns an array of all the piece objects of an input colour
 * 
 * @param {string} colour 
 */
function getPieces(colour) {
    return pieces[colour];
}

/**
 * Sets up the piece arrays for check
 */
function setupPieces() {
    pieces.White = [...board[7], ...board[6]];
    pieces.Black = [...board[0], ...board[1]];
}

function getChecking() {
    return currentChecking;
}

function setChecking(piece) {
    currentChecking = piece;
}

/**
 * Print current stored notification to console if there is one
 */
function showNotification () {
    if (notification) {
        console.log(notification);
    }
}

/**
 * Setter for the notification, exposed as an export
 */
function setNotification(msg) {
    notification = msg;
}

module.exports = {
    board: board,
    showNotification: showNotification,
    setNotification: setNotification,
    getBoard: getBoard,
    setBoard: setBoard,
    setPiece: setPiece,
    undoSetBoard: undoSetBoard,
    setCastle: setCastle,
    getPieces: getPieces,
    setupPieces: setupPieces,
    getChecking: getChecking,
    setChecking: setChecking,
};
