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

module.exports = {
    logInfo: logInfo,
    logError: logError,
};
