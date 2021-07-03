'use strict';
const nconf = require('nconf');
const config = require('./config/config');

/**
 * Parse command and return appropriate function
 */
async function handleCiv(args) {
    if (args.length === 0) {
        return generateCivs(config.players);
    } else {
        if (args[0] === 'tiers') {
            return setTiers(args[1]);
        } else {
            return generateCivs(args);
        }
    }
}

function setTiers(args) {
    const tiers = args.split('-');
    const tier0 = parseInt(tiers[0]);
    const tier1 = parseInt(tiers[1]);
    if (tier0 < 1 || tier0 > 8 || tier1 < 1 || tier1 > 8) {
        return 'Tiers out of bounds';
    }
    // Max is the lower number
    if (tier0 < tier1) {
        nconf.set('TIER_MAX', tier0);
        nconf.set('TIER_MIN', tier1);
    } else {
        nconf.set('TIER_MAX', tier1);
        nconf.set('TIER_MIN', tier0);
    }
    return 'Tiers set';
}

function generateCivs(players) {
    // New variable so civs not modified
    let civList = Array.from(config.civs);
    const max = nconf.get('TIER_MAX');
    const min = nconf.get('TIER_MIN');
    const excludelist = nconf.get('EXCLUDELIST');
    const output = [];
    // Generate random civ within max/min tiers and remove result from array
    for (const player of players) {
        let select, tier;
        do {
            select = Math.floor(civList.length*Math.random());
            tier = parseInt(civList[select].Tier);
        } while (tier < max || tier > min || excludelist.includes(civList[select].Name));

        output.push(
            `${player}: ${civList[select].Name}, Tier ${civList[select].Tier}`
        );
        civList.splice(select, 1);
    }
    console.log('CIV', `Generated civs: \n${JSON.stringify(output, null, 2)}`);
    config.players = players;
    return output;
}

module.exports = {
    handleCiv: handleCiv,
};
