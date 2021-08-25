/* jshint esversion: 9*/
const db = require('../../db');
const Settings = require('../../models/settings');
const settingsJson = require('../../../settings.json');

(async function () {
  try {
    await Settings.create(settingsJson[0]);
    console.log('Settings created.');
  }
  catch (err){
    console.log(err);
  }

  db.disconnect();
})();