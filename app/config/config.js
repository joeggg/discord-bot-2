'use strict';
const csv = require('csv-parser');
const fs = require('fs');
const nconf = require('nconf');
// Config objects
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
 *  Load chat message templates
 */
function loadPhrases() {
    phrases.say = fs.readFileSync('data/phrases/say.txt').toString().split('\r\n');
    phrases.chan = fs.readFileSync('data/phrases/chan.txt').toString().split('\r\n');
    phrases.wrongcommand = fs.readFileSync('data/phrases/wrongcommand.txt').toString().split('\r\n');
}

/**
 *  Return random phrase from input
 * @param {string} key
 */
function getPhrase(key) {
    const idx = Math.floor(phrases[key].length*Math.random());
    return phrases[key][idx];
}

module.exports = {
    civs: civs,
    token: token,
    players: players,
    phrases: phrases,
    loadConfig: loadConfig,
    getPhrase: getPhrase,
};
