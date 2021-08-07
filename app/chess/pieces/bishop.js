'use strict';
const { getBoard } = require('../util/board');
const { Empty } = require('./empty');
const { GenericPiece } = require('./piece');

class Bishop extends GenericPiece {
    constructor(x, y, colour) {
        super(x, y, colour);
        this.symbol = this.colour === 'Black' ? '\u2657' : '\u265D';
        this.name = 'bishop';
    }

    moveAllowed(x, y) {
        if (this.sameColour(x, y)) {
            return false;
        }
        // Bishop must change x and y by same amount
        if (Math.abs(x-this._x) === Math.abs(y-this._y)) {
           if (this.pathClear(x, y)) {
               return true;
           }
        }
        return false;
    }

    pathClear(x, y) {
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

}

module.exports = {
    Bishop: Bishop
};
