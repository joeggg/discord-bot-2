'use strict';
class SpaceFullError extends Error {
    constructor(...params) {
        super(...params);
    }
}

class GameOverError extends Error {
    constructor(...params) {
        super(...params);
    }
}

module.exports = {
    SpaceFullError: SpaceFullError,
    GameOverError: GameOverError
};
