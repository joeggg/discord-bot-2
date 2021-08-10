'use strict';
/**
 * Functions handling the general flow of a turn
 */
const chessConfig = require('./util/chessConfig');
const display = require('./display');
const { Queen } = require('./pieces/queen');
const { Pawn } = require('./pieces/pawn');
const { Rook } = require('./pieces/rook');
const {
    getBoard,
    getPieces,
    setChecking,
    setPiece,
    setNotification,
    undoSetBoard
} = require('./util/board');

/**
 * Runs a single turn of an input player:
 *  - asks the player for a move
 *  - moves the piece to the requested space
 *  - updates the board array with the move and prints it
 * 
 * Errors such as an invalid coordinate are handled by printing the error message and
 *  restarting the turn
 * 
 * @param {string} player 
 */
function turn(player, args) {
    let piece = null;
    try {
        const move = checkMove(args);
        piece = getBoard(move[0]);
        if (piece.colour === player) {
            // Handle castling
            if (move[1] === 'castle') {
                if (piece instanceof Rook) {
                    piece.castle();
                } else {
                    return 'Piece not a rook';
                }
            } 
            // Handle regular move
            else {
                // Check the piece can move there and set its position
                piece.setCoords(move[1]);
            }
            // Make sure that move didnt put king in check
            if (getPieces(player)[4].check()) {
                undoSetBoard();
                setNotification('');
                return 'That would be check!';
            }
            doPawnConversions(player);
            piece.firstMove = false;
        } else {
            return 'Not one of your pieces';
        }
    } catch (err) {
        return err.message;
        // console.log(err.stack); // uncomment for info for debugging
    }
    handleChecks(player, piece);
    return display.drawBoard();
}

/**
 * Asynchronous wrapper to readline interface question function: takes an input letter/num
 *  coordinate and checks if it is syntactically valid.
 * 
 * @param {string} player 
 * @returns {string}
 */
function checkMove(args) {
    try {
        const [from, to] = args;
        if (from.length === 2 && (to.length === 2 || to === 'castle')) {
            return [from, to];
        } else {
            throw new Error('Invalid move');
        }
    } catch {
        throw new Error('Invalid move');
    }
}

/**
 * Checks for the changing of a check status this move
 */
function handleChecks(player, piece) {
    // Handle new check on enemy
    const enemyColour = piece.enemyColour;
    if (getPieces(enemyColour)[4].check()) {    // 4 = king
        setChecking(piece);
        if (getPieces(enemyColour)[4].checkmate()) {
            setNotification(`Checkmate ${enemyColour}!\n${player} wins!`);
            chessConfig.setGameOver();
        } else {
            setNotification(`${enemyColour} in check!`);
        }
    }
}


/**
 * Convert any pawns at the end of the board into queens
 */
function doPawnConversions(colour) {
    // This is a bit jank should change later possibly
    const pieces = getPieces(colour);
    for (let i = 0; i < pieces.length; i++) {
        if (pieces[i] instanceof Pawn) {
            const end = colour === 'White' ? 0 : 7;
            if (pieces[i]._y === end) {
                const queen = new Queen(pieces[i]._x, pieces[i]._y, colour);
                setPiece(queen); // set in board array
                pieces[i] = queen; // set in piece array
            }
        }
    }
}

module.exports = {
    turn: turn
};
