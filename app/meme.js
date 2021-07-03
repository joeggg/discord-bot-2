'use strict';
const config = require('./config/config');

async function handleSay() {
    return config.getPhrase('say');
}

async function handleChan(_, member) {
    if (member.user.username === 'ninjoetsu' || member.user.username === 'calamitygreen') {
        return config.phrases.chan[0].replace('%', member.displayName);
    } else {
        return config.phrases.chan[1].replace('%', member.displayName);
    }
}

module.exports = {
    handleSay: handleSay,
    handleChan: handleChan,
};
