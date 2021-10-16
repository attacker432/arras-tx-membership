const cuid = require('cuid');
const db = require('../db');
const logger = require('./../logger');
const globals = require('./../globals');

const Tank = db.model('Tank', {
  _id: { type: String, default: cuid },  
  tankName: tankNameSchema(),
  tankCode: { type: String, required: true },  
  status: {
    type: String,
    required: true,
    index: true,
    default: globals.DefaultTankStatus,
    enum: {
      values: globals.ValidTankStatuses,
      message: 'Status is required.'
    }
  },
  submittedDate: { type: Date, required: true, default: new Date() },
  submittedBy: { type: String, required: true },
  lastUpdatedDate: { type: Date, default: null },
  lastUpdatedBy: { type: String, default: null }
});

async function list (page, limit, filter) {
  const tanks = await Tank.find(filter)
      .sort({'submittedDate':-1})
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();
      
  return tanks;
}

async function getCount (filter) {
  return await Tank.countDocuments(filter);
}

async function removeById (tankId) {
  await Tank.deleteOne({ _id: tankId });
}

async function deleteAll () {
  await Tank.deleteMany({});
}

async function getByName (tankName) {
  return await Tank.findOne({ tankName });
}

async function getById (id) {
  return await Tank.findOne({ _id: id });  
}

async function getApproved () {
  return await Tank.find({status: globals.ApprovedStatus});
}

async function getApprovedCount () {
  return await Tank.countDocuments({status: globals.ApprovedStatus});
}

async function getAll () {
  return await Tank.find({});
}

async function getAllCount () {
  return await Tank.countDocuments();
}

async function create (fields) {
  const tank = new Tank(fields);
  await tank.save();
  return tank;
}

async function update (_id, change) {  
  try {    
    const tank = await getById(_id);
    
    Object.keys(change).forEach(function (key) {
      tank[key] = change[key];
    });    

    await tank.save();
    return tank;
  }
  catch (err){
    await logger.error(err);
  }
  
  return null;
}

async function isUnique (doc, tankName) {
  const existing = await getByName(tankName);
  return !existing || doc._id === existing._id;
}

function tankNameSchema () {
  return {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minLength: 1,
    maxLength: 20,
    validate: [        
        {
          validator: function (tankName) { return isUnique(this, tankName) },
          message: props => 'Duplicate tank name.'
        }
      ]
  }
}

module.exports = {
  getByName,
  getById,  
  getCount,
  getApproved,
  getApprovedCount,
  getAll,  
  list,
  create,
  update,    
  removeById,
  deleteAll  
}
