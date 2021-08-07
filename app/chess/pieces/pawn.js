'use strict';
const { getBoard } = require('../util/board');
const { Empty } = require('./empty');
const { GenericPiece } = require('./piece');

class Pawn extends GenericPiece {
    constructor(x, y, colour) {
        super(x, y, colour);
        this.symbol = this.colour === 'Black' ? '\u2659' : '\u265F';
        this.name = 'pawn';
    }

    moveAllowed(x, y) {
        if (this.sameColour(x, y)) {
            return false;
        }
        // Check if piece is being taken
        if (this.takingPiece(x, y)) {
            return true;
        }
        // Pawn can only move to one square forward (or 2 on first move)
        const range = this.firstMove ? 2 : 1;
        if (this.colour === 'White') {
            if (this._y-y <= range && this._y-y > 0 && x === this._x) {
                if (this.pathClear(x, y)) {
                    return true;
                }
            }
        } else {
            if (y-this._y <= range && y-this._y > 0 && x === this._x) {
                if (this.pathClear(x, y)) {
                    return true;
                }
            }
        }
        return false;
    }

    takingPiece(x, y) {
        const k = this.colour === 'White' ? -1 : 1;
        if (y === this._y+k && (x === this._x+1 || x === this._x-1)) {
            if (!(getBoard({x, y}) instanceof Empty)) {
                return true;
            }
        }
        return false;
    }

    pathClear(x, y) {
        const k = this.colour === 'White' ? -1 : 1;
        // Check spaces empty
        for (let ptr = k*this._y + 1; ptr < k*y + 1; ptr++) {
            if (!(getBoard({x, y: Math.abs(ptr)}) instanceof Empty)) {
                return false;
            }
        }
        return true;
    }

}

module.exports = {
    Pawn: Pawn
};
