const db = require('../../db');
const GameAudit = require('../../models/game-audit');

(async function () {
  try {
    await GameAudit.deleteAll();
    console.log('Deleted game audits.');
  }
  catch (err){
    console.log(err);
  }
  db.disconnect();
})();