/* jshint esversion: 9 */
const cuid = require('cuid');
const db = require('../db');
const logger = require('../logger');
const globals = require('../globals');

const Maze = db.model('Maze', {
  _id: { type: String, default: cuid },  
  name: mazeNameSchema(),
  data: { type: Object, required: true },
  status: {
    type: String,
    required: true,
    index: true,
    default: globals.DefaultMazeStatus,
    enum: {
      values: globals.ValidMazeStatuses,
      message: 'Status is required.'
    }
  },
  usageCount: { type: Number, required: false, default: 0 },
  rejectedReason: { type: String, required: false, default: null },
  createdBy: { type: String, required: true },
  createdDate: { type: Date, required: true, default: new Date() },
  lastUpdatedBy: { type: String, default: null },
  lastUpdatedDate: { type: Date, default: null }  
});


async function list (page, limit, filter) {
  const mazes = await Maze.find(filter)
      .sort({'createdDate':-1})
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();
      
  return mazes;
}

async function getCount (filter) {
  return await Maze.countDocuments(filter);
}

async function removeById (id) {
  await Maze.deleteOne({ _id: id });
}

async function get (name) {
  const maze = await Maze.findOne({ name: name });
  return maze;
}

async function getById (id) {
  const maze = await Maze.findOne({ _id: id });
  return maze;
}

async function find (filter) {  
  return await Maze.find(filter).exec();    
}

async function getApproved () {
  const mazes = await Maze.find({status: globals.ApprovedStatus});      
      
  return mazes;
}

async function create (fields) {
  const maze = new Maze(fields);
  await maze.save();
  return maze;
}

async function update (_id, change) {  
  try {    
    const maze = await getById(_id);
    
    Object.keys(change).forEach(function (key) {
      maze[key] = change[key];
    });    

    await maze.save();
    return maze;
  }
  catch (err){
    await logger.error(err);
  }
  
  return null;
}

async function isUnique (doc, mazeName) {
  const existing = await get(mazeName);
  return !existing || doc._id === existing._id;
}

async function deleteAll () {
  await Maze.deleteMany({});
}

function mazeNameSchema () {
  return {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minLength: 2,
    maxLength: 30,
    validate: [        
        {
          validator: function (mazeName) { return isUnique(this, mazeName) },
          message: props => 'Duplicate maze name.'
        }
      ]
  };
}

module.exports = {
  getById,  
  getCount,
  getApproved,  
  find,
  list,
  create,
  update,    
  removeById,
  deleteAll
};