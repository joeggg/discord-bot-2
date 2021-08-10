'use strict';
const fs = require('fs');
const nconf = require('nconf');

const csv = require('csv-parser');

// Config objects
let playing = null;
const phrases = {};
const players = [];
const civs = [];
const token = fs.readFileSync('token/toe.txt').toString();

/**
 *  Load civ list from csv  
 */
async function loadLists(path) {
    return await new Promise(resolve => {
        fs.createReadStream(path)
        .pipe(csv())
        .on('data', (data) => civs.push(data))
        .on('end', () => resolve(civs));
    });
}

/**
 *  Load all config files
 */
async function loadConfig() {
    nconf.file('app/config/config.json');
    await loadLists('data/civ_list.csv');
    loadPhrases();
}

/**
 *  Load chat message phrases
 */
function loadPhrases() {
    const rawSay = fs.readFileSync('data/phrases/say.json').toString();
    phrases.say = JSON.parse(rawSay).data;
    const rawAmen = fs.readFileSync('data/phrases/amen.json').toString();
    phrases.amen = JSON.parse(rawAmen).data;
    phrases.chan = fs.readFileSync('data/phrases/chan.txt').toString().split('\r\n');
    phrases.wrongcommand = fs.readFileSync('data/phrases/wrongcommand.txt').toString().split('\r\n');
}

/**
 *  Return a random phrase of input type
 * @param {string} key
 */
function getPhrase(key) {
    const idx = Math.floor(phrases[key].length*Math.random());
    return phrases[key][idx];
}

module.exports = {
    playing: playing,
    civs: civs,
    token: token,
    players: players,
    phrases: phrases,
    loadConfig: loadConfig,
    getPhrase: getPhrase,
};
