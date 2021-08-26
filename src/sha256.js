
const crypto = require('crypto');

async function hash (password) {
    return crypto.createHash('sha256').update(password).digest('hex'); 
}

module.exports = {
    hash  
}
/*
let sha256 = require('sha256');
async function hash (password) {
  return sha256(password);
}
module.exports = {
  hash
}
*/