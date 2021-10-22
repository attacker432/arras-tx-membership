const db = require('../../db');
const Role = require('../../models/role');
const roles = require('../../../roles.json');
const ServerAudit = require('../../models/server-audit');

(async function () {
  for (let i = 0; i < roles.length; i++) {
    try {
      roles[i].username = roles[i].username.trim();

      const role = await Role.create(roles[i]);
      console.log(`User ${role.name} created.`);

      await ServerAudit.create({
        userid: null,
        username: 'System',        
        action: `System created role ${role.name}.`
      });
    }
    catch (err){
      console.log(err);
    }
  }
  db.disconnect();
})();