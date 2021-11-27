'use strict';
function getShortDate() {
    const now = new Date();
    return (
        now.getFullYear() + '-' +
        (now.getMonth()+1) + '-' +
        now.getDate() + ' ' +
        now.toTimeString().substring(0, 8)
    );
}

function logInfo(msg, process='MAIN') {
    console.log(`[${getShortDate()}]-[${process}]: ${msg}`);
}

function logError(err, process='MAIN') {
    console.log(`[${getShortDate()}]-[${process}]: ${err}`);
    console.log(err.stack);
}

function logBackendError(err, process='MAIN') {
    if (err.trace) {
        logInfo(`Backend error: ${err.msg}\n${err.trace}`);
    } else {
        logInfo(`Backend error: ${err.msg}`, process);
    }
}

module.exports = {
    logInfo: logInfo,
    logError: logError,
    logBackendError: logBackendError,
};
