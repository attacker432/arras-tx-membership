/* jshint esversion: 9 */
const config = require('../config.json');
const globals = require('./globals');
const axios = require('axios');
const getIPInfo = (ipAddress) => {
    // https://ip-api.com/docs/api:json
    return axios.get(`http://ip-api.com/json/${ipAddress}?fields=182274`);
}
// https://stackoverflow.com/questions/12799539/javascript-xss-prevention
function sanitizeHTML (str) {         
    const lt = /</g;
    const gt = />/g;

    return str.toString()
              .replace(lt, "&lt;")
              .replace(gt, "&gt;")
              .replace(/[\u202E]+/g, '&#39;');
}

function replaceLessThanBracket (str) {     
    const lt = /</g;        
    return str.toString().replace(lt, "&lt;");
}

async function getCountryNameByIPAddress (ipAddress) {
    return 'Unknown';
}

async function getDateString (date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}${month}${day}`;
}

// https://ui.dev/validate-email-address-javascript/
async function isEmail(input){
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
}

// https://stackoverflow.com/questions/9682709/regexp-matching-hex-color-syntax-and-shorten-form
// https://stackoverflow.com/questions/8027423/how-to-check-if-a-string-is-a-valid-hex-color-representation/8027444
// Would match #abc and #abcdef but not #abcd
async function isHexColorString(input){
    // /^#([0-9A-F]{3}){1,2}$/i
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(input);
}

module.exports = {
    getCountryNameByIPAddress,
    getDateString,
    sanitizeHTML,
    replaceLessThanBracket,    
    isEmail,
    isHexColorString
};