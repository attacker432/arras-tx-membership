const db = require('../../db');
const Settings = require('../../models/settings');

(async function () {
  try {
    await Settings.deleteAll();
    console.log('Deleted the settings.');
  }
  catch (err){
    console.log(err);
  }
  db.disconnect();
})();