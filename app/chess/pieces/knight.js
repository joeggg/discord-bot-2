'use strict';
const { GenericPiece } = require('./piece');

class Knight extends GenericPiece {
    constructor(x, y, colour) {
        super(x, y, colour);
        this.symbol = this.colour === 'Black' ? '\u2658' : '\u265E';
        this.name = 'knight';
    }

    moveAllowed(x, y) {
        if (this.sameColour(x, y)) {
            return false;
        }
        // Knight must move both +2 and +1
        if (x === this._x+2 || x === this._x-2) {
            if (y === this._y+1 || y === this._y-1) {
                return true;
            }
        } else if (y === this._y+2 || y === this._y-2) {
            if (x === this._x+1 || x === this._x-1) {
                return true;
            }
        }
        return false;
    }

}

module.exports = {
    Knight: Knight
};
