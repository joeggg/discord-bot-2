'use strict';
let gameOver = false;

function isGameOver() {
    return gameOver;
}

function setGameOver() {
    gameOver = true;
}

module.exports = {
    gameOver: isGameOver,
    setGameOver: setGameOver,
};
