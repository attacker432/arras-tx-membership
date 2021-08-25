/* jshint esversion: 9 */
const db = require('../db');
const logger = require('../logger');

const Settings = db.model('Settings', {
  _id: { type: Number, default: 1 },  
  allowMemberRegistration : { type: Boolean, default: true },
  allowMapSubmission : { type: Boolean, default: true },
  allowTankSubmission : { type: Boolean, default: true },
  
  minRoleToViewMemberPasswordHash: { type: String, default: 'Developer' },
  minRoleToViewMemberCountry: { type: String, default: 'Developer' },   
  
  minRoleToEditMemberUsername: { type: String, default: 'Developer' }, 
  minRoleToEditMemberPasswordHash: { type: String, default: 'Developer' },
  minRoleToEditMemberRole: { type: String, default: 'Developer' }, 
  minRoleToEditMemberStatus: { type: String, default: 'Developer' },      
  minRoleToDeleteMember: { type: String, default: 'Developer' },

  // ===========================================================================
  // Allow this to be edited by "Developer" only.
  // ===========================================================================
  minRoleToManageRole: { type: String, default: 'Developer' }, 
  minRoleToDeleteRole: { type: String, default: 'Developer' }, 

  minRoleToEditSettings: { type: String, default: 'Developer' },
  // ===========================================================================

  lastUpdatedBy: { type: String, default: null },
  lastUpdatedDate: { type: Date, default: null }
});

async function get (id = 1) {
  return await Settings.findOne({ _id: id });  
}

async function create (fields) {
  const settings = new Settings(fields);
  await settings.save();
  return settings;
}

async function update (_id, change) {  
  try {    
    const settings = await get(_id);
        
    Object.keys(change).forEach(function (key) {
      settings[key] = change[key];
    });
    
    await settings.save();
    return settings;
  }
  catch (err){
    await logger.error(err);
  }
  
  return null;
}

async function deleteAll () {
  await Settings.deleteMany({});
}

module.exports = {
  get,  
  create,
  update,
  deleteAll
};