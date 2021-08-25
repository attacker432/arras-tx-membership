const crypto = require('crypto');

async function hash (password) {
    return crypto.createHash('sha256').update(password).digest('hex');  
}

module.exports = {
    hash  
}