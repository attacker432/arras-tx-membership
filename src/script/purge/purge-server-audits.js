const db = require('../../db');
const ServerAudit = require('../../models/server-audit');

(async function () {
  try {
    await ServerAudit.deleteAll();
    console.log('Deleted server audits.');
  }
  catch (err){
    console.log(err);
  }
  db.disconnect();
})();