'use strict';
const { GenericPiece } = require('./piece');
const { getBoard, setCastle } = require('../util/board');
const { Empty } = require('./empty');
const { King } = require('./king');

class Rook extends GenericPiece {
    constructor(x, y, colour) {
        super(x, y, colour);
        this.symbol = this.colour === 'Black' ? '\u2656' : '\u265C';
        this.name = 'rook';
    }

    castle() {
        if (this.firstMove) {
            const king = getBoard({x: 4, y: this._y});
            console.log(king);
            if (king instanceof King && king.firstMove) {
                const k = (this._x === 0) ? 1 : -1; 
                for (let ptr = k*this._x+1; ptr < k*king._x; ptr++) {
                    if (!(getBoard({x: Math.abs(ptr), y: this._y}) instanceof Empty)) {
                        throw new Error('Cannot castle');
                    }
                }
                this._x = this._x + 2*k;
                king._x = this._x + k;
                setCastle(this._x, this._y);
                this.firstMove = false;
                return;
            }
        }
        throw new Error('Cannot castle');
    }

    moveAllowed(x, y) {
        if (this.sameColour(x, y)) {
            return false;
        }
        // Rook can only change one coordinate
        if (x !== this._x) {
            if (y === this._y) {
                if (this.pathClear(x, y, true)) {
                    return true;
                }
            }
        } else {
            if (y !== this._y) {
                if (this.pathClear(x, y, false)) {
                    return true;
                }
            }
        }
        return false;
    }

    pathClear(x, y, hortizontal) {
        // Handle different axes of travel
        if (hortizontal) {
            // Determine direction of travel
            const k = x > this._x ? 1 : -1;
            // Check all squares up to just before the destination are empty
            for (let ptr = k*this._x + 1; ptr < k*x; ptr+=1) {
                if (!(getBoard({x: Math.abs(ptr), y}) instanceof Empty)) {
                    return false;
                }
            }
        } else {
            // Same logic as above along the y axis instead
            const k = y > this._y ? 1 : -1;
            for (let ptr = k*this._y + 1; ptr < k*y; ptr+=1) {
                if (!(getBoard({x, y: Math.abs(ptr)}) instanceof Empty)) {
                    return false;
                }
            } 
        }
        return true;
    }
}

module.exports = {
    Rook: Rook
};
