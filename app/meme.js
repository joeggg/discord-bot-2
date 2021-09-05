'use strict';
const config = require('./config/config');

async function handleSay() {
    return config.getPhrase('say');
}

async function handleAmen() {
    return config.getPhrase('amen');
}

async function handleChan(_, msg) {
    if (msg.member.user.username === 'ninjoetsu' || msg.member.user.username === 'calamitygreen') {
        return config.phrases.chan[0].replace('%', msg.member.displayName);
    } else {
        return config.phrases.chan[1].replace('%', msg.member.displayName);
    }
}

module.exports = {
    handleSay: handleSay,
    handleChan: handleChan,
    handleAmen: handleAmen,
};
