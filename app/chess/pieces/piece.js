'use strict';
const { str_to_index } = require('../util/mappings');
const {
    getBoard,
    setBoard,
    undoSetBoard,
    getPieces,
    doPawnConversions,
    setNotification
} = require('../util/board');

/**
 * Generic piece class containing the base functionality required for every piece
 */
class GenericPiece {
    constructor(x, y, colour) {
        this._x = x;
        this._y = y;
        this._letter = 
        this.colour = colour;
        this.enemyColour = colour === 'White' ? 'Black' : 'White';
        this.firstMove = true;
        this.alive = true;
    }

    /**
     * Performs a piece move given input coordinates:
     *  - checks if a move is valid
     *  - updates internal coordinates
     *  - updates position on the board (board.js handles piece taking)
     * 
     * @param {string} coords 
     */
    setCoords(coords) {
        const [letter, number] = coords.split('');
        // Map the letter/num coordinate to array indices
        let x = str_to_index.X_MAP(letter);
        let y = str_to_index.Y_MAP(number);
        if (this.moveAllowed(x, y)) {
            // Swap input/output coords so starting coord isn't lost when updating piece's coords
            [this._x, x] = [x, this._x];
            [this._y, y] = [y, this._y];
            setBoard ({
                x: {to: this._x, from: x},
                y: {to: this._y, from: y}
            });
        } else {
            throw new Error('Piece can\'t move there');
        }
    }

    /**
     * Checks if a move is valid, overloaded by specific piece classes
     */
    moveAllowed(x, y) {
        return true;
    }

    /**
     * Checks if piece in a space is the same colour as this one
     */
    sameColour(x, y) {
        const space = getBoard({x, y});
        if (space.colour === this.colour) {
            return true;
        }
        return false;
    }

}

module.exports = {
    GenericPiece: GenericPiece,
};
