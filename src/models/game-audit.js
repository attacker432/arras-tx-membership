const cuid = require('cuid');
const db = require('../db');

const GameAudit = db.model('GameAudit', {
  _id: { type: String, default: cuid },      
  serverName: { type: String, default: null },
  action: { type: String, required: true },
  actionDate: { type: Date, default: new Date() }
});

async function list (page, limit, filter) {
  const audits = await GameAudit.find(filter)
      .sort({actionDate:-1})
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

  return audits;
}

async function getCount (filter) {
  return await GameAudit.countDocuments(filter);
}

async function create (fields) {
  const audit = new GameAudit(fields);
  await audit.save();
  return audit;
}

async function deleteAll () {
  await GameAudit.deleteMany({});
}

module.exports = {
  getCount,
  list,
  create,
  deleteAll
}