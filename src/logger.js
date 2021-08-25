const logger = require('pino')(__dirname + '/logs/pino.log');

async function info (message) {
    logger.info(message);        
}

async function debug (message) {
    logger.debug(message);        
}

async function warn (message) {
    logger.warn(message);        
}

async function error (message) {
    logger.error(message);    
}

module.exports = {
    info,
    debug,
    warn,
    error  
}