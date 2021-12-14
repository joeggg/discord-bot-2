'use strict';
const fs = require('fs');

const nconf = require('nconf');


function getShortDate() {
    const now = new Date();
    return (
        now.getFullYear() + '-' +
        (now.getMonth() + 1) + '-' +
        now.getDate() + ' ' +
        now.toTimeString().substring(0, 8)
    );
}

function logInfo(msg, process = 'MAIN') {
    fs.appendFileSync(nconf.get('log_file_dir'), `[${getShortDate()}]-[${process}]: ${msg}\n`);
}

function logError(err, process = 'MAIN') {
    fs.appendFileSync(nconf.get('log_file_dir'), `[${getShortDate()}]-[${process}]: ${err}\n`);
    fs.appendFileSync(nconf.get('log_file_dir'), err.stack);
}

function logBackendError(err, process = 'MAIN') {
    if (err.trace) {
        logInfo(`Backend error: ${err.msg}\n${err.trace}`, process);
    } else {
        logInfo(`Backend error: ${err.msg}`, process);
    }
}

module.exports = {
    logInfo: logInfo,
    logError: logError,
    logBackendError: logBackendError,
};
