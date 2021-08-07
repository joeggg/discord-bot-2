'use strict';
const { GenericPiece } = require('./piece');
const { getBoard } = require('../util/board');
const { Empty } = require('./empty');

class Queen extends GenericPiece {
    constructor(x, y, colour) {
        super(x, y, colour);
        this.symbol = this.colour === 'Black' ? '\u2655' : '\u265B';
        this.name = 'queen';
    }

    moveAllowed(x, y) {
        if (this.sameColour(x, y)) {
            return false;
        }
        // Queen can move like either rook or bishop
        if (Math.abs(x-this._x) === Math.abs(y-this._y)) {
            if (this.diagonalPathClear(x, y)) {
                return true;
            }
        }
        if (x !== this._x) {
            if (y === this._y) {
                if (this.straightPathClear(x, y, true)) {
                    return true;
                }
            }
        } else {
            if (y !== this._y) {
                if (this.straightPathClear(x, y, false)) {
                    return true;
                }
            }
        }
        return false;
    }

    diagonalPathClear(x, y) {
        const kx = x > this._x ? 1 : -1;
        const ky = y > this._y ? 1 : -1;
        // Check spaces for pieces blocking
        for (let ptr = 1; ptr < Math.abs(x-this._x); ptr++) {
            if (!(getBoard({x: this._x+kx*ptr, y: this._y+ky*ptr}) instanceof Empty)) {
                return false;
            }
        }
        return true;
    }

    straightPathClear(x, y, hortizontal) {
        // Handle different directions of travel
        if (hortizontal) {
            const k = x > this._x ? 1 : -1;
            for (let ptr = k*this._x + 1; ptr < k*x; ptr+=1) {
                if (!(getBoard({x: Math.abs(ptr), y}) instanceof Empty)) {
                    return false;
                }
            }
        } else {
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
    Queen: Queen
};
