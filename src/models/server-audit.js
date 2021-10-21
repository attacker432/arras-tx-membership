const cuid = require('cuid');
const db = require('../db');

const ServerAudit = db.model('ServerAudit', {
  _id: { type: String, default: cuid },  
  userid: { type: String, default: null },
  username: { type: String, required: true },
  action: { type: String, required: true },
  actionDate: { type: Date, default: new Date() }
})

async function list (page, limit, filter) {
  const audits = await ServerAudit.find(filter)
      .sort({actionDate:-1})
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

  return audits;
}

async function getCount (filter) {
  return await ServerAudit.countDocuments(filter);
}
async function getAll () {
  const ServerAudit = await ServerAudit.find({});
  return ServerAudit;
}

async function create (fields) {
  const audit = new ServerAudit(fields);
  await audit.save();
  return audit;
}

async function deleteAll () {
  await ServerAudit.deleteMany({});
}

module.exports = {
  getCount,
  list,
  getAll,
  create,
  deleteAll
}