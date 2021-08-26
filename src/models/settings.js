/* jshint esversion: 9 */
const db = require('../db');
const logger = require('../logger');

const Settings = db.model('Settings', {
  _id: { type: Number, default: 1 },  
  allowMemberRegistration : { type: Boolean, default: true },
  allowMapSubmission : { type: Boolean, default: true },
  allowTankSubmission : { type: Boolean, default: true },
  
  minRoleToViewMemberPasswordHash: { type: String, default: 'Developer' },
  minRoleToViewMemberCountry: { type: String, default: 'Moderator' },   
  
  minRoleToEditMemberUsername: { type: String, default: 'Owner' }, 
  minRoleToEditMemberPasswordHash: { type: String, default: 'Developer' },
  minRoleToEditMemberRole: { type: String, default: 'Admin' }, 
  minRoleToEditMemberStatus: { type: String, default: 'Admin' },      
  minRoleToDeleteMember: { type: String, default: 'Owner' },

  // ===========================================================================
  // Allow this to be edited by "[role name]" only.
  // ===========================================================================
  minRoleToManageRole: { type: String, default: 'Admin' }, 
  minRoleToDeleteRole: { type: String, default: 'Owner' }, 

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