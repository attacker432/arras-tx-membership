const db = require('../../db');
const User = require('../../models/user');
const users = require('../../../users.json');
const ServerAudit = require('../../models/server-audit');

(async function () {
  for (let i = 0; i < users.length; i++) {
    try {
      users[i].username = users[i].username.trim();

      const user = await User.create(users[i]);
      console.log(`User ${user.username} created.`);

      await ServerAudit.create({
        userid: null,
        username: 'System',        
        action: `System created user account ${user.username} (id: ${user._id}).`
      });
    }
    catch (err){
      console.log(err);
    }
  }
  db.disconnect();
})();