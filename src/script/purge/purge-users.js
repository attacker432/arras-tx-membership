const db = require('../../db');
const User = require('../../models/user');

(async function () {
  try {
    await User.deleteAll();
    console.log('Deleted all users.');
  }
  catch (err){
    console.log(err);
  }
  db.disconnect();
})();