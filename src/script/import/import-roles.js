const db = require('../../db');
const Role = require('../../models/role');
const roles = require('../../../roles.json');

(async function () {
  for (let i = 0; i < roles.length; i++) {
    try {
      const role = await Role.create(roles[i]);
      console.log(`Role ${role.name} created.`);
      
    }
    catch (err){
      console.log(err);
    }
  }
  db.disconnect();
})();