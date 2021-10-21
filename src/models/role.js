/* jshint esversion: 9 */
const cuid = require('cuid');
const db = require('../db');
const logger = require('./../logger');

const Role = db.model('Role', {
  _id: { type: String, default: cuid },  
  name: nameSchema(),  
  color: { type: String, default: '#ffffff' },  
  value: { type: Number, default: 0 },
  locked: { type: Boolean, default: false },
  
  // =======================================================
  // Membership permissions. For "Developer" only.
  // Per application session (until the app restarts).
  // =======================================================
  maxMemberDelete: { type: Number, default: 0 },
  maxMemberUsernameUpdate: { type: Number, default: 0 },
  maxMemberPasswordHashUpdate: { type: Number, default: 0 },
  maxMemberRoleUpdate: { type: Number, default: 0 },
  maxMemberStatusUpdate: { type: Number, default: 0 }, 

  // =======================================================
  // In-game permissions.
  // =======================================================
  permWarn: { type: Number, default: 0 },
  permMute: { type: Number, default: 0 },
  permUnmute: { type: Number, default: 0 },
  permKill: { type: Number, default: 0 },
  permKickDead: { type: Number, default: 0 },
  permKickSpecs: { type: Number, default: 0 },
  permKick: { type: Number, default: 0 },
  permBroadcast: { type: Number, default: 0 },
  permToggleFood: { type: Number, default: 0 },
  permTempBan: { type: Number, default: 0 },
  permASNBan: { type: Number, default: 0 },
  permClearBanList: { type: Number, default: 0 },
  permASNMute: { type: Number, default: 0 },
  permASNUnmute: { type: Number, default: 0 },
  permASNAdd: { type: Number, default: 0 },  
  permRestartServer: { type: Number, default: 0 },
  permVPNCommand: { type: Number, default: 0 },
  permMapCommand: { type: Number, default: 0 },
  // =======================================================

  locked: { type: Boolean, required: true, default: false },
  lockedBy: { type: String, required: true, default: 'System' },

  createdBy: { type: String, required: true, default: 'System' },
  createdDate: { type: Date, required: true, default: new Date() },

  lastUpdatedBy: { type: String, default: null },  
  lastUpdatedDate: { type: Date, default: null }
});


async function list (page, limit, filter) {
  const roles = await Role.find(filter)
      .sort({ 'value': 1})
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

  return roles;
}

async function find (filter) {  
  return await Role.find(filter).exec();    
}

async function getCount (filter) {
  return await Role.countDocuments(filter);
}

async function getByName (roleName) {
  return await Role.findOne({ roleName });
}

async function getById (id) {
  const role = await Role.findOne({ _id: id });
  return role;
}

async function getAll () {
  const roles = await Role.find({});
  return roles;
}

async function create (fields) {
  const role = new Role(fields);
  await role.save();
  return role;
}

async function update (_id, change) {  
  try {    
    const role = await getById(_id);
    
    await logger.info(`Old values=${Object.values(role)}`);

    Object.keys(change).forEach(function (key) {
      role[key] = change[key];
    });

    await logger.info(`New values=${Object.values(role)}`);

    await role.save();
    return role;
  }
  catch (err){
    console.log(err);
    await logger.error(err);
  }
  
  return null;
}

async function removeById (id) {
  await Role.deleteOne({ _id: id });
}

async function isUnique (doc, roleName) {
  const existing = await getByName(roleName);
  return !existing || doc._id === existing._id;
}

async function deleteAll () {
  await Role.deleteMany({});
}

function nameSchema () {
  return {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minLength: 2,
    maxLength: 30,
    validate: [{
          validator: function (roleName) { 
            return isUnique(this, roleName); 
          },
          message: props => 'Duplicate role name.'
        }
      ]
  };
}

module.exports = {  
  getById,
  getCount,
  getAll,  
  list,
  find,
  create,
  update,  
  removeById,
  deleteAll
};