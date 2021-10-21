/* jshint esversion: 9 */
const cuid = require('cuid');
const db = require('../db');
const logger = require('./../logger');
const globals = require('./../globals');

const User = db.model('User', {
  _id: { type: String, default: cuid },  
  username: usernameSchema(),
  passwordHash: { type: String, required: true },
  jwtToken: { type: String, default: null },
  role: {
    type: String,
    required: true,
    index: true,
    default: globals.DefaultRoleName,    
  },
  status: {
    type: String,
    required: true,
    index: true,
    default: globals.DefaultMemberStatus,
    enum: {
      values: globals.ValidMemberStatuses,
      message: 'Status is required.'
    }
  },
  suspendedReason: { type: String, default: null },  
  countryName: { type: String, default: null },
  registerDate: { type: Date, required: true, default: new Date() },
  lastLoginDate: { type: Date, default: null },
  lastUpdatedBy: { type: String, default: null },
  lastUpdatedDate: { type: Date, default: null },
});

async function list (page, limit, filter) {
  const users = await User.find(filter)
      .sort({'registerDate':-1})
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

  return users;
}

async function getByIds (ids) {
  const filter = {
    _id: {
      $in: ids
    }
  };

  const users = await User.find(filter).exec();
  
  return users;
}

async function find (filter) {  
  return await User.find(filter).exec();    
}

async function getCount (filter) {
  return await User.countDocuments(filter);
}

async function removeByUsername (username) {
  await User.deleteOne({ username });
}

async function removeById (userid) {
  await User.deleteOne({ _id: userid });
}

async function deleteAll () {
  await User.deleteMany({});
}

async function get (username) {
  const user = await User.findOne({ username });
  return user;
}

async function getById (id) {
  const user = await User.findOne({ _id: id });
  return user;
}

async function getAll () {
  const users = await User.find({});
  return users;
}

async function create (fields) {
  const user = new User(fields);
  await user.save();
  return user;
}

async function update (_id, change) {  
  try {    
    const user = await getById(_id);
    
    Object.keys(change).forEach(function (key) {
      user[key] = change[key];
    });
    
    await user.save();
    return user;
  }
  catch (err){
    await logger.error(err);
  }
  
  return null;
}

async function updateAll (change) {  
  try {    
    const users = await getAll();
    for (let user of users){
    Object.keys(change).forEach(function (key) {
      user[key] = change[key];
      console.log(user[key]+' for userdata: '+user);
    });
      
    
    await user.save();
    return user;
}
  }
  catch (err){
    await logger.error(err);
  }
  
  return null;
}

async function isUnique (doc, username) {
  const existing = await get(username);
  return !existing || doc._id === existing._id;
}

async function anyExistsWithRoleName (roleName) {  
  const count = await User.where({ role: roleName }).countDocuments();
  return (count > 0);
}

function usernameSchema () {
  return {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minLength: 2,
    maxLength: 20,
    validate: [{
          validator: function (username) { return isUnique(this, username) }
        }
      ]
  };
}

module.exports = {
  get,
  getById,
  getByIds,  
  getCount,  
  list,
  find,
  create,
  update,  
  updateAll,
  getAll,
  removeByUsername,
  removeById,
  deleteAll,
  anyExistsWithRoleName  
};