const db = require('../../db');
const Role = require('../../models/role');

(async function () {
  try {
    await Role.deleteAll();
    console.log('Deleted all roles.');
  }
  catch (err){
    console.log(err);
  }
  db.disconnect();
})();