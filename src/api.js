/* jshint esversion: 9 */
const autoCatch = require('./lib/auto-catch');
const globals = require('./globals');
const auth = require('./auth');
const logger = require('./logger');
const sha256 = require('./sha256');
const config = require('../config.json');
const utils = require('./utils');
const ftb = require('./ftb/ftb');
const User = require('./models/user');
const Tank = require('./models/tank');
const Maze = require('./models/maze');
const ServerAudit = require('./models/server-audit');
const GameAudit = require('./models/game-audit');
const Role = require('./models/role');
const Settings = require('./models/settings');

async function populateRoleLookups(){
  globals.AllRoles = await Role.getAll();
  // Sort in ascending order by role value.  
  globals.AllRoles.sort((a, b) => {
    if ( a.value < b.value ){
      return -1;
    }
    if ( a.value > b.value ){
      return 1;
    }
    return 0;
  });

  for (const role of globals.AllRoles){
    globals.RoleFromNameLookup[role.name] = role;    
  }
}

async function populateSettings() {
  globals.Settings = await Settings.get() || globals.DefaultSettings;
}

(async ()=>{
  await populateRoleLookups();
  await populateSettings();  
})();

// Key = date string
// Lookup containers.
const dailyMemberUsernameUpdateUsageCountLookup = new Map();
const dailyMemberPasswordHashUpdateUsageCountLookup = new Map();
const dailyMemberRoleUpdateUsageCountLookup = new Map();
const dailyMemberStatusUpdateUsageCountLookup = new Map();
const dailyMemberDeleteUsageCountLookup = new Map();
const dailyTankDeleteUsageCountLookup = new Map();

async function getAllRoles(){
  return globals.AllRoles;
} 

// =================================================================
// Generic functions.
// =================================================================
async function getDailyUsageCount(userid, lookupContainer){  
  const dateString = await utils.getDateString(new Date());

  if (!lookupContainer.has(dateString)){
    lookupContainer.set(dateString, new Map());    
  }

  const usageCountLookup = lookupContainer.get(dateString);
  if (!usageCountLookup.has(userid)){
    usageCountLookup.set(userid, 0);    
  }

  return usageCountLookup.get(userid);
}

async function incrementDailyUsageCount(userid, lookupContainer){
  const dateString = await utils.getDateString(new Date());
  const usageCountLookup = lookupContainer.get(dateString);
  
  const newUsageCount = usageCountLookup.get(userid) + 1;
  usageCountLookup.set(userid, newUsageCount);

  return newUsageCount;
}
// =================================================================

async function getDailyTankDeleteUsageCount(userid){  
  const dateString = await utils.getDateString(new Date());

  if (!dailyTankDeleteUsageCountLookup.has(dateString)){
    dailyTankDeleteUsageCountLookup.set(dateString, new Map());    
  }

  const usageCountLookup = dailyTankDeleteUsageCountLookup.get(dateString);
  if (!usageCountLookup.has(userid)){
    usageCountLookup.set(userid, 0);    
  }

  return usageCountLookup.get(userid);
}

async function incrementDailyTankDeleteUsageCount(userid){
  const dateString = await utils.getDateString(new Date());

  if (!dailyTankDeleteUsageCountLookup.has(dateString)){
    dailyTankDeleteUsageCountLookup.set(dateString, new Map());    
  }
  
  const usageCountLookup = dailyTankDeleteUsageCountLookup.get(dateString);
  
  const newUsageCount = usageCountLookup.get(userid) + 1;
  usageCountLookup.set(userid, newUsageCount);

  return newUsageCount;
}

async function createServerAudit(userid, username, action){
  const audit = {
    userid: userid,
    username: username,    
    action: action,
    actionDate: new Date()
  };
  await ServerAudit.create(audit);
}

async function createGameAudit(serverName, action){
  const audit = {
    serverName: serverName,
    action: action,
    actionDate: new Date()
  };
  await GameAudit.create(audit);  
}

async function getLoginPage (req, res, next){  
  res.render('login', {
    title: 'Member Log In'    
  });  
}


async function getRegistrationPage (req, res, next){  
  try {
    if (!globals.Settings.allowMemberRegistration){
      res.render('registration-disabled', {
        title: 'Registration Disabled'      
      });
    } else {
      res.render('register', {
        title: 'Member Registration',
        roles: config.registration.allowedSelfRoles        
      });
    }      
  }
  catch (err){
    await logger.error(err);
    return res.status(500).render('500', { title: 'Something went wrong!' });
  }   
}

async function getRegistrationConfirmationPage (req, res, next){
  try {
    const id = req.params.id;

    if (!id){
      return res.status(404).render('404', { title: 'Page Not Found' });      
    }
          
    const user = await User.getById(id);
    if (!user){      
      return res.status(404).render('404', { title: 'Page Not Found' });
    }

    res.render('registerconfirm', {
      'title': 'Activate Your Account',
      'username': user.username
    });
  }
  catch (err){
    await logger.error(err);
    return res.status(500).render('500', { title: 'Something went wrong!' });
  }    
}


async function getSubmitTankPage (req, res, next){
  try {
    const jwtString = req.headers.authorization || req.cookies.jwt;
    // Username maybe retrieved from JWT string but the user could have been deleted.
    const username = await auth.getUsernameFromToken(jwtString);
    const user = await User.get(username);

    if (user){
      if (globals.Settings.allowTankSubmission){
        res.render('tank-submit', {
          title: 'Submit Tank',
          user: user
        });
      } else {
        res.render('tank-submission-disabled', {
          title: 'Tank Submission Disabled'
        });
      }      
    }
    else {      
      // Most likely user not found.      
      res.redirect('/login');
    }
  }
  catch (err) {
    await logger.error(err);
    res.status(500);
    res.render('500', { 'title': 'Something went wrong!' });
  }
}


async function submitTank(req, res, next) {
  try {    
    if (!globals.Settings.allowTankSubmission){
      return res.status(403).json({
        success: false,
        message: 'Tank submission is disabled at the moment.'
      });      
    }

    const jwtString = req.headers.authorization || req.cookies.jwt;
    // Username maybe retrieved from JWT string but the user could have been deleted.
    const username = await auth.getUsernameFromToken(jwtString);
    const user = await User.get(username);

    if (!user){
      return res.status(404).json({
        success: false,
        message: 'User does not exist.'
      });      
    }
    
    const tanksCount = await Tank.getApprovedCount();    

    if (tanksCount >= config.tankSubmission.totalMaxTanks){
      return res.status(403).json({
        success: false,
        message: `Max number of ${config.tankSubmission.totalMaxTanks} tanks (approved) reached.`
      });      
    }

    // =====================================================================================================
    // Check required fields.
    // =====================================================================================================
    // Map Name.
    req.body.tankName = trimIfNotEmpty(req.body.tankName);    
    if (!checkRequiredString(req.body.tankName)){
      return res.status(400).json(createValidationMessage('tankName', 'Tank Name is required.'));      
    }
    req.body.tankName = utils.sanitizeHTML(req.body.tankName);
    
    // =====================================================================================================
    // Check tank name length and format (i.e. alphabets and spaces only).
    // =====================================================================================================
    const minNameLen = globals.MinTankNameLength;
    const maxNameLen = globals.MaxTankNameLength;

    if (req.body.tankName.length < minNameLen || req.body.tankName.length > maxNameLen){
      const msg = `Tank Name must be between ${minNameLen} and ${maxNameLen} characters.`;
      return res.status(400).json(createValidationMessage('tankName', msg));
    }
        
    if (!globals.TankNameRegEx.test(req.body.tankName)){
      const msg = 'Tank Name must be alphabets, numbers, and single space only.';
      return res.status(400).json(createValidationMessage('tankName', msg));
    }
   
    if (!req.body.tankCode){
      res.status(400).json({
        errorDetails:{
          tankCode: {
            message: 'Tank Code is required.'
          }
        }
      });
      return;
    }
    
    if (req.body.tankCode.length < config.tankSubmission.minCodeLength ||
        req.body.tankCode.length > config.tankSubmission.maxCodeLength){
      res.status(400).json({
        errorDetails:{
          tankCode: {
            message: `Tank Code must be between ${config.tankSubmission.minCodeLength} and ${config.tankSubmission.maxCodeLength} characters.`
          }
        }
      });
      return;
    }


    // ==========================================
    // Check max tanks per user?
    // ==========================================
    // ...
    // ==========================================

                
    req.body.tankName = req.body.tankName.trim();
    req.body.tankCode = req.body.tankCode.trim();    
    req.body.submittedBy = user.id;

    // ================================================================
    // Validate the tank.
    // ================================================================
    const ftbTank = await ftb.parse(req.body.tankCode);
    if (!ftbTank.body || ftbTank.barrels.length === 0){
      res.status(500).json({
        success: false,
        message: 'Unable to parse FTB code.'
      });
      return;
    }

    const errors = await ftb.validate(ftbTank);
    if (errors.length > 0){
      res.status(401).json({
        success: false,
        message: errors.join('. ')
      });
      return;
    }
    // ================================================================
    // Check for duplicate name.
    const existingTank = await Tank.getByName(req.body.tankName);

    if (existingTank && existingTank.id){
      res.status(400).json({
        errorDetails:{
          tankName: {
            message: 'Tank name is taken.'
          }
        }
      });
      return;
    }
    
    req.body.submittedDate = new Date();
    const tank = await Tank.create(req.body);    
    
    // =====================================================================================
    // Audit trail.
    const action = `Tank ${req.body.tankName} submitted by ${user.username}.`;
    await createServerAudit(user._id, user.username, action);
    // =====================================================================================

    res.status(200);
    res.json({
      success: true,
      redirectUrl: '/tank/submitconfirm/' + tank.id
    });
  }
  catch (err) {
    await logger.error(err);
    res.status(500).json({
      success: false,
      message: 'Something went wrong!'
    });
  }
}

async function getSubmitTankConfirmationPage (req, res, next){
  try {
    const id = req.params.id;

    if (!id){      
      return res.status(404).render('404', { title: 'Page Not Found' });      
    }
          
    const tank = await Tank.getById(id);
    if (!tank){      
      return res.status(404).render('404', { title: 'Tank Not Found' });      
    }

    const jwtString = req.headers.authorization || req.cookies.jwt;
    // Username maybe retrieved from JWT string but the user could have been deleted.
    const username = await auth.getUsernameFromToken(jwtString);
    const user = await User.get(username);

    if (!user){
      return res.status(404).json({
        success: false,
        message: 'User does not exist.'
      });      
    }    

    res.render('tank-submit-confirm', {
      'title': 'Seek Approval for Your Tank',
      'user': user,
      'tankName': tank.tankName
    });
  }
  catch (err){
    await logger.error(err);
    res.status(500);
    res.render('500', {'title': 'Something went wrong!'});   
  }    
}

async function getTankListPage (req, res, next){
  try {       
    const jwtString = req.headers.authorization || req.cookies.jwt;
    const username = await auth.getUsernameFromToken(jwtString);
    const user = await User.get(username);

    if (!user){
      res.redirect('/login');
      return;
    }
      
    const filter = {};

    let queryTankName = trimIfNotEmpty(req.query.tankName);
    if (queryTankName){          
      // https://stackoverflow.com/questions/16560291/searching-string-with-special-characters-in-mongodb-document
      // Escape all regex special characters:
      queryTankName = queryTankName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Having problem with names which contain special characters like "[".
      filter.tankName = {
        '$regex': queryTankName,
        '$options': 'i' // Case-insensitive
      };

      // Exact match.
      //filter.tankName = `${queryTankName}`;
    }

    let queryStatus = trimIfNotEmpty(req.query.status);
    if (queryStatus){
      queryStatus = utils.sanitizeHTML(queryStatus);
      
      if (globals.ValidTankStatuses.includes(queryStatus)){
        const modifiedStatus = queryStatus.replace(/[.*+?^${}|[\]\\]/g, '\\$&');
      
        // Exact match.
        filter.status = modifiedStatus;
      }      
    }

  
    const limit = config.tankList.pageSize ? config.tankList.pageSize : 10;    
    const totalRecords = await Tank.getCount(filter);
    const totalPages = Math.ceil(totalRecords / limit);

    // Pagination.    
    let page = parseInt(req.query.page);

    if (isNaN(page)){
      page = 1;
    }
    else {
      if (page < 1 || page > totalPages){
        page = 1;      
      }
    }
    
    let tanks = await Tank.list(page, limit, filter);    

    // Compile a list of user ids from the tanks to retrieve usernames.
    const userIds = tanks.map(x => { return x.submittedBy; });
    const users = await User.getByIds(userIds);    
    const userRoleValue = getRoleValueFromName(user.role);
    // ======================================================================================
    // Validate tank code.
    // ======================================================================================
    for (const tank of tanks){      
      const tankCode = await ftb.convert(tank.tankCode, tank.id, tank.tankName);
                  
      if (!tankCode){        
        tank.status = 'Invalid';
      }      
    }
    // ======================================================================================

    tanks = tanks.map((tank) => {      
      tank.canBeEdited = (user.id === tank.submittedBy) || (userRoleValue >= config.tankEdit.minRoleValueToViewEditPage);
            
      tank.statusColor = config.statusColors[tank.status];

      // Populate username.
      const creator = users.find((x) => { return tank.submittedBy === x._id; });
      if (creator){
        tank.submittedByUsername = creator.username;
      }
             
      return tank;
    });    
    
    res.render('tank-list', {
      title: 'Tanks',
      // Currently authenticated user.
      user: user,
      tanks: tanks,
      pageCount: totalPages,
      totalRecords: totalRecords,
      currentPage: page,
      tankName: queryTankName,
      status: queryStatus,
      validStatuses: globals.ValidTankStatuses
    });
  }
  catch (err){
    await logger.error(err);
    res.status(500);
    res.render('500', { 'title': 'Something went wrong!' });
  }  
}

async function getTankViewPage (req, res, next){
  try {
    const jwtString = req.headers.authorization || req.cookies.jwt;
    const username = await auth.getUsernameFromToken(jwtString);

    if (username){
      const { id } = req.params;
      const user = await User.get(username);      
      const tank = await Tank.getById(id);
      tank.statusColor = config.statusColors[tank.status];
      
      const userRoleValue = getRoleValueFromName(user.role);
      
      user.canEditTank =  (user.id === tank.submittedBy) ||                            
                            userRoleValue >= config.tankEdit.minRoleValueToViewEditPage;

      user.canDeleteTank = (user.id === tank.submittedBy) ||                            
                            userRoleValue >= config.tankDelete.minRoleValueToViewDeletePage;
      
      res.render('tank-view', {
        title: 'Tank Details',
        user: user,
        tank: tank        
      });
    }
  }
  catch (err){
    res.render('500', {
      title: 'Internal Server Error'
    });
  }
}

async function getTankEditPage (req, res, next){
  try {
    const jwtString = req.headers.authorization || req.cookies.jwt;
    const username = await auth.getUsernameFromToken(jwtString);

    if (username){    
      const user = await User.get(username);      
      const { id } = req.params;
      const tank = await Tank.getById(id);

      if (!tank){
        return res.status(404).render('404', {
          title: 'Tank Not Found'
        });
      }
                  
      const userRoleValue = getRoleValueFromName(user.role);
      const canViewEditPage = (user.id === tank.submittedBy) || (userRoleValue >= config.tankEdit.minRoleValueToViewEditPage);

      if (canViewEditPage){
        user.canEditTankName = (user.id === tank.submittedBy) || userRoleValue >= config.tankEdit.minRoleValueToEditTankName;
        user.canEditTankCode = (user.id === tank.submittedBy) || userRoleValue >= config.tankEdit.minRoleValueToEditTankCode;      
        user.canEditStatus = userRoleValue >= config.tankEdit.minRoleValueToEditStatus;      
        
        return res.render('tank-edit', {
          title: 'Edit Tank',
          user: user,
          tank: tank,        
          statuses: globals.ValidTankStatuses
        });
      }    
    }  

    return res.status(403).render('unauthorized', {
      title: 'Unauthorized'
    });
  }
  catch (err){
    res.render('500', {
      title: 'Internal Server Error'
    });
  }
}


async function updateTank(req, res, next){
  const jwtString = req.headers.authorization || req.cookies.jwt;
  const username = await auth.getUsernameFromToken(jwtString);

  if (!username){
    res.status(401);
      res.json({
        success: false,
        message: 'Authentication required.',
      });
      return;
  }
  
  {
    const tank = await Tank.getById(req.body._id);

    if (!tank){
      res.status(404);
      res.json({
          success: false,
          message: 'Tank not found.',            
      });
      return;
    }

    const user = await User.get(username);

    
        
    const userRoleValue = getRoleValueFromName(user.role);
    const canEdit = user.id === tank.submittedBy ||
                    userRoleValue >= config.tankEdit.minRoleValueToViewEditPage;
                       
    if (!canEdit){      
      res.status(403);
      res.json({
        success: false,
        message: 'Unauthorized.',
      });
      return;
    }        
    
    // =================================================================================================================
    // Make sure required fields are provided.
    // =================================================================================================================
    if (!req.body.tankName){
      res.status(400).json({
        errorDetails:{
          tankName: {
            message: 'Tank Name is required.'
          }
        }
      });
      return;
    }
    
    if (req.body.tankName.length < globals.MinTankNameLength ||
        req.body.tankName.length > globals.MaxTankNameLength){
      res.status(400).json({
        errorDetails:{
          tankName: {
            message: `Tank Name must be between ${globals.MinTankNameLength} and ${globals.MaxTankNameLength} characters.`
          }
        }
      });
      return;
    }

    if (!req.body.tankCode){
      res.status(400).json({
        errorDetails:{
          tankCode: {
            message: 'Tank Code is required.'
          }
        }
      });
      return;
    }
    
    if (req.body.tankCode.length < config.tankSubmission.minCodeLength ||
        req.body.tankCode.length > config.tankSubmission.maxCodeLength){
      res.status(400).json({
        errorDetails:{
          tankCode: {
            message: `Tank Code must be between ${config.tankSubmission.minCodeLength} and ${config.tankSubmission.maxCodeLength} characters.`
          }
        }
      });
      return;
    }

    if (!req.body.status){
      res.status(400).json({
        errorDetails:{
          status: {
            message: 'Status is required.'
          }
        }
      });
      return;
    }
      
                
    req.body.tankName = req.body.tankName.trim();
    req.body.tankCode = req.body.tankCode.trim();
       
    const ftbTank = await ftb.parse(req.body.tankCode, tank.id, req.body.tankName);        

    if (!ftbTank){
      res.status(500).json({
        success: false,
        message: 'Unable to parse FTB code.'
      });
      return;
    }

    const errors = await ftb.validate(ftbTank);
    
    if (errors.length > 0){
      console.log(errors.join(' '));

      res.status(401).json({
        success: false,
        message: errors.join(' ')
      });
      return;
    }
    // ================================================================      

    //if (canEdit)
    {      
      let change = {};
      let tankNameChanged = false;
      let tankCodeChanged = false;      
      let statusChanged = false;
            
      if (user.id === tank.submittedBy || 
         (userRoleValue >= config.tankEdit.minRoleValueToEditTankName &&
          userRoleValue >= config.tankEdit.minRoleValueToEditTankCode)){
        // =============================================================================
        // Editing tank name.
        // =============================================================================
        if (tank.tankName !== req.body.tankName){          
          // Check for duplicate name.
          const existingTank = await Tank.getByName(req.body.tankName);
          
          if (existingTank && existingTank.id !== tank.id){            
            res.status(400).json({
              errorDetails:{
                tankName: {
                  message: 'Tank name is taken.'
                }
              }
            });
            return;
          }
          // ================================================================          

          tankNameChanged = true;
          change.tankName = req.body.tankName;
        }

        // =============================================================================
        // Editing tank code.
        // =============================================================================
        let newTankCode = req.body.tankCode;

        if (newTankCode){
          newTankCode = newTankCode.trim();

          if (newTankCode !== tank.tankCode.trim()){
            tankCodeChanged = true;
            change.tankCode = newTankCode;            
          }
        }
      }
                 
      // =============================================================================
      // Editing status.
      // =============================================================================
      if (userRoleValue >= config.tankEdit.minRoleValueToEditStatus){
        if (req.body.status && req.body.status !== tank.status){

          // Validate the status.
          if (!globals.ValidTankStatuses.includes(req.body.status)){
            res.status(400).json({
              errorDetails:{
                status: {
                  message: 'Invalid status provided.'
                }
              }
            });
            return;
          }      

          statusChanged = true;
          change.status = req.body.status;          
        }
      }      

      if (!tankNameChanged && !tankCodeChanged && !statusChanged ){        
        return res.status(200).json({
          success: true,
          message: 'No need to update tank.',
          redirectUrl: `/tank/view/${tank.id}`
        });        
      }
      
      change.lastUpdatedDate = new Date();
      change.lastUpdatedBy = user.id;
      
      const updatedTank = await Tank.update(tank.id, change);

      if (updatedTank){
        // ===========================================================================================================
        // Audit trail.
        // ===========================================================================================================
        if (tankNameChanged){
          const action = `${user.username} updated tank name for ${tank.tankName} (id: ${tank.id}) to ${change.tankName}.`;
          await createServerAudit(user.id, user.username, action);
        }

        if (tankCodeChanged){
          const action = `${user.username} updated tank code for ${tank.tankName} (id: ${tank.id}).`;
          await createServerAudit(user.id, user.username, action);
        }
       
        if (statusChanged){
          const action = `${user.username} updated tank status for ${tank.tankName} (id: ${tank.id}) to ${change.status}.`;
          await createServerAudit(user.id, user.username, action);
        }
        // ===========================================================================================================

        res.status(200);
        res.json({
          success: true,
          message: 'Tank updated.',
          redirectUrl: `/tank/view/${tank.id}`
        });
      }
      else {
        await logger.warn(`Unable to update ${tank.tankName}.`);

        res.status(500);
        res.json({
          success: false,
          message: 'Unable to update tank.'
        });
      }
    }    
  }
}


async function getTankDeletePage (req, res, next){
  try {
    const jwtString = req.headers.authorization || req.cookies.jwt;
    const username = await auth.getUsernameFromToken(jwtString);

    if (username){
      const { id } = req.params;
      const user = await User.get(username);
      const tank = await Tank.getById(id);

      if (!tank){
        res.status(404);
        res.json({
          success: false,
          message: 'Tank not found.',
        });
        return;
      }

      tank.statusColor = config.statusColors[tank.status];
      
      const userRoleValue = getRoleValueFromName(user.role);

      user.canDeleteTank = (user.id === tank.submittedBy) || (userRoleValue >= config.tankDelete.minRoleValueToViewDeletePage);

      res.render('tank-delete', {
        title: 'Tank Details (Delete Page)',
        user: user,
        tank: tank
      });
    }
  }
  catch (err){
    res.render('500', {
      title: 'Internal Server Error'
    });
  }
}


async function deleteTank (req, res, next){
  try {
    const jwtString = req.headers.authorization || req.cookies.jwt;
    const username = await auth.getUsernameFromToken(jwtString);

    if (username){
      const tank = await Tank.getById(req.body._id);

      if (!tank){
        res.status(404);
        res.json({
          success: false,
          message: 'Tank not found.',
        });
        return;
      }

      const user = await User.get(username);            
      const userRoleValue = getRoleValueFromName(user.role);

      if ((userRoleValue < config.tankDelete.minRoleValueToDeleteTank) &&
          (user.id !== tank.submittedBy)) {
        await createServerAudit(user._id, user.username, req.ip, `Unauthorized user ${user.username} tried to delete the tank ${tank.tankName}.`);

        res.status(403);
        res.json({
          success: false,
          message: 'Unauthorized.'
        });
        return;
      }

      const isDev = isDeveloper(user.role);

      if (!isDev){
        const deleteUsageCount = await getDailyTankDeleteUsageCount(user.id);

        if (deleteUsageCount >= config.tankDelete.maxDailyDeleteUsage) {
          return res.status(403).json({
            success: false,
            message: `Daily delete usage limit (${config.tankDelete.maxDailyDeleteUsage}) reached.`
          });
        }
      }

      const action = `${user.username} deleted the tank ${tank.tankName} (id: ${tank.id}).`;
      await Tank.removeById(tank.id);      
      await createServerAudit(user.id, user.username, action);
      await incrementDailyTankDeleteUsageCount(user.id);

      return res.status(200).json({
        success: true,
        message: 'Tank deleted.',
        redirectUrl: `/tank/list`
      });
    }
  }
  catch (err){
    await logger.error(err);
    console.log(err);

    res.status(500);
    res.json({
      success: false,
      message: 'Unable to delete tank.'
    });
  }
}

async function searchTanks (req, res, next){
  try {    
    const jwtString = req.headers.authorization || req.cookies.jwt;
    // Username maybe retrieved from JWT string but the user could have been deleted.
    const username = await auth.getUsernameFromToken(jwtString);
    const user = await User.get(username);

    if (!user){
      res.redirect('/login');
      return;
    }


    let tankName = trimIfNotEmpty(req.body.tankName) || '';
    let searchStatus = trimIfNotEmpty(req.body.status) || '';

    tankName = utils.sanitizeHTML(tankName);    
    searchStatus = utils.sanitizeHTML(searchStatus);
            
    if (!globals.ValidTankStatuses.includes(searchStatus)){
      searchStatus = '';
    }    
    
    return res.status(200).json({
      success: true,        
      redirectUrl: `/tank/list/?page=1&tankName=${encodeURIComponent(tankName)}&status=${encodeURIComponent(searchStatus)}`
    });    
  }
  catch (err) {
    await logger.error(err);
    res.status(500);
    res.render('500', { 'title': 'Something went wrong!' });
  }
}


async function getChangePasswordPage (req, res, next){
  try {    
    const jwtString = req.headers.authorization || req.cookies.jwt;
    // Username maybe retrieved from JWT string but the user could have been deleted.
    const username = await auth.getUsernameFromToken(jwtString);
    const user = await User.get(username);

    if (user){
      res.render('changepassword', {
        title: 'Change Password',
        user: user
      });
    }
    else {
      // Most likely user not found.
      res.status(404);
      res.render('404', { 'title': 'User not found!' });
    }
  }
  catch (err) {
    await logger.error(err);
    res.status(500);
    res.render('500', { 'title': 'Something went wrong!' });
  }
}

async function changePassword (req, res, next) {
  try {
    if (!config.profile.allowPasswordChange){
      res.status(403).json({
        success: false,
        message: 'Chaning password disabled by admin.'
      });
      return;
    }

    const jwtString = req.headers.authorization || req.cookies.jwt;
    // Username maybe retrieved from JWT string but the user could have been deleted.
    const username = await auth.getUsernameFromToken(jwtString);
    const user = await User.get(username);

    if (!user){
      res.status(404).json({
        success: false,
        message: 'User does not exist.'
      });
      return;
    }
    
    // =====================================================================================================
    req.body.currentPassword = trimIfNotEmpty(req.body.currentPassword);
    req.body.newPassword = trimIfNotEmpty(req.body.newPassword);
    req.body.confirmNewPassword = trimIfNotEmpty(req.body.confirmNewPassword);

    // =====================================================================================================
    // Check required fields.
    // =====================================================================================================
    if (!checkRequiredString(req.body.currentPassword)){
      return res.status(400).json(createValidationMessage('currentPassword', 'Current Password is required.'));      
    }

    if (!checkRequiredString(req.body.newPassword)){
      return res.status(400).json(createValidationMessage('newPassword', 'New Password is required.'));
    }
            
    if (!checkRequiredString(req.body.confirmNewPassword)){      
      return res.status(400).json(createValidationMessage('confirmNewPassword', 'Confirm New Password is required.'));      
    }
      
    // =================================================================================================================
    // Make sure the current password is correct.
    // =================================================================================================================
    let currentPasswordHash = await sha256.hash(req.body.currentPassword);
    currentPasswordHash = currentPasswordHash.toUpperCase();

    if (currentPasswordHash !== user.passwordHash){
      return res.status(400).json(createValidationMessage('currentPassword', 'Current Password is incorrect.'));           
    }

    // =================================================================================================================
    // Make sure the current password is different than the new password.
    // =================================================================================================================
    if (req.body.currentPassword === req.body.newPassword){
      return res.status(400).json(createValidationMessage('newPassword', 'New Password must be different from Current Password.'));           
    }

    // =================================================================================================================
    // Check new password length.
    // =================================================================================================================
    const minPasswordLen = config.registration.minPasswordLength;
    const maxPasswordLen = config.registration.maxPasswordLength;

    if (req.body.newPassword.length < minPasswordLen || req.body.newPassword.length > maxPasswordLen){
      const msg = `Password must be between ${minPasswordLen} and ${maxPasswordLen} characters.`;
      return res.status(400).json(createValidationMessage('newPassword', msg));      
    }

    if (req.body.confirmNewPassword.length < minPasswordLen || req.body.confirmNewPassword.length > maxPasswordLen){
      const msg = `Password must be between ${minPasswordLen} and ${maxPasswordLen} characters.`;
      return res.status(400).json(createValidationMessage('confirmNewPassword', msg));      
    }

    // =====================================================================================================
    // Make sure new password and confirm new password match.
    // =====================================================================================================
    if (req.body.newPassword !== req.body.confirmNewPassword){
      return res.status(400).json(createValidationMessage('confirmNewPassword', 'New Password and Confirm New Password must be the same.'));
    }    

    // Generate SHA256 hash for the user automatically.
    const hashedPassword = await sha256.hash(req.body.newPassword);    

    const change = {
      passwordHash: hashedPassword.toUpperCase()
    };
    
    const updatedMember = await User.update(user._id, change);

    if (updatedMember){
      // Audit trail.
      const action = `${user.username} changed the password. Old password hash: ${currentPasswordHash}`;
      await createServerAudit(user._id, user.username, req.ip, action);

      // Force the user to log out.
      globals.BlacklistedTokens.push(jwtString);

      res.status(200);
      res.json({
        success: true,
        message: 'Password changed. Redirecting to login page...',
        redirectUrl: '/login'
      });
    }
    else {
      await logger.warn(`Unable to change password for ${user.username}.`);

      res.status(500);
      res.json({
        success: false,
        message: 'Unable to change password.'
      });
    }
  }
  catch (err) {
    await logger.error(err);
    console.log(err);

    res.status(500).json({
      success: false,
      message: 'Something went wrong!'
    });
  }
}

async function searchMember (req, res, next){
  try {    
    const jwtString = req.headers.authorization || req.cookies.jwt;
    // Username maybe retrieved from JWT string but the user could have been deleted.
    const username = await auth.getUsernameFromToken(jwtString);
    const user = await User.get(username);

    if (!user){
      res.redirect('/login');
      return;
    }

    let searchUsername = trimIfNotEmpty(req.body.username) || '';
    let searchRole = trimIfNotEmpty(req.body.role) || '';
    let searchStatus = trimIfNotEmpty(req.body.status) || '';
    
    searchUsername = utils.sanitizeHTML(searchUsername);
    searchRole = utils.sanitizeHTML(searchRole);
    searchStatus = utils.sanitizeHTML(searchStatus);
    
    if (!globals.RoleFromNameLookup[searchRole]){
      searchRole = '';
    }
    
    if (!globals.ValidMemberStatuses.includes(searchStatus)){
      searchStatus = '';
    }
    
    res.status(200).json({
      success: true,
      redirectUrl: `/member/list/?page=1&username=${encodeURIComponent(searchUsername)}&rolename=${encodeURIComponent(searchRole)}&status=${encodeURIComponent(searchStatus)}`
    });
  }
  catch (err) {
    console.log(err);
    await logger.error(err);
    res.status(500);
    res.render('500', { 'title': 'Something went wrong!' });
  }
}


async function getMemberListPage(req, res, next){
  try {       
    const jwtString = req.headers.authorization || req.cookies.jwt;
    const username = await auth.getUsernameFromToken(jwtString);
    const user = await User.get(username);

    if (!user){
      res.redirect('/login');
      return;
    }
      
    const filter = {};
    let queryUsername = trimIfNotEmpty(req.query.username);

    if (queryUsername){
      queryUsername = utils.sanitizeHTML(queryUsername);

      logger.info(`Username filter: ${queryUsername}`);

      // https://stackoverflow.com/questions/16560291/searching-string-with-special-characters-in-mongodb-document
      // Escape all regex special characters:
      const modifiedUsername = queryUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Having problem with names which contain special characters like "[".
      filter.username = {
        '$regex': modifiedUsername,
        '$options': 'i' // Case-insensitive
      };

      // Exact match.
      //filter.username = `${req.query.username}`;
    }

    let queryRole = trimIfNotEmpty(req.query.rolename);
    if (queryRole){
      queryRole = utils.sanitizeHTML(queryRole);
            
      if (globals.RoleFromNameLookup[queryRole]){
        const modifiedRole = queryRole.replace(/[.*+?^${}|[\]\\]/g, '\\$&');
      
        // Exact match.
        filter.role = modifiedRole;
      }      
    }

    let queryStatus = trimIfNotEmpty(req.query.status);
    if (queryStatus){
      queryStatus = utils.sanitizeHTML(queryStatus);
      
      if (globals.ValidMemberStatuses.includes(queryStatus)){
        const modifiedStatus = queryStatus.replace(/[.*+?^${}|[\]\\]/g, '\\$&');
      
        // Exact match.
        filter.status = modifiedStatus;
      }      
    }
  
    const limit = config.memberList.pageSize ? config.memberList.pageSize : 10;    
    const totalRecords = await User.getCount(filter);
    const totalPages = Math.ceil(totalRecords / limit);

    // Pagination.    
    let page = parseInt(req.query.page);

    if (isNaN(page)){
      page = 1;
    }
    else {
      if (page < 1 || page > totalPages){
        page = 1;      
      }
    }
    
    let members = await User.list(page, limit, filter);    

    const userRoleValue = getRoleValueFromName(user.role);
    const isDev = isDeveloper(user.role);    
    const minRoleValueToViewMemberCountry = getRoleValueFromName(globals.Settings.minRoleToViewMemberCountry) || globals.MaxRoleValue;    
    const minRoleValueToEditMemberUsername = getRoleValueFromName(globals.Settings.minRoleToEditMemberUsername) || globals.MaxRoleValue;
    const minRoleValueToEditMemberPasswordHash = getRoleValueFromName(globals.Settings.minRoleToEditMemberPasswordHash) || globals.MaxRoleValue;
    const minRoleValueToEditMemberRole = getRoleValueFromName(globals.Settings.minRoleToEditMemberRole) || globals.MaxRoleValue;
    const minRoleValueToEditMemberStatus = getRoleValueFromName(globals.Settings.minRoleToEditMemberStatus) || globals.MaxRoleValue; 

    const hasEditPermission = (userRoleValue >= minRoleValueToEditMemberUsername ||
      userRoleValue >= minRoleValueToEditMemberPasswordHash ||
      userRoleValue >= minRoleValueToEditMemberRole ||
      userRoleValue >= minRoleValueToEditMemberStatus
    );

    user.roleValue = userRoleValue;
    
    members = members.map((member) => {
      const memberRoleValue = getRoleValueFromName(member.role);
      member.canBeEdited = false;

      if (isDev){
        member.canBeEdited = true;
      } 
      else {
        if (user.id !== member.id &&
            userRoleValue > memberRoleValue &&
            hasEditPermission) {
          member.canBeEdited = true;
        }      
      }
            
      member.roleColor = getRoleColorFromName(member.role);
      member.statusColor = config.statusColors[member.status];
            
      return member;
    });
    
    user.canViewCountry = isDev || userRoleValue >= minRoleValueToViewMemberCountry;    
    
    res.render('member-list', {
      title: 'Members',
      // Currently authenticated user.
      user: user,
      members: members,
      pageCount: totalPages,
      totalRecords: totalRecords,
      currentPage: page,
      username: queryUsername,
      roleName: queryRole,
      status: queryStatus,
      roles: [...globals.AllRoles],      
      validStatuses: globals.ValidMemberStatuses
    });
  }
  catch (err){
    await logger.error(err);
    res.status(500);
    res.render('500', { 'title': 'Something went wrong!' });
  }  
}



async function getRoleListPage (req, res, next){
  try {       
    const jwtString = req.headers.authorization || req.cookies.jwt;
    const username = await auth.getUsernameFromToken(jwtString);
    const user = await User.get(username);

    if (!user){
      res.redirect('/login');
      return;
    }
    
    // =================================================================================
    const filter = {};
    if (req.query.rolename){          
      // https://stackoverflow.com/questions/16560291/searching-string-with-special-characters-in-mongodb-document
      // Escape all regex special characters:
      const modifiedRoleName = req.query.rolename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Having problem with names which contain special characters like "[".
      filter.name = {
        '$regex': modifiedRoleName,
        '$options': 'i' // Case-insensitive
      };
    }
  
    const limit = globals.Settings.roleListingPageSize || 15;
    const totalRecords = await Role.getCount(filter);
    const totalPages = Math.ceil(totalRecords / limit);

    // Pagination.    
    let page = parseInt(req.query.page);

    if (isNaN(page)){
      page = 1;
    }
    else {
      if (page < 1 || page > totalPages){
        page = 1;      
      }
    }
                
    let roles = await Role.list(page, limit, filter);
    const userRoleValue = getRoleValueFromName(user.role);
    const isDev = isDeveloper(user.role);
    const minRoleValueToManageRole = getRoleValueFromName(globals.Settings.minRoleToManageRole) || globals.MaxRoleValue;

    roles = roles.map((role) => {
      role.canBeEdited = isDev || (
        userRoleValue >= minRoleValueToManageRole &&
        userRoleValue > role.value &&
        role.locked === false
      );
      return role;
    });
        
    res.render('role-list', {
      title: 'Roles',
      // Currently authenticated user.
      user: user,
      roles: roles,
      pageCount: totalPages,
      totalRecords: totalRecords,
      currentPage: page,
      roleName: req.query.rolename      
    });
  }
  catch (err){
    await logger.error(err);
    res.status(500);
    res.render('500', { 'title': 'Something went wrong!' });
  }  
}

async function getRoleViewPage (req, res, next){
  try {
    const jwtString = req.headers.authorization || req.cookies.jwt;
    const username = await auth.getUsernameFromToken(jwtString);

    if (!username){
      return res.status(403).json({
        success: false,
        message: 'Unauthorized.',
      });
    }
        
    const { id } = req.params;
    const user = await User.get(username);      
    const role = await Role.getById(id);

    if (!role){
      return res.status(404).render('404', {
        title: 'Role Not Found'
      });      
    }

    const isDev = isDeveloper(user.role);      
    const userRoleValue = getRoleValueFromName(user.role);
    const minRoleValueToManageRole = getRoleValueFromName(globals.Settings.minRoleToManageRole) || globals.MaxRoleValue;
    const minRoleValueToDeleteRole = getRoleValueFromName(globals.Settings.minRoleToDeleteRole) || globals.MaxRoleValue;
          
    user.canEditRole = isDev || (
      userRoleValue >= minRoleValueToManageRole &&
      userRoleValue > role.value &&
      role.locked === false
    );

    user.canDeleteRole = isDev || (
      userRoleValue >= minRoleValueToDeleteRole &&
      userRoleValue > role.value &&
      role.locked === false
    );
          
    const lastUpdatedByUser = await User.getById(role.lastUpdatedBy);
    if (lastUpdatedByUser){
      role.lastUpdatedByUsername = lastUpdatedByUser.username;
    }

    res.render('role-view', {
      title: 'Role Details',
      user: user,
      role: role        
    });    
  }
  catch (err){
    res.render('500', {
      title: 'Internal Server Error'
    });
  }
}

async function getRoleEditPage (req, res, next){
  try {
    const jwtString = req.headers.authorization || req.cookies.jwt;
    const username = await auth.getUsernameFromToken(jwtString);

    if (!username){
      return res.status(403).json({
        success: false,
        message: 'Unauthorized.',
      });
    }
        
    const { id } = req.params;
    const user = await User.get(username);

    if (user.status !== globals.ActiveStatus){
      await createServerAudit(user._id, user.username, req.ip, `Inactive user ${user.username} tried to access Role Edit page.`);

      return res.status(403).render('unauthorized', {
        title: 'Unauthorized'
      });
    }

    const role = await Role.getById(id);

    if (!role){
      res.status(404);
      res.render('404', {
        title: 'Role Not Found'
      });
      return;
    }
    
    const isDev = isDeveloper(user.role);
    const userRoleValue = getRoleValueFromName(user.role);
    const minRoleValueToManageRole = getRoleValueFromName(globals.Settings.minRoleToManageRole) || globals.MaxRoleValue;

    const canViewEditPage = isDev || (
      userRoleValue >= minRoleValueToManageRole &&
      userRoleValue > role.value &&
      role.locked === false
    );

    let allowedRoleValues = [];

    if (isDev){
      allowedRoleValues = generateRoleValuesBelow(globals.MaxRoleValue);
    } else {
      allowedRoleValues = generateRoleValuesBelow(userRoleValue);
    }

    if (canViewEditPage){
      return res.render('role-edit', {
        title: 'Edit Role',
        user: user,
        role: role,
        allowedRoleValues: allowedRoleValues
      });
    }
    else {
      return res.status(403).render('unauthorized', {
        title: 'Unauthorized'
      });
    }
  }
  catch (err){
    console.log(err);
    res.render('500', {
      title: 'Internal Server Error'
    });
  }
}

async function getRoleNewPage (req, res, next){
  try {
    const jwtString = req.headers.authorization || req.cookies.jwt;
    // Username maybe retrieved from JWT string but the user could have been deleted.
    const username = await auth.getUsernameFromToken(jwtString);
    const user = await User.get(username);

    if (user){
      const userRoleValue = getRoleValueFromName(user.role);
      const minRoleValueToManageRole = getRoleValueFromName(globals.Settings.minRoleToManageRole) || globals.MaxRoleValue;
      const canCreateRole = isDeveloper(user.role) || (userRoleValue >= minRoleValueToManageRole);

      if (canCreateRole){        
        const allowedRoleValues = generateRoleValuesBelow(userRoleValue);
                        
        res.render('role-create', {
          title: 'New Role',
          user: user,          
          allowedRoleValues: allowedRoleValues
        });
      } else {
        return res.status(403).render('unauthorized', {
          title: 'Unauthorized'
        });        
      }      
    }
    else {      
      res.redirect('/login');
    }
  }
  catch (err) {
    await logger.error(err);
    res.status(500);
    res.render('500', { 'title': 'Something went wrong!' });
  }
}


async function getRoleDeletePage (req, res, next){
  try {
    const jwtString = req.headers.authorization || req.cookies.jwt;
    const username = await auth.getUsernameFromToken(jwtString);

    if (username){
      const { id } = req.params;
      const user = await User.get(username);

      if (user.status !== globals.ActiveStatus){
        await createServerAudit(user._id, user.username, req.ip, `Inactive user ${user.username} tried to access Role Delete page.`);
        
        return res.render('unauthorized', {
          title: 'Unauthorized'
        });        
      }

      const role = await Role.getById(id);

      if (!role){
        return res.render('404', {
          title: 'Role Not Found'
        });        
      }

      const isDev = isDeveloper(user.role);      
      const userRoleValue = getRoleValueFromName(user.role);
      const minRoleValueToDeleteRole = getRoleValueFromName(globals.Settings.minRoleToDeleteRole) || globals.MaxRoleValue;

      user.canDeleteRole = isDev || (
        userRoleValue >= minRoleValueToDeleteRole &&
        userRoleValue > role.value &&
        role.locked === false
      );

      if (user.canDeleteRole){
        return res.render('role-delete', {
          title: 'Role Details (Delete Page)',
          user: user,
          role: role        
        });
      } else {
        return res.render('unauthorized', {
          title: 'Unauthorized'
        });        
      }
    }
  }
  catch (err){
    res.render('500', {
      title: 'Internal Server Error'
    });
  }
}


// ======================================================
// Changing role name may cause unforseen side effects.
// ======================================================
async function updateRole(req, res, next){ 
  try {
    // ==================================================
    // Check required fields.
    // ==================================================
    // Role Name.
    req.body.roleName = trimIfNotEmpty(req.body.roleName);    
    if (!checkRequiredString(req.body.roleName)){
      return res.status(400).json(createValidationMessage('roleName', 'Role Name is required.'));      
    }
    req.body.roleName = utils.sanitizeHTML(req.body.roleName);

    // Role Color.
    req.body.roleColor = trimIfNotEmpty(req.body.roleColor);          
    if (!checkRequiredString(req.body.roleColor)){
      return res.status(400).json(createValidationMessage('roleColor', 'Role Color is required.'));
    }
    req.body.roleColor = utils.sanitizeHTML(req.body.roleColor);

    // Role Value..
    req.body.roleValue = trimIfNotEmpty(req.body.roleValue);    
    if (!checkRequiredString(req.body.roleValue)){
      return res.status(400).json(createValidationMessage('roleValue', 'Value is required.'));      
    }

    const roleValue = parseInt(req.body.roleValue);
    if (isNaN(roleValue)){
      return res.status(400).json(createValidationMessage('roleValue', 'Value must be a number.'));      
    }

    if (roleValue < globals.MinRoleValue || roleValue > globals.MaxRoleValue){
      const msg = `Value must be between ${globals.MinRoleValue} and ${globals.MaxRoleValue}.`;
      return res.status(400).json(createValidationMessage('roleValue', msg));
    }

    if (roleValue % 10 !== 0){
      const msg = `Value must be a multiple of ${globals.RoleValueInterval}.`;
      return res.status(400).json(createValidationMessage('roleValue', msg));
    }
    
    // =====================================================================================================
    // Check role name length and format (i.e. alphabets and spaces only).
    // =====================================================================================================
    const minRoleNameLen = globals.MinRoleNameLength;
    const maxRoleNameLen = globals.MaxRoleNameLength;

    if (req.body.roleName.length < minRoleNameLen || req.body.roleName.length > maxRoleNameLen){
      const msg = `Role Name must be between ${minRoleNameLen} and ${maxRoleNameLen} characters.`;
      return res.status(400).json(createValidationMessage('roleName', msg));
    }
    
    const roleNameRegex = globals.RoleNameRegEx;

    if (!roleNameRegex.test(req.body.roleName)){
      const msg = 'Role Name must be alphabets and single space only.';
      return res.status(400).json(createValidationMessage('roleName', msg));
    }
           
    // Make sure the color is a valid hex value.
    const isValidRoleColor = await utils.isHexColorString(req.body.roleColor);

    if (!isValidRoleColor){
      return res.status(400).json(createValidationMessage('roleColor', 'Role color must be a hex color code.'));    
    }

    // =====================================================================================================
    // Check valid values for permissions.
    // =====================================================================================================
    const permissionProps = [];
    permissionProps.push({ name: 'Warn', key: 'permWarn', value: parseInt(req.body.permWarn) });
    permissionProps.push({ name: 'Mute', key: 'permMute', value: parseInt(req.body.permMute) });
    permissionProps.push({ name: 'Unmute', key: 'permUnmute', value: parseInt(req.body.permUnmute) });
    permissionProps.push({ name: 'Kill', key: 'permKill', value: parseInt(req.body.permKill) });
    permissionProps.push({ name: 'Kick Dead', key: 'permKickDead', value: parseInt(req.body.permKickDead) });
    permissionProps.push({ name: 'Kick Specs', key: 'permKickSpecs', value: parseInt(req.body.permKickSpecs) });
    permissionProps.push({ name: 'Kick', key: 'permKick', value: parseInt(req.body.permKick) });
    permissionProps.push({ name: 'Broadcast', key: 'permBroadcast', value: parseInt(req.body.permBroadcast) });
    permissionProps.push({ name: 'Food', key: 'permToggleFood', value: parseInt(req.body.permToggleFood) });
    permissionProps.push({ name: 'Temp Ban', key: 'permTempBan', value: parseInt(req.body.permTempBan) });
    permissionProps.push({ name: 'ASN Ban', key: 'permASNBan', value: parseInt(req.body.permASNBan) });
    permissionProps.push({ name: 'Clear Ban List', key: 'permClearBanList', value: parseInt(req.body.permClearBanList) });
    permissionProps.push({ name: 'ASN Mute', key: 'permASNMute', value: parseInt(req.body.permASNMute) });
    permissionProps.push({ name: 'ASN Unmute', key: 'permASNUnmute', value: parseInt(req.body.permASNUnmute) });

    permissionProps.push({ name: 'ASN Add', key: 'permASNAdd', value: parseInt(req.body.permASNAdd) });
    permissionProps.push({ name: 'Restart Server', key: 'permRestartServer', value: parseInt(req.body.permRestartServer) });
    permissionProps.push({ name: 'VPN Command', key: 'permVPNCommand', value: parseInt(req.body.permVPNCommand) });
    permissionProps.push({ name: 'Map Command', key: 'permMapCommand', value: parseInt(req.body.permMapCommand) });
    
    for (const prop of permissionProps){    
      if (!isNaN(prop.value)) {
        if (!isInRange(prop.value, globals.MinPermissionValue, globals.MaxPermissionValue)) {
          return res.status(400).json(createValidationMessage(prop.key, `${prop.name} value must be between ${globals.MinPermissionValue} and ${globals.MaxPermissionValue}.`));
        }
      }  
    }
    // ==============================================================================
      
    const roleProps = {
      name: req.body.roleName,
      color: req.body.roleColor,
      value: roleValue,      
    };

    for (const prop of permissionProps){
      if (!isNaN(prop.value)) {
        roleProps[prop.key] = prop.value;
      }  
    }  
      
    // =====================================================================================================
    const jwtString = req.headers.authorization || req.cookies.jwt;
    const username = await auth.getUsernameFromToken(jwtString);

    if (!username){
      return res.status(403).json({
        success: false,
        message: 'Unauthorized.',
      });
    }

    const role = await Role.getById(req.body._id);

    if (!role){
      return res.status(404).json({
        success: false,
        message: 'Role not found.',
      });
    }

    // ====================================================================================
    // Make sure the role name to be updated is not associated with any member or settings.
    // ====================================================================================
    if (role.name !== req.body.roleName){
      // =====================================================================================================
      // Make sure duplicate role name does not exist.
      // =====================================================================================================
      const filter = {
        name: {
          // https://stackoverflow.com/questions/16560291/searching-string-with-special-characters-in-mongodb-document
          // Escape all regex special characters:
          '$regex': req.body.roleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          '$options': 'i' // Case-insensitive
        }
      };
          
      const existingRoles = await Role.find(filter);
          
      for (const existingRole of existingRoles){
        if (existingRole.id !== role.id){
          return res.status(400).json(createValidationMessage('roleName', 'Duplicate role name.'));
        }      
      }
      // =====================================================================================================

      const roleInUseByMember = await User.anyExistsWithRoleName(role.name);
      if (roleInUseByMember){
        return res.status(400).json({ success: false, message: 'Role name cannot be updated as it is referenced by at least one member.' });
      }
      
      let roleInUseBySettings = false;
      for (const prop in globals.Settings){
        //if (globals.Settings.hasOwnProperty(prop))
        {
          if (globals.Settings[prop] === role.name){
            roleInUseBySettings = true;
            break;
          }
        }
      }

      if (roleInUseBySettings){
        return res.status(400).json({ success: false, message: 'Role name cannot be updated as it is referenced by settings.' });
      }
    }    
    // ====================================================================================

    const user = await User.get(username);
    const isDev = isDeveloper(user.role);

    if (!isDev && user.status !== globals.ActiveStatus){
      await createServerAudit(user._id, user.username, req.ip, `Inactive user ${user.username} tried to update role ${role.name}.`);

      return res.status(403).json({
        success: false,
        message: 'Unauthorized.',
      });    
    }
    
    if (isDev){
      try {
        if (req.body.hasOwnProperty('locked')){
          roleProps.locked = req.body.locked;
        }

        roleProps.maxMemberUsernameUpdate = parseInt(req.body.maxMemberUsernameUpdate);
        roleProps.maxMemberPasswordHashUpdate = parseInt(req.body.maxMemberPasswordHashUpdate);
        roleProps.maxMemberRoleUpdate = parseInt(req.body.maxMemberRoleUpdate);
        roleProps.maxMemberStatusUpdate = parseInt(req.body.maxMemberStatusUpdate);
        roleProps.maxMemberDelete = parseInt(req.body.maxMemberDelete);
      } catch (innerErr){
        await logger.error(innerErr);
      }      
    }

    const userRoleValue = getRoleValueFromName(user.role);
    const minRoleValueToManageRole = getRoleValueFromName(globals.Settings.minRoleToManageRole) || globals.MaxRoleValue;

    const canEditRole = isDev || (
      userRoleValue >= minRoleValueToManageRole &&
      userRoleValue > role.value &&
      role.locked === false
    );

    if (canEditRole){
      if (!isDev && roleValue > userRoleValue){
        return res.status(400).json(createValidationMessage('roleValue', 'Value cannot be greater than your role value.'));      
      }
                 
      roleProps.lastUpdatedBy = user.id;
      roleProps.lastUpdatedDate = new Date();
      const updatedRole = await Role.update(role._id, roleProps);

      if (updatedRole){
        await populateRoleLookups();

        // Audit trail.
        const action = `${user.username} updated role ${role.name}.`;
        await createServerAudit(user._id, user.username, action);
        // ===========================================================================================================
        return res.status(200).json({
          success: true,
          message: 'Role updated.',
          redirectUrl: `/role/view/${role._id}`
        });
      }
      else {
        await logger.warn(`Unable to update ${role.name}.`);

        return res.status(500).json({
          success: false,
          message: 'Unable to update role.'
        });
      }
    }
    else {
      await createServerAudit(user._id, user.username, req.ip, `User ${user.username} tried to update the role ${role.name}.`);

      return res.status(403).json({
        success: false,
        message: 'Unauthorized.'
      });
    }
  }
  catch (err) {
    console.log(err);
    await logger.error(err);
    
    res.status(500).json({
      success: false,
      message: 'Something went wrong!'
    });
  }    
}


async function createRole(req, res, next){  
  try {
    // =====================================================================================================
    // Check required fields.
    // =====================================================================================================
    // Role Name.
    req.body.roleName = trimIfNotEmpty(req.body.roleName);    
    if (!checkRequiredString(req.body.roleName)){
      return res.status(400).json(createValidationMessage('roleName', 'Role Name is required.'));      
    }
    req.body.roleName = utils.sanitizeHTML(req.body.roleName);

    // Role Color.
    req.body.roleColor = trimIfNotEmpty(req.body.roleColor);          
    if (!checkRequiredString(req.body.roleColor)){
      return res.status(400).json(createValidationMessage('roleColor', 'Role Color is required.'));
    }
    req.body.roleColor = utils.sanitizeHTML(req.body.roleColor);

    // Role Value..
    req.body.roleValue = trimIfNotEmpty(req.body.roleValue);    
    if (!checkRequiredString(req.body.roleValue)){
      return res.status(400).json(createValidationMessage('roleValue', 'Value is required.'));      
    }

    const roleValue = parseInt(req.body.roleValue);
    if (isNaN(roleValue)){
      return res.status(400).json(createValidationMessage('roleValue', 'Value must be a number.'));      
    }

    if (roleValue < globals.MinRoleValue || roleValue > globals.MaxRoleValue){
      const msg = `Value must be between ${globals.MinRoleValue} and ${globals.MaxRoleValue}.`;
      return res.status(400).json(createValidationMessage('roleValue', msg));
    }

    if (roleValue % 10 !== 0){
      const msg = `Value must be a multiple of ${globals.RoleValueInterval}.`;
      return res.status(400).json(createValidationMessage('roleValue', msg));
    }
   
    // =====================================================================================================
    // Check role name length and format (i.e. alphabets and spaces only).
    // =====================================================================================================
    const minRoleNameLen = globals.MinRoleNameLength; // 3;
    const maxRoleNameLen = globals.MaxRoleNameLength; // 30;

    if (req.body.roleName.length < minRoleNameLen || req.body.roleName.length > maxRoleNameLen){
      const msg = `Role Name must be between ${minRoleNameLen} and ${maxRoleNameLen} characters.`;
      return res.status(400).json(createValidationMessage('roleName', msg));
    }
    
    const roleNameRegex = globals.RoleNameRegEx;

    if (!roleNameRegex.test(req.body.roleName)){
      const msg = 'Role Name must be alphabets and single space only.';
      return res.status(400).json(createValidationMessage('roleName', msg));
    }

    // =====================================================================================================
    // Make sure duplicate role name does not exist.
    // =====================================================================================================
    const filter = {
      name: {
        // https://stackoverflow.com/questions/16560291/searching-string-with-special-characters-in-mongodb-document
        // Escape all regex special characters:
        '$regex': req.body.roleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        '$options': 'i' // Case-insensitive
      }
    };
        
    const existingRolesCount = await Role.getCount(filter);
        
    if (existingRolesCount > 0){
      return res.status(400).json(createValidationMessage('roleName', 'Duplicate role name.'));
    }      

    // // =====================================================================================================
    // // Make sure the role name does not exist (case sensitive).
    // // =====================================================================================================
    // const existingRole = await Role.get(req.body.roleName);
    
    // if (existingRole && existingRole._id) {
    //   return res.status(400).json(createValidationMessage('roleName', 'Role Name already exists.'));
    // }
    
    // Make sure the color is a valid hex value.
    const isValidRoleColor = await utils.isHexColorString(req.body.roleColor);

    if (!isValidRoleColor){
      return res.status(400).json(createValidationMessage('roleColor', 'Role color must be a hex color code.'));    
    }

    // =====================================================================================================
    // Check permission values.
    // =====================================================================================================
    const permissionProps = [];
    permissionProps.push({ name: 'Warn', key: 'permWarn', value: parseInt(req.body.permWarn) });
    permissionProps.push({ name: 'Mute', key: 'permMute', value: parseInt(req.body.permMute) });
    permissionProps.push({ name: 'Unmute', key: 'permUnmute', value: parseInt(req.body.permUnmute) });
    permissionProps.push({ name: 'Kill', key: 'permKill', value: parseInt(req.body.permKill) });
    permissionProps.push({ name: 'Kick Dead', key: 'permKickDead', value: parseInt(req.body.permKickDead) });
    permissionProps.push({ name: 'Kick Specs', key: 'permKickSpecs', value: parseInt(req.body.permKickSpecs) });
    permissionProps.push({ name: 'Kick', key: 'permKick', value: parseInt(req.body.permKick) });
    permissionProps.push({ name: 'Broadcast', key: 'permBroadcast', value: parseInt(req.body.permBroadcast) });
    permissionProps.push({ name: 'Food', key: 'permToggleFood', value: parseInt(req.body.permToggleFood) });
    permissionProps.push({ name: 'Temp Ban', key: 'permTempBan', value: parseInt(req.body.permTempBan) });
    permissionProps.push({ name: 'ASN Ban', key: 'permASNBan', value: parseInt(req.body.permASNBan) });
    permissionProps.push({ name: 'Clear Ban List', key: 'permClearBanList', value: parseInt(req.body.permClearBanList) });
    permissionProps.push({ name: 'ASN Mute', key: 'permASNMute', value: parseInt(req.body.permASNMute) });
    permissionProps.push({ name: 'ASN Unmute', key: 'permASNUnmute', value: parseInt(req.body.permASNUnmute) });

    for (const prop of permissionProps){    
      if (!isNaN(prop.value)) {
        if (!isInRange(prop.value, globals.MinPermissionValue, globals.MaxPermissionValue)) {
          return res.status(400).json(createValidationMessage(prop.key, `${prop.name} value must be between ${globals.MinPermissionValue} and ${globals.MaxPermissionValue}.`));
        }
      }  
    }
    // ==============================================================================

    const roleProps = {
      name: req.body.roleName,
      color: req.body.roleColor,
      value: roleValue,
      // minRoleValueToEdit: minRoleValueToEdit
    };

    for (const prop of permissionProps){
      if (!isNaN(prop.value)) {
        roleProps[prop.key] = prop.value;
      }  
    }  
    
    // =====================================================================================================
    const jwtString = req.headers.authorization || req.cookies.jwt;
    const username = await auth.getUsernameFromToken(jwtString);

    if (!username){
      return res.status(403).json({
        success: false,
        message: 'Unauthorized.',
      });
    }
    
    const user = await User.get(username);
    const isDev = isDeveloper(user.role);

    if (!isDev && user.status !== globals.ActiveStatus){
      await createServerAudit(user._id, user.username, req.ip, `Inactive user ${user.username} tried to create role ${roleProps.name}.`);

      return res.status(403).json({
        success: false,
        message: 'Unauthorized.',
      });    
    }
                  
    const userRoleValue = getRoleValueFromName(user.role);
    const minRoleValueToManageRole = getRoleValueFromName(globals.Settings.minRoleToManageRole) || globals.MaxRoleValue;
    // Dev or owner and above.
    const canCreateRole = isDev || (userRoleValue >= minRoleValueToManageRole);
    
    if (canCreateRole){
      if (roleValue > userRoleValue){
        return res.status(400).json(createValidationMessage('roleValue', 'Value cannot be greater than your role value.'));      
      }

      try {
        if (isDev){
          roleProps.maxMemberUsernameUpdate = parseInt(req.body.maxMemberUsernameUpdate);
          roleProps.maxMemberPasswordHashUpdate = parseInt(req.body.maxMemberPasswordHashUpdate);
          roleProps.maxMemberRoleUpdate = parseInt(req.body.maxMemberRoleUpdate);
          roleProps.maxMemberStatusUpdate = parseInt(req.body.maxMemberStatusUpdate);
          roleProps.maxMemberDelete = parseInt(req.body.maxMemberDelete);    
        } else {
          // Do not give permissions for lower-ranked roles.
          if (roleValue >= 800) {
            roleProps.maxMemberRoleUpdate = config.memberEdit.maxDailyRoleUpdateUsage;
            roleProps.maxMemberStatusUpdate = config.memberEdit.maxDailyStatusUpdateUsage;
            roleProps.maxMemberDelete = config.memberEdit.maxDailyDeleteUsage;
          }
        }        
      } catch (innerErr){
        await logger.error(innerErr);
      }      
      
      roleProps.createdBy = user.id;
      const createdRole = await Role.create(roleProps);

      if (createdRole){        
        await populateRoleLookups();

        // Audit trail.
        const action = `${user.username} created a new role ${createdRole.name}.`;
        await createServerAudit(user._id, user.username, action);
        // ===========================================================================================================
        return res.status(200).json({
          success: true,
          message: 'Role created.',
          redirectUrl: `/role/view/${createdRole._id}`
        });
      }
      else {
        await logger.warn(`Unable to create ${roleProps.name}.`);

        return res.status(500).json({
          success: false,
          message: 'Unable to create role.'
        });
      }
    }
    else {
      await createServerAudit(user._id, user.username, req.ip, `User ${user.username} tried to create the role ${roleProps.name}.`);

      return res.status(403).json({
        success: false,
        message: 'Unauthorized.'
      });
    }
  }
  catch (err) {
    await logger.error(err);
    res.status(500).json({
      success: false,
      message: 'Something went wrong!'
    });
  }  
}


async function deleteRole(req, res, next){
  try {
    const jwtString = req.headers.authorization || req.cookies.jwt;
    const username = await auth.getUsernameFromToken(jwtString);

    if (username){
      const role = await Role.getById(req.body._id);

      if (!role){
        return res.status(404).json({
          success: false,
          message: 'Role not found.',
        });        
      }

      const user = await User.get(username);

      if (user.status !== globals.ActiveStatus){
        await createServerAudit(user._id, user.username, req.ip, `Inactive user ${user.username} tried to delete role ${role.name}.`);
        return res.status(403).render('unauthorized', { title: 'Unauthorized' });
      }
            
      const userRoleValue = getRoleValueFromName(user.role);  
      const minRoleValueToDeleteRole = getRoleValueFromName(globals.Settings.minRoleToDeleteRole) || globals.MaxRoleValue;
      const canDeleteRole = isDeveloper(user.role) || (        
        userRoleValue >= minRoleValueToDeleteRole &&
        userRoleValue > role.value &&
        role.locked === false
      );

      if (!canDeleteRole) {
        await createServerAudit(user._id, user.username, req.ip, `Unauthorized user ${user.username} tried to delete the role ${role.name}.`);

        return res.status(403).json({
          success: false,
          message: 'Unauthorized.'
        });        
      }

      // ====================================================================================
      // Make sure the role to be deleted is not associated with any member or settings.
      // ====================================================================================
      const roleInUseByMember = await User.anyExistsWithRoleName(role.name);
      if (roleInUseByMember){
        return res.status(400).json({ success: false, message: 'Role cannot be deleted as it is referenced by at least one member.' });
      }
      
      let roleInUseBySettings = false;
      for (const prop in globals.Settings){
        //if (globals.Settings.hasOwnProperty(prop))
        {
          if (globals.Settings[prop] === role.name){
            roleInUseBySettings = true;
            break;
          }
        }
      }

      if (roleInUseBySettings){
        return res.status(400).json({ success: false, message: 'Role cannot be deleted as it is referenced by settings.' });
      }
      
      await Role.removeById(role.id);
      await populateRoleLookups();
      const action = `${user.username} deleted the role ${role.name} (id: ${role.id}).`;
      await createServerAudit(user.id, user.username, action);
      
      return res.status(200).json({
        success: true,
        message: 'Role deleted.',
        redirectUrl: `/role/list`
      });
    }
  }
  catch (err){
    await logger.error(err);

    return res.status(500).json({
      success: false,
      message: 'Unable to delete role.'
    });
  }
}


async function searchRoles(req, res, next){
  try {    
    const jwtString = req.headers.authorization || req.cookies.jwt;
    // Username maybe retrieved from JWT string but the user could have been deleted.
    const username = await auth.getUsernameFromToken(jwtString);
    const user = await User.get(username);

    if (!user){
      res.redirect('/login');
      return;
    }

    let roleName = trimIfNotEmpty(req.body.roleName);
    
    if (roleName && roleName.length > 0){
      roleName = utils.sanitizeHTML(roleName);      

      res.status(200).json({
        success: true,        
        redirectUrl: `/role/list/?page=1&rolename=${encodeURIComponent(roleName)}`
      });
    }
    else {      
      res.status(200).json({
        success: true,
        redirectUrl: '/role/list/?page=1'
      });      
    }
  }
  catch (err) {
    await logger.error(err);
    res.status(500);
    res.render('500', { 'title': 'Something went wrong!' });
  }
}

// =========================================================================
// Helper functions.
// =========================================================================
function isInRange(value, min, max){
  return (value >= min && value <= max);
}

function isDeveloper (roleName){
  return (roleName === 'Developer');
}

function getRoleValueFromName (roleName){
  let roleValue = 0;
    
  // const foundRole = allRoles.find(role => role.name === roleName);
  const foundRole = globals.RoleFromNameLookup[roleName];

  if (foundRole){
    roleValue = foundRole.value;
  }

  return roleValue;
}

function getRoleNameFromValue (roleValue){
  let roleName = null;
  
  const foundRole = globals.AllRoles.find(role => role.value === roleValue);  

  if (foundRole){
    roleName = foundRole.name;    
  }  

  return roleName;
}

function getRoleColorFromName (roleName){
  let roleColor = '#ffffff';    
  // const foundRole = allRoles.find(role => role.name === roleName);
  const foundRole = globals.RoleFromNameLookup[roleName];

  if (foundRole){
    roleColor = foundRole.color;
  }

  return roleColor;
}

// Generates and returns a list of role values (in interval of 'roleValueInterval') below the provided role value.
function generateRoleValuesBelow (roleValue){  
  const roleValuesBelow = [];

  for (let i=globals.MinRoleValue; i<roleValue; i+=globals.RoleValueInterval){
    roleValuesBelow.push(i);
  }  

  return roleValuesBelow;
}

// Returns a list of roles whose values are below the provided role value.
function getRolesBelow (roleValue){  
  const allRoles = [...globals.AllRoles];
  const belowRoles = [];

  for (const role of allRoles){
    if (role.value < roleValue){
      belowRoles.push(role);
    }
  }
  return belowRoles;
}
// =========================================================================


async function getSettingsViewPage (req, res, next){
  try {
    const jwtString = req.headers.authorization || req.cookies.jwt;
    const username = await auth.getUsernameFromToken(jwtString);

    if (username){
      const { id } = req.params;
      const user = await User.get(username);      
      const settings = await Settings.get(1);

      if (!settings){
        return res.status(404).render('404', {
          title: 'Settings Not Found'
        });
      }
      
      const isDev = isDeveloper(user.role);
      const userRoleValue = getRoleValueFromName(user.role);
      const minRoleValueToEditSettings = getRoleValueFromName(globals.Settings.minRoleToEditSettings) || globals.MaxRoleValue;
            
      user.canEditSettings = isDev || userRoleValue >= minRoleValueToEditSettings;
      
      const lastUpdatedByUser = await User.getById(settings.lastUpdatedBy);
      if (lastUpdatedByUser){
        settings.lastUpdatedByUsername = lastUpdatedByUser.username;
      }

      res.render('settings-view', {
        title: 'Settings',
        user: user,
        settings: settings
      });
    }
  }
  catch (err){
    res.render('500', {
      title: 'Internal Server Error'
    });
  }
}


async function getSettingsEditPage (req, res, next){
  try {
    const jwtString = req.headers.authorization || req.cookies.jwt;
    const username = await auth.getUsernameFromToken(jwtString);

    if (username){    
      const user = await User.get(username);

      if (user.status !== globals.ActiveStatus){
        await createServerAudit(user._id, user.username, req.ip, `Inactive user ${user.username} tried to access Settings Edit page.`);

        return res.status(403).render('unauthorized', {
          title: 'Unauthorized'
        });        
      }
      
      const settings = await Settings.get(1);

      if (!settings){
        return res.status(404).render('404', {
          title: 'Settings Not Found'
        });
      }
                  
      const isDev = isDeveloper(user.role);
      const userRoleValue = getRoleValueFromName(user.role);
      const minRoleValueToEditSettings = getRoleValueFromName(settings.minRoleToEditSettings) || globals.MaxRoleValue;
      const canViewEditPage = isDev || userRoleValue >= minRoleValueToEditSettings;
      
      if (canViewEditPage){        
        return res.render('settings-edit', {
          title: 'Edit Settings',
          user: user,
          settings: settings,
          roles: [...globals.AllRoles]
        });
      }    
    }  

    return res.status(403).render('unauthorized', {
      title: 'Unauthorized'
    });
  }
  catch (err){
    await logger.error(err);

    res.render('500', {
      title: 'Internal Server Error'
    });
  }
}


async function updateSettings (req, res, next){
  try {
    const jwtString = req.headers.authorization || req.cookies.jwt;
    const username = await auth.getUsernameFromToken(jwtString);
  
    if (!username){
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }
      
    const settings = await Settings.get(1);
  
    if (!settings){
      return res.status(404).render('404', {
        title: 'Settings Not Found'
      });      
    }

    const user = await User.get(username);

    if (user.status !== globals.ActiveStatus){
      await createServerAudit(user._id, user.username, req.ip, `Inactive user ${user.username} tried to update tank ${member.username}.`);

      return res.status(403).json({
        success: false,
        message: 'Unauthorized.',
      });      
    }
            
    const isDev = isDeveloper(user.role);
    const userRoleValue = getRoleValueFromName(user.role);
    const minRoleValueToEditSettings = getRoleValueFromName(settings.minRoleToEditSettings) || globals.MaxRoleValue;
    const canEdit = isDev || userRoleValue >= minRoleValueToEditSettings;
                        
    if (!canEdit){      
      return res.status(403).json({
        success: false,
        message: 'Unauthorized.',
      });
    }    
        
    const change = {};
    
    if (req.body.minRoleToViewMemberPasswordHash){
      if (globals.RoleFromNameLookup[req.body.minRoleToViewMemberPasswordHash]){
        change.minRoleToViewMemberPasswordHash = req.body.minRoleToViewMemberPasswordHash;    
      } else {
        return res.status(400).json(createValidationMessage('minRoleToViewMemberPasswordHash', 'Invalid role.'));      
      }
    }
    if (req.body.minRoleToViewMemberPasswordHash && globals.RoleFromNameLookup[req.body.minRoleToViewMemberPasswordHash]){
      change.minRoleToViewMemberPasswordHash = req.body.minRoleToViewMemberPasswordHash;    
    }

    if (req.body.minRoleToViewMemberCountry && globals.RoleFromNameLookup[req.body.minRoleToViewMemberCountry]){
      change.minRoleToViewMemberCountry = req.body.minRoleToViewMemberCountry;    
    }
        
    if (req.body.minRoleToEditMemberRole && globals.RoleFromNameLookup[req.body.minRoleToEditMemberRole]){
      change.minRoleToEditMemberRole = req.body.minRoleToEditMemberRole;    
    }

    if (req.body.minRoleToEditMemberStatus && globals.RoleFromNameLookup[req.body.minRoleToEditMemberStatus]){
      change.minRoleToEditMemberStatus = req.body.minRoleToEditMemberStatus;    
    }
    
    if (req.body.hasOwnProperty('allowMemberRegistration')){
      change.allowMemberRegistration = req.body.allowMemberRegistration;
    }

    if (req.body.hasOwnProperty('allowMapSubmission')){
      change.allowMapSubmission = req.body.allowMapSubmission;
    }

    if (req.body.hasOwnProperty('allowTankSubmission')){
      change.allowTankSubmission = req.body.allowTankSubmission;
    }    

    if (isDev){
      if (req.body.minRoleToDeleteMember && globals.RoleFromNameLookup[req.body.minRoleToDeleteMember]){
        change.minRoleToDeleteMember = req.body.minRoleToDeleteMember;    
      }
      
      if (req.body.minRoleToEditMemberUsername && globals.RoleFromNameLookup[req.body.minRoleToEditMemberUsername]){
        change.minRoleToEditMemberUsername = req.body.minRoleToEditMemberUsername;    
      }
  
      if (req.body.minRoleToEditMemberPasswordHash && globals.RoleFromNameLookup[req.body.minRoleToEditMemberPasswordHash]){
        change.minRoleToEditMemberPasswordHash = req.body.minRoleToEditMemberPasswordHash;    
      }

      if (req.body.minRoleToManageRole && globals.RoleFromNameLookup[req.body.minRoleToManageRole]){
        change.minRoleToManageRole = req.body.minRoleToManageRole;    
      }
  
      if (req.body.minRoleToDeleteRole && globals.RoleFromNameLookup[req.body.minRoleToDeleteRole]){
        change.minRoleToDeleteRole = req.body.minRoleToDeleteRole;    
      }

      if (req.body.minRoleToEditSettings && globals.RoleFromNameLookup[req.body.minRoleToEditSettings]){
        change.minRoleToEditSettings = req.body.minRoleToEditSettings;    
      }
    }    
    
    change.lastUpdatedBy = user.id;
    change.lastUpdatedDate = new Date();    
    
    const updatedSettings = await Settings.update(settings.id, change);

    if (updatedSettings){
      await populateSettings();
      // ===========================================================================================================
      // Audit trail.
      // ===========================================================================================================
      const action = `${user.username} (${user.id}) updated system settings.`;
      await createServerAudit(user.id, user.username, action);
      // ===========================================================================================================

      return res.status(200).json({
        success: true,
        message: 'Settings updated.',
        redirectUrl: `/settings/view`
      });
    }
    else {
      await logger.warn(`Unable to update system settings.`);

      return res.status(500).json({
        success: false,
        message: 'Unable to update system settings.'
      });
    }
  }
  catch (err){
    await logger.error(err);

    res.render('500', {
      title: 'Internal Server Error'
    });
  }
}


async function getServerAuditPage (req, res, next){
  const jwtString = req.headers.authorization || req.cookies.jwt;
  const username = await auth.getUsernameFromToken(jwtString);
  const user = await User.get(username);

  if (!user){
    res.redirect('/login');
    return;
  }
 
  const filter = {};
  if (req.query.keyword){
    logger.info(`Keyword filter: ${req.query.keyword}`);

    // https://stackoverflow.com/questions/16560291/searching-string-with-special-characters-in-mongodb-document
    // Escape all regex special characters:
    const modifiedKeyword = req.query.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Having problem with names which contain special characters like "[".
    filter.action = {
      '$regex': modifiedKeyword,
      '$options': 'i' // Case-insensitive
    };    
  }
  
  const limit = config.auditLog.pageSize ? config.auditLog.pageSize : 10;        
  const totalRecords = await ServerAudit.getCount(filter);
  const totalPages = Math.ceil(totalRecords / limit);
  
  // Pagination.    
  let page = parseInt(req.query.page);

  if (isNaN(page)){
    page = 1;
  }
  else {
    if (page < 1 || page > totalPages){
      page = 1;      
    }
  }
  
  let audits = await ServerAudit.list(page, limit, filter);
  
  const userRoleValue = getRoleValueFromName(user.role);  

  res.render('audit-server', {
    title: 'Server Audit Log',
    // Currently authenticated user.
    user: user,
    audits: audits,
    pageCount: totalPages,
    totalRecords: totalRecords,
    currentPage: page,
    keyword: req.query.keyword,
  });
}

async function searchServerAudit (req, res, next){
  try {    
    const jwtString = req.headers.authorization || req.cookies.jwt;
    // Username maybe retrieved from JWT string but the user could have been deleted.
    const username = await auth.getUsernameFromToken(jwtString);
    const user = await User.get(username);

    if (!user){
      res.redirect('/login');
      return;
    }

    let keyword = trimIfNotEmpty(req.body.keyword);

    if (keyword && keyword.length > 0){
      keyword = utils.sanitizeHTML(keyword);
      logger.info(`[Search Audit] ${username} searched for keyword ${keyword}.`);

      res.status(200).json({
        success: true,
        redirectUrl: `/audit/?page=1&keyword=${encodeURIComponent(keyword)}`
      });
    }
    else {      
      res.status(200).json({
        success: true,
        redirectUrl: '/audit/?page=1'
      });      
    }
  }
  catch (err) {
    await logger.error(err);
    res.status(500);
    res.render('500', { 'title': 'Something went wrong!' });
  }
}

// ============================================================================================================
async function getGameAuditPage (req, res, next){
  const jwtString = req.headers.authorization || req.cookies.jwt;
  const username = await auth.getUsernameFromToken(jwtString);
  const user = await User.get(username);

  if (!user){
    res.redirect('/login');
    return;
  }
  
  const filter = {};
  if (req.query.keyword){
    logger.info(`Keyword filter: ${req.query.keyword}`);

    // https://stackoverflow.com/questions/16560291/searching-string-with-special-characters-in-mongodb-document
    // Escape all regex special characters:
    const modifiedKeyword = req.query.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Having problem with names which contain special characters like "[".
    filter.action = {
      '$regex': modifiedKeyword,
      '$options': 'i' // Case-insensitive
    };    
  }

  const limit = config.auditLog.pageSize ? config.auditLog.pageSize : 10;        
  const totalRecords = await GameAudit.getCount(filter);
  const totalPages = Math.ceil(totalRecords / limit);
  
  // Pagination.    
  let page = parseInt(req.query.page);

  if (isNaN(page)){
    page = 1;
  }
  else {
    if (page < 1 || page > totalPages){
      page = 1;      
    }
  }
  
  let audits = await GameAudit.list(page, limit, filter);
  
  const userRoleValue = getRoleValueFromName(user.role);  

  res.render('audit-game', {
    title: 'Game Audit Log',
    // Currently authenticated user.
    user: user,
    audits: audits,
    pageCount: totalPages,
    totalRecords: totalRecords,
    currentPage: page,
    keyword: req.query.keyword,
  });
}

async function searchGameAudit (req, res, next){
  try {    
    const jwtString = req.headers.authorization || req.cookies.jwt;
    // Username maybe retrieved from JWT string but the user could have been deleted.
    const username = await auth.getUsernameFromToken(jwtString);
    const user = await User.get(username);

    if (!user){
      res.redirect('/login');
      return;
    }

    let keyword = trimIfNotEmpty(req.body.keyword);

    if (keyword && keyword.length > 0){
      keyword = utils.sanitizeHTML(keyword);
      logger.info(`[Search Game Audit] ${username} searched for keyword ${keyword}.`);

      res.status(200).json({
        success: true,
        redirectUrl: `/game-audit/?page=1&keyword=${encodeURIComponent(keyword)}`
      });
    }
    else {      
      res.status(200).json({
        success: true,
        redirectUrl: '/game-audit/?page=1'
      });      
    }
  }
  catch (err) {
    await logger.error(err);
    res.status(500);
    res.render('500', { 'title': 'Something went wrong!' });
  }
}
// ============================================================================================================



async function getProfilePage (req, res, next){
  try {
    const jwtString = req.headers.authorization || req.cookies.jwt;
    // Username maybe retrieved from JWT string but the user could have been deleted.
    const username = await auth.getUsernameFromToken(jwtString);
    const user = await User.get(username);

    if (user){
      user.canChangePassword = config.profile.allowPasswordChange;
      user.roleColor = getRoleColorFromName(user.role);
      user.statusColor = config.statusColors[user.status];
      
      res.render('profile', {
        title: 'My Profile',
        user: user
      });
    }
    else {
      // Most likely user not found.      
      res.redirect('/login');
    }
  }
  catch (err) {
    await logger.error(err);
    res.status(500);
    res.render('500', { 'title': 'Something went wrong!' });
  }
}


async function getMemberViewPage (req, res, next){
  try {
    const jwtString = req.headers.authorization || req.cookies.jwt;
    const username = await auth.getUsernameFromToken(jwtString);

    if (username){
      const { id } = req.params;
      const user = await User.get(username);      
      const member = await User.getById(id);

      if (!member){
        res.status(404);
        res.render('404', {
          title: 'Member Not Found'
        });
        return;
      }

      // Role color.
      member.roleColor = getRoleColorFromName(member.role);
      member.statusColor = config.statusColors[member.status];
      
      const isDev = isDeveloper(user.role);
      const userRoleValue = getRoleValueFromName(user.role);
      const memberRoleValue = getRoleValueFromName(member.role);
      
      const minRoleValueToEditMemberUsername = getRoleValueFromName(globals.Settings.minRoleToEditMemberUsername) || globals.MaxRoleValue;
      const minRoleValueToEditMemberPasswordHash = getRoleValueFromName(globals.Settings.minRoleToEditMemberPasswordHash) || globals.MaxRoleValue;
      const minRoleValueToEditMemberRole = getRoleValueFromName(globals.Settings.minRoleToEditMemberRole) || globals.MaxRoleValue;
      const minRoleValueToEditMemberStatus = getRoleValueFromName(globals.Settings.minRoleToEditMemberStatus) || globals.MaxRoleValue;

      const hasEditPermission = (userRoleValue >= minRoleValueToEditMemberUsername ||
        userRoleValue >= minRoleValueToEditMemberPasswordHash ||
        userRoleValue >= minRoleValueToEditMemberRole ||
        userRoleValue >= minRoleValueToEditMemberStatus
      );
      
      // Check permission to edit member.              
      user.canEditMember =  isDev || (user.id !== member.id &&
                              userRoleValue > memberRoleValue &&
                              hasEditPermission);

      // Check permission to delete member.                            
      const minRoleValueToDeleteMember = getRoleValueFromName(globals.Settings.minRoleToDeleteMember);
      user.canDeleteMember = isDev || (user.id !== member.id &&
                             userRoleValue > memberRoleValue &&
                             userRoleValue >= minRoleValueToDeleteMember);
      
      // Check permissions to view password hash and country.
      const minRoleValueToViewMemberPasswordHash = getRoleValueFromName(globals.Settings.minRoleToViewMemberPasswordHash) || globals.MaxRoleValue;
      const minRoleValueToViewMemberCountry = getRoleValueFromName(globals.Settings.minRoleToViewMemberCountry) || globals.MaxRoleValue;      

      user.canViewPasswordHash = userRoleValue >= minRoleValueToViewMemberPasswordHash;      
      user.canViewCountry = userRoleValue >= minRoleValueToViewMemberCountry;      

      const lastUpdatedBy = await User.getById(member.lastUpdatedBy);
      if (lastUpdatedBy){        
        member.lastUpdatedByUsername = lastUpdatedBy.username;
      }
           
      res.render('member-view', {
        title: 'Member Details',
        user: user,
        member: member        
      });
    }
  }
  catch (err){
    await logger.error(err);

    res.render('500', {
      title: 'Internal Server Error'
    });
  }
}

async function getMemberEditPage (req, res, next){
  try {
    const jwtString = req.headers.authorization || req.cookies.jwt;
    const username = await auth.getUsernameFromToken(jwtString);

    if (username){
      const { id } = req.params;
      const user = await User.get(username);

      if (user.status !== globals.ActiveStatus){
        await createServerAudit(user._id, user.username, req.ip, `Inactive user ${user.username} tried to access Member Edit page.`);

        res.status(403);
        res.render('unauthorized', {
          title: 'Unauthorized'
        });
        return;
      }

      const member = await User.getById(id);

      if (!member){
        res.status(404);
        res.render('404', {
          title: 'Member Not Found'
        });
        return;
      }
      
      const isDev = isDeveloper(user.role);
      const userRoleValue = getRoleValueFromName(user.role);
      const memberRoleValue = getRoleValueFromName(member.role);
      
      const minRoleValueToViewMemberPasswordHash = getRoleValueFromName(globals.Settings.minRoleToViewMemberPasswordHash) || globals.MaxRoleValue;
      const minRoleValueToViewMemberCountry = getRoleValueFromName(globals.Settings.minRoleToViewMemberCountry) || globals.MaxRoleValue;            
      const minRoleValueToEditMemberUsername = getRoleValueFromName(globals.Settings.minRoleToEditMemberUsername) || globals.MaxRoleValue;
      const minRoleValueToEditMemberPasswordHash = getRoleValueFromName(globals.Settings.minRoleToEditMemberPasswordHash) || globals.MaxRoleValue;
      const minRoleValueToEditMemberRole = getRoleValueFromName(globals.Settings.minRoleToEditMemberRole) || globals.MaxRoleValue;
      const minRoleValueToEditMemberStatus = getRoleValueFromName(globals.Settings.minRoleToEditMemberStatus) || globals.MaxRoleValue;
            
      const hasEditPermission = (userRoleValue >= minRoleValueToEditMemberUsername ||
        userRoleValue >= minRoleValueToEditMemberPasswordHash ||
        userRoleValue >= minRoleValueToEditMemberRole ||
        userRoleValue >= minRoleValueToEditMemberStatus
      );

      const canViewEditPage = isDev || (
        user.id !== member.id &&
        userRoleValue > memberRoleValue &&
        hasEditPermission
      );

      let allowedRoles = [];
      
      if (isDev){
        allowedRoles = [...globals.AllRoles];
      } else {
        allowedRoles = getRolesBelow(userRoleValue);
      }
      
      if (canViewEditPage){        
        user.canViewPasswordHash = userRoleValue >= minRoleValueToViewMemberPasswordHash;      
        user.canViewCountry = userRoleValue >= minRoleValueToViewMemberCountry;
        user.canEditUsername = isDev || userRoleValue >= minRoleValueToEditMemberUsername;
        user.canEditPasswordHash = isDev || userRoleValue >= minRoleValueToEditMemberPasswordHash;
        user.canEditRole = isDev || userRoleValue >= minRoleValueToEditMemberRole;
        user.canEditStatus = isDev || userRoleValue >= minRoleValueToEditMemberStatus;
                                
        res.render('member-edit', {
          title: 'Edit Member',
          user: user,
          member: member,
          roles: allowedRoles,          
          statuses: globals.ValidMemberStatuses
        });
      }
      else {
        return res.status(403).render('unauthorized', {
          title: 'Unauthorized'
        });
      }    
    }
  }
  catch (err){
    await logger.error(err);

    res.render('500', {
      title: 'Internal Server Error'
    });
  }
}

async function getMemberDeletePage (req, res, next){
  try {
    const jwtString = req.headers.authorization || req.cookies.jwt;
    const username = await auth.getUsernameFromToken(jwtString);

    if (username){
      const { id } = req.params;
      const user = await User.get(username);

      if (user.status !== globals.ActiveStatus){
        await createServerAudit(user._id, user.username, req.ip, `Inactive user ${user.username} tried to access Member Delete page.`);

        res.status(403);
        res.render('unauthorized', {
          title: 'Unauthorized'
        });
        return;
      }

      const isDev = isDeveloper(user.role);

      const member = await User.getById(id);
      member.roleColor = getRoleColorFromName(member.role);
      member.statusColor = config.statusColors[member.status];
      
      const userRoleValue = getRoleValueFromName(user.role);
      const memberRoleValue = getRoleValueFromName(member.role);
      
      const minRoleValueToDeleteMember = getRoleValueFromName(globals.Settings.minRoleToDeleteMember) || globals.MaxRoleValue;
      const minRoleValueToViewMemberPasswordHash = getRoleValueFromName(globals.Settings.minRoleToViewMemberPasswordHash) || globals.MaxRoleValue;
      const minRoleValueToViewMemberCountry = getRoleValueFromName(globals.Settings.minRoleToViewMemberCountry) || globals.MaxRoleValue;      

      user.canDeleteMember = isDev || (user.id !== member.id &&
                              userRoleValue > memberRoleValue &&
                              userRoleValue >= minRoleValueToDeleteMember);
      
      user.canViewPasswordHash = userRoleValue >= minRoleValueToViewMemberPasswordHash;      
      user.canViewCountry = userRoleValue >= minRoleValueToViewMemberCountry;      

      res.render('member-delete', {
        title: 'Member Details (Delete Page)',
        user: user,
        member: member
      });
    }
  }
  catch (err){
    await logger.error(err);

    res.render('500', {
      title: 'Internal Server Error'
    });
  }
}


async function updateMember(req, res, next){ 
  try {
    // =====================================================================================================
    // Check required fields.
    // =====================================================================================================
    req.body.username = trimIfNotEmpty(req.body.username);
    if (!checkRequiredString(req.body.username)){
      return res.status(400).json(createValidationMessage('username', 'Username is required.'));      
    }
    req.body.username = utils.sanitizeHTML(req.body.username);
    
    req.body.passwordHash = trimIfNotEmpty(req.body.passwordHash);
    if (!checkRequiredString(req.body.passwordHash)){
      return res.status(400).json(createValidationMessage('passwordHash', 'Password Hash is required.'));      
    }
    req.body.passwordHash = utils.sanitizeHTML(req.body.passwordHash); 
        
    if (req.body.passwordHash.length !== 64){
      return res.status(400).json(createValidationMessage('passwordHash', 'Password hash should be 64 characters long.'));
    }

    req.body.role = trimIfNotEmpty(req.body.role);
    if (!checkRequiredString(req.body.role)){
      return res.status(400).json(createValidationMessage('role', 'Role is required.'));      
    }
    req.body.role = utils.sanitizeHTML(req.body.role);


    req.body.status = trimIfNotEmpty(req.body.status);
    if (!checkRequiredString(req.body.status)){
      return res.status(400).json(createValidationMessage('status', 'Status is required.'));
    }  
    req.body.status = utils.sanitizeHTML(req.body.status);  

    // Suspended reason.
    if (req.body.status === 'Suspended'){
      req.body.suspendedReason = trimIfNotEmpty(req.body.suspendedReason);    
      if (!checkRequiredString(req.body.suspendedReason)){
        return res.status(400).json(createValidationMessage('suspendedReason', 'Suspended Reason is required.'));      
      }
      req.body.suspendedReason = utils.sanitizeHTML(req.body.suspendedReason);

      if (req.body.suspendedReason.length < 20){
        return res.status(400).json(createValidationMessage('suspendedReason', 'Suspended Reason must be at least 20 characters long.'));
      }
    }
    // =====================================================================================================            

    // =====================================================================================================
    // Check valid values for role and status.
    // =====================================================================================================
    if (!globals.RoleFromNameLookup[req.body.role]){
      return res.status(400).json(createValidationMessage('role', 'Invalid role.'));      
    }

    if (!globals.ValidMemberStatuses.includes(req.body.status)){
      return res.status(400).json(createValidationMessage('status', 'Invalid status.'));
    }
    // =====================================================================================================            


    const jwtString = req.headers.authorization || req.cookies.jwt;
    const username = await auth.getUsernameFromToken(jwtString);

    if (username){
      const member = await User.getById(req.body._id);

      if (!member){
        res.status(404);
        res.json({
            success: false,
            message: 'Member not found.',            
        });
        return;
      }

      const user = await User.get(username);

      if (user.status !== globals.ActiveStatus){
        await createServerAudit(user._id, user.username, req.ip, `Inactive user ${user.username} tried to update member ${member.username}.`);

        res.status(403);
        res.json({
          success: false,
          message: 'Unauthorized.',
        });
        return;
      }
          
      const isDev = isDeveloper(user.role);
      const userRole = globals.RoleFromNameLookup[user.role];
      const userRoleValue = getRoleValueFromName(user.role);
      const memberRoleValue = getRoleValueFromName(member.role);
      
      const minRoleValueToEditMemberUsername = getRoleValueFromName(globals.Settings.minRoleToEditMemberUsername) || globals.MaxRoleValue;
      const minRoleValueToEditMemberPasswordHash = getRoleValueFromName(globals.Settings.minRoleToEditMemberPasswordHash) || globals.MaxRoleValue;
      const minRoleValueToEditMemberRole = getRoleValueFromName(globals.Settings.minRoleToEditMemberRole) || globals.MaxRoleValue;
      const minRoleValueToEditMemberStatus = getRoleValueFromName(globals.Settings.minRoleToEditMemberStatus) || globals.MaxRoleValue;
      
      const hasEditPermission = (userRoleValue >= minRoleValueToEditMemberUsername ||
        userRoleValue >= minRoleValueToEditMemberPasswordHash ||
        userRoleValue >= minRoleValueToEditMemberRole ||
        userRoleValue >= minRoleValueToEditMemberStatus
      );

      // Check if the currently authenticated user is allowed to update the member.
      // - the user's role value is greater than that of the member's
      // - the user is not the member being updated
      // - the user has required role and above
      const userCanEditMember = isDev || (
        user.id !== member.id &&
        userRoleValue > memberRoleValue &&
        hasEditPermission
      );

      if (userCanEditMember){
        const newRoleValue = getRoleValueFromName(req.body.role);

        // Regardless of who the user is, honor the config setting of assigning new developer role.
        if (!config.allowNewDevelopers && newRoleValue >= globals.DeveloperRoleValue) {
          return res.status(400).json(createValidationMessage('role', 'Developer role is not allowed.'));      
        }

        if (!isDev) {
          // =============================================================================
          // Do not allow the user to update the member's role to the role 
          // greater than or equal to the current user's role.
          // =============================================================================
          if (newRoleValue >= userRoleValue){
            return res.status(400).json(createValidationMessage('role', 'Selected role is not allowed'));
          }
        }      
        // =============================================================================

        let change = {};
        let usernameChanged = false;
        let passwordHashChanged = false;
        let roleChanged = false;
        let statusChanged = false;

        // =============================================================================
        // Editing username.
        // =============================================================================
        if (req.body.username){
          const newUsername = req.body.username.trim();

          if (newUsername !== member.username){
            if (userRoleValue < minRoleValueToEditMemberUsername){
              return res.status(403).json(createValidationMessage('username', 'You do not have permission to update username.'));
            }
            // =====================================================================
            // Check Username update usage limit.
            // =====================================================================
            const usageCount = await getDailyUsageCount(user.id, dailyMemberUsernameUpdateUsageCountLookup);        

            if (!isDev && usageCount >= userRole.maxMemberUsernameUpdate) {              
              return res.status(403).json({
                success: false,
                message: `Exceeded daily limit for updating Username: ${userRole.maxMemberUsernameUpdate}.`
              });              
            }                  

            // =====================================================================================================
            // Make sure duplicate username does not exist.
            // =====================================================================================================
            const filter = {
              username: {
                // https://stackoverflow.com/questions/16560291/searching-string-with-special-characters-in-mongodb-document
                // Escape all regex special characters:
                '$regex': newUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                '$options': 'i' // Case-insensitive
              }
            };
                
            const existingMembers = await User.find(filter);
                
            for (const existingMember of existingMembers){
              if (existingMember.id !== member.id){
                return res.status(400).json(createValidationMessage('username', 'Duplicate username.'));
              }      
            }

            usernameChanged = true;
            change.username = newUsername;
            globals.BlacklistedTokens.push(member.jwtToken);
          }
        }
        
        // =============================================================================
        // Editing password hash.
        // =============================================================================
        if (req.body.passwordHash){
          const newPasswordHash = req.body.passwordHash.trim().toUpperCase();
          
          if (newPasswordHash !== member.passwordHash){
            if (userRoleValue < minRoleValueToEditMemberPasswordHash){                  
              return res.status(403).json(createValidationMessage('passwordHash', 'You do not have permission to update Password Hash.'));
            }

            // =====================================================================
            // Password Hash update usage limit.
            // =====================================================================
            const usageCount = await getDailyUsageCount(user.id, dailyMemberPasswordHashUpdateUsageCountLookup);        

            if (!isDev && usageCount >= userRole.maxMemberPasswordHashUpdate) {              
              return res.status(403).json({
                success: false,
                message: `Exceeded daily limit for updating Password Hash: ${userRole.maxMemberPasswordHashUpdate}.`
              });              
            }      
            // =====================================================================
                         
            passwordHashChanged = true;
            change.passwordHash = newPasswordHash;

            // If the password hash is going to be changed, blacklist that user's JWT token as well to log the user out.
            globals.BlacklistedTokens.push(member.jwtToken);
          }
        }        

        // =============================================================================
        // Editing role.
        // =============================================================================
        if (req.body.role && req.body.role !== member.role){
          const newRole = req.body.role.trim();

          if (newRole !== member.role){
            if (userRoleValue < minRoleValueToEditMemberRole){                  
              return res.status(403).json(createValidationMessage('role', 'You do not have permission to update Role.'));
            }

            // =====================================================================
            // Role update usage limit.
            // =====================================================================
            const usageCount = await getDailyUsageCount(user.id, dailyMemberRoleUpdateUsageCountLookup);        

            if (!isDev && usageCount >= userRole.maxMemberRoleUpdate) {
              return res.status(403).json({
                success: false,              
                message: `Exceeded daily limit for updating Role: ${userRole.maxMemberRoleUpdate}.`
              });            
            }            

            roleChanged = true;
            change.role = newRole;
          }          
        }

              
        // =============================================================================
        // Editing status.
        // =============================================================================
        if (req.body.status && req.body.status !== member.status){
          const newStatus = req.body.status.trim();

          if (newStatus !== member.status){
            if (userRoleValue < minRoleValueToEditMemberStatus){                  
              return res.status(403).json(createValidationMessage('status', 'You do not have permission to update Status.'));
            }

            // =====================================================================
            // Status update usage limit.
            // =====================================================================
            const usageCount = await getDailyUsageCount(user.id, dailyMemberStatusUpdateUsageCountLookup);        

            if (!isDev && usageCount >= userRole.maxMemberStatusUpdate) {
              return res.status(403).json({
                success: false,              
                message: `Exceeded daily limit for updating Status: ${userRole.maxMemberStatusUpdate}.`
              });              
            }

            statusChanged = true;
            change.status = newStatus;
            
            // If a user is going to be suspended, blacklist that user's JWT token as well to log the user out.
            if (change.status === globals.SuspendedStatus){
              globals.BlacklistedTokens.push(member.jwtToken);

              change.suspendedReason = req.body.suspendedReason;
            }
          }          
        }
                        
        if (!(usernameChanged || passwordHashChanged || roleChanged || statusChanged)){          
          return res.status(200).json({
            success: true,
            message: 'No need to update member.',
            redirectUrl: `/member/view/${member._id}`
          });          
        }
        
        change.lastUpdatedBy = user.id;
        change.lastUpdatedDate = new Date();
        const updatedMember = await User.update(member._id, change);

        if (updatedMember){
          // ===========================================================================================================
          // Audit trail.
          // ===========================================================================================================
          if (usernameChanged){
            const action = `${user.username} updated username for ${member.username} (id: ${member._id}) to ${change.username}.`;
            await createServerAudit(user._id, user.username, action);

            await incrementDailyUsageCount(user.id, dailyMemberUsernameUpdateUsageCountLookup);
          }

          if (passwordHashChanged){
            const action = `${user.username} updated password hash for ${member.username} (id: ${member._id}) to ${change.passwordHash}.`;
            await createServerAudit(user._id, user.username, action);

            await incrementDailyUsageCount(user.id, dailyMemberPasswordHashUpdateUsageCountLookup);
          }

          if (roleChanged){
            const action = `${user.username} updated role for ${member.username} (id: ${member._id}) to ${change.role}.`;
            await createServerAudit(user._id, user.username, action);

            await incrementDailyUsageCount(user.id, dailyMemberRoleUpdateUsageCountLookup);
          }

          if (statusChanged){
            const action = `${user.username} updated status for ${member.username} (id: ${member._id}) to ${change.status}.`;
            await createServerAudit(user._id, user.username, action);

            await incrementDailyUsageCount(user.id, dailyMemberStatusUpdateUsageCountLookup);
          }
          // ===========================================================================================================

          res.status(200);
          res.json({
            success: true,
            message: 'Member updated.',
            redirectUrl: `/member/view/${member._id}`
          });
        }
        else {
          await logger.warn(`Unable to update ${member.username}.`);

          return res.status(500).json({
            success: false,
            message: 'Unable to update member.'
          });
        }
      }
      else {
        await createServerAudit(user._id, user.username, `User ${user.username} tried to update the member ${member.username}.`);

        return res.status(403).json({
            success: false,
            message: 'Unauthorized.'
        });
      }    
    }
  } catch (err){
    await logger.error(err);

    return res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }  
}


async function deleteMember(req, res, next){
  try {
    const jwtString = req.headers.authorization || req.cookies.jwt;
    const username = await auth.getUsernameFromToken(jwtString);

    if (username){
      const member = await User.getById(req.body._id);

      if (!member){
        res.status(404);
        res.json({
          success: false,
          message: 'Member not found.',
        });
        return;
      }

      const user = await User.get(username);

      if (user.status !== globals.ActiveStatus){
        await createServerAudit(user._id, user.username, req.ip, `Inactive user ${user.username} tried to delete member ${member.username}.`);

        res.status(403);
        res.render('unauthorized', {
          title: 'Unauthorized'
        });
        return;
      }

      if (user.id === member.id){
        await createServerAudit(user._id, user.username, req.ip, `User ${user.username} tried to delete his/her own account.`);

        res.status(403);
        res.json({
          success: false,
          message: 'You cannot delete your own account.'
        });
        return;
      }
      
      const userRole = globals.RoleFromNameLookup[user.role];
      const minRoleValueToDeleteMember = getRoleValueFromName(globals.Settings.minRoleToDeleteMember) || globals.MaxRoleValue;

      if (userRole.value < minRoleValueToDeleteMember) {
        await createServerAudit(user._id, user.username, req.ip, `Unauthorized user ${user.username} tried to delete the member ${member.username}.`);

        res.status(403);
        res.json({
          success: false,
          message: 'Unauthorized.'
        });
        return;
      }

      const isDev = isDeveloper(user.role);

      if (!isDev){
        const deleteUsageCount = await getDailyUsageCount(user.id, dailyMemberDeleteUsageCountLookup);

        if (deleteUsageCount >= userRole.maxMemberDelete) {
          return res.status(403).json({
            success: false,
            message: `Exceeded daily limit for deleting Members: ${userRole.maxMemberDelete}.`
          });
        }
      }
      
      await User.removeById(member._id);
      const action = `${user.username} deleted ${member.username} (id: ${member._id}).`;
      await createServerAudit(user._id, user.username, action);
      
      await incrementDailyUsageCount(user.id, dailyMemberDeleteUsageCountLookup);

      res.status(200);
      res.json({
        success: true,
        message: 'Member deleted.',
        redirectUrl: `/member/list`
      });
    }
  }
  catch (err){
    console.log(err);
    await logger.error(err);

    res.status(500);
    res.json({
      success: false,
      message: 'Unable to delete member.'
    });
  }
}

// Validation helper.
// ===========================================================================================
function createValidationMessage(fieldName, msg){
  // Following MongoDB (Mongoose?) validation message JSON format.  
  // Example:
  // ===================================================
  // { 
  //   errorDetails:{
  //     username: {
  //       message: 'Username is required.'
  //     }
  //   }
  // }
  // ===================================================

  const obj = {
    errorDetails: {}
  };

  obj.errorDetails[fieldName] = { message: msg };
  
  return obj;
}

function checkRequiredString(input){
  if (!input || input.trim().length === 0){
    return false;
  }
  return true;
}

function trimIfNotEmpty(input){
  if (input){
    return input.trim();
  }
  return null;
}
// ===========================================================================================

async function registerMember(req, res, next) {  
  try {
    if (!globals.Settings.allowMemberRegistration) {
      return res.status(403).json({
        success: false,
        message: 'Member registration is disabled at the moment.'
      });
    }
        
    req.body.role = globals.DefaultRoleName || 'Member';
        
    // =====================================================================================================
    // Check required fields.
    // =====================================================================================================
    req.body.username = trimIfNotEmpty(req.body.username);
    if (!checkRequiredString(req.body.username)){
      return res.status(400).json(createValidationMessage('username', 'Username is required.'));      
    }
    req.body.username = utils.sanitizeHTML(req.body.username);
    
    if (!checkRequiredString(req.body.role)){
      return res.status(400).json(createValidationMessage('role', 'Role is required.'));
    }
            
    req.body.password = trimIfNotEmpty(req.body.password);
    if (!checkRequiredString(req.body.password)){      
      return res.status(400).json(createValidationMessage('password', 'Password is required.'));      
    }
    req.body.password = utils.sanitizeHTML(req.body.password);


    req.body.confirmPassword = trimIfNotEmpty(req.body.confirmPassword);
    if (!checkRequiredString(req.body.confirmPassword)){      
      return res.status(400).json(createValidationMessage('confirmPassword', 'Confirm Password is required.'));      
    }
    req.body.confirmPassword = utils.sanitizeHTML(req.body.confirmPassword);

    // =====================================================================================================
    // Check username length.
    // =====================================================================================================
    const minUsernameLen = 3;
    const maxUsernameLen = 30;

    if (req.body.username.length < minUsernameLen || req.body.username.length > maxUsernameLen){
      const msg = `Username must be between ${minUsernameLen} and ${maxUsernameLen} characters.`;
      return res.status(400).json(createValidationMessage('username', msg));
    }

    // =====================================================================================================
    // Check username is not an email address.
    // =====================================================================================================
    if (await utils.isEmail(req.body.username)){
      const msg = 'Username must NOT be an email address.';
      return res.status(400).json(createValidationMessage('username', msg));
    }

    // =====================================================================================================
    // Check if the selected role is allowed for self-registration.    
    // =====================================================================================================
    if (!config.registration.allowedSelfRoles.includes(req.body.role)){
      await logger.warn(`Guest ${req.body.username} provided invalid role ${req.body.role} in registration.`);      
      return res.status(400).json(createValidationMessage('role', `${req.body.role} is not allowed for self-registration.`));      
    }

    // =====================================================================================================
    // Check passwords length.
    // =====================================================================================================    
    const minPasswordLen = config.registration.minPasswordLength;
    const maxPasswordLen = config.registration.maxPasswordLength;

    if (req.body.password.length < minPasswordLen || req.body.password.length > maxPasswordLen){
      const msg = `Password must be between ${minPasswordLen} and ${maxPasswordLen} characters.`;
      return res.status(400).json(createValidationMessage('password', msg));      
    }

    if (req.body.confirmPassword.length < minPasswordLen || req.body.confirmPassword.length > maxPasswordLen){
      const msg = `Confirm Password must be between ${minPasswordLen} and ${maxPasswordLen} characters.`;
      return res.status(400).json(createValidationMessage('confirmPassword', msg));      
    }

    // =====================================================================================================
    // Make sure password and confirm password match.
    // =====================================================================================================
    if (req.body.password !== req.body.confirmPassword){
      return res.status(400).json(createValidationMessage('confirmPassword', 'Password and Confirm Password must be the same.'));
    }
        
    // =====================================================================================================
    // Make sure duplicate username does not exist.
    // =====================================================================================================
    const filter = {
      username: {
        // https://stackoverflow.com/questions/16560291/searching-string-with-special-characters-in-mongodb-document
        // Escape all regex special characters:
        '$regex': req.body.username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        '$options': 'i' // Case-insensitive
      }
    };
        
    const existingMembersCount = await User.getCount(filter);
        
    if (existingMembersCount > 0){
      return res.status(400).json(createValidationMessage('username', 'Duplicate username.'));
    }    
    
    // =====================================================================================================
    // Try to register user.
    // =====================================================================================================

    // Generate SHA256 hash for the user automatically.
    const hashedPassword = await sha256.hash(req.body.password);
    req.body.passwordHash = hashedPassword.toUpperCase();
        
    // Get country name from IP address.
    const countryName = await utils.getCountryNameByIPAddress(req.ip);    
    req.body.countryName = countryName;
    // ===================================================================
        
    req.body.registerDate = new Date();

    const user = await User.create(req.body);
    const { _id } = user;    
    // =====================================================================================
    // Audit trail.
    const action = `User ${user.username} registered.`;
    await createServerAudit(user._id, user.username, action);
    // =====================================================================================

    res.status(200);
    res.json({
      redirectUrl: '/register/confirm/' + _id
    }); 
  }
  catch (err){
    await logger.error(err);

    res.status(500);
    res.json({
        success: false,
        message: 'Something went wrong. Unable to register.',
    });
  }
}



async function recordMapUsage(req, res, next) {
  try {
    // =====================================================================================================
    // Check required fields.
    // =====================================================================================================
    // Map Id.
    req.body.mapId = trimIfNotEmpty(req.body.mapId);    
    if (!checkRequiredString(req.body.mapId)){
      return res.status(400).json(createValidationMessage('mapId', 'Map Id is required.'));      
    }
    req.body.mapId = utils.sanitizeHTML(req.body.mapId);

    // Server Token.
    req.body.serverToken = trimIfNotEmpty(req.body.serverToken);    
    if (!checkRequiredString(req.body.serverToken)){
      return res.status(400).json(createValidationMessage('serverToken', 'Server Token is required.'));      
    }
    req.body.serverToken = utils.sanitizeHTML(req.body.serverToken);
   
    const tokenIndex = config.gamerLogin.validServerTokens.findIndex(token => token === req.body.serverToken);
    if (tokenIndex === -1){
      return res.status(400).json(createValidationMessage('serverToken', 'Invalid server token.'));
    }

    const maze = await Maze.getById(req.body.mapId);

    if (!maze){
      return res.status(404).json({
        success: false,
        message: 'Map not found.',
      });
    }

    console.log(`Recording map usage for map id: ${req.body.mapId}`);
    
    const change = {
      usageCount: maze.usageCount + 1
    };

    const updatedMaze = await Maze.update(maze.id, change);
    
    if (updatedMaze){
      return res.status(200).json({
        success: true,
        message: 'Map usage recorded.'        
      });
    }
    else {
      console.log('Unable to record map usage.');

      return res.status(500).json({
        success: false,
        message: 'Unable to record map usage.'
      });
    }
  }
  catch (err){
    await logger.error(err);
    res.status(500).json({
      success: false,
      message: 'Unexpected error occurred.'
    });
  }
}

async function authenticateGamer(req, res, next) {
  try {
    // Make sure required values are provided.
    if (!req.body.username){
      return res.status(400).json({
        success: false,
        message: 'Username is required.'
      });      
    }

    if (!req.body.passwordHash){
      return res.status(400).json({
        success: false,
        message: 'Password hash is required.'
      });      
    }

    if (!req.body.serverToken){
      return res.status(400).json({
        success: false,
        message: 'Server token is required.'
      });      
    }

    const tokenIndex = config.gamerLogin.validServerTokens.findIndex(token => token === req.body.serverToken);
    if (tokenIndex === -1){
      return res.status(400).json({
        success: false,
        message: 'Invalid server token.'
      });      
    }
        
    // Try to retrieve the user based on username.
    const user = await User.get(req.body.username);

    if (!user){      
      return res.status(401).json({
        success: true,
        message: 'Authentication failed.'
      });      
    }

    // Compare the password hashes.    
    const passwordMatched = req.body.passwordHash.toUpperCase() === user.passwordHash.toUpperCase();

    if (!passwordMatched){      
      return res.status(401).json({
        success: true,
        message: 'Authentication failed.'
      });      
    }
  if (user.status === globals.SuspendedStatus){
    const data = {
      succes: false,
       message: `Your account is suspended by ${user.lastUpdatedBy}`
      } 
    }
      else if (user.status === globals.InactiveStatus){
        const data = {
          succes: false,
        message: 'Please ask a staff member to activate your account first.'
        }
      }
    
    // Check the status, extra security layer.
    if (user.status === globals.ActiveStatus){
      const roleValue = getRoleValueFromName(user.role);
      const roleColor = getRoleColorFromName(user.role);
      let modifiedUsername = user.username;
      
      const data = {
        success: true,
        message: '*** Authentication successful. ***',
        username: modifiedUsername,
        role: user.role,
        roleValue: roleValue,
        roleColor: roleColor,
        // TODO: To remove later.
        roleColorIndex: 8
      };
                 
      const foundRole = globals.RoleFromNameLookup[user.role];

      if (foundRole){
        data.maxWarn = foundRole.permWarn;
        data.maxMute = foundRole.permMute;
        data.maxUnmute = foundRole.permUnmute;
        data.maxKill = foundRole.permKill;        
        data.maxKickDead = foundRole.permKickDead;                
        data.maxKickSpecs = foundRole.permKickSpecs;
        data.maxKick = foundRole.permKick;
        data.maxBroadcast = foundRole.permBroadcast;
        data.maxToggleFood = foundRole.permToggleFood;
        data.maxTempBan = foundRole.permTempBan;
        data.maxASNBan = foundRole.permASNBan;
        data.maxClearBanList = foundRole.permClearBanList;
        data.maxASNMute = foundRole.permASNMute;
        data.maxASNUnmute = foundRole.permASNUnmute;
        data.maxASNAdd = foundRole.permASNAdd;
        data.maxRestartServer = foundRole.permRestartServer;
        data.maxVPNCommand = foundRole.permVPNCommand;
        data.maxMapCommand = foundRole.permMapCommand;        
      }

      console.log(`Sending user data for ${modifiedUsername}`);      
      
      res.status(200).json(data);
    }
    else {
      let msg = null;

      if (user.status === globals.SuspendedStatus){
        msg = `Your account is suspended by ${user.lastUpdatedBy}`;
      }
      else if (user.status === globals.InactiveStatus){
        msg = 'Please ask a staff member to activate your account first.';
      }

      res.status(403).json({
        success: false,
        message: msg
      });
    }
  }
  catch (err){
    await logger.error(err);
    res.status(500).json({
      success: false,
      message: 'Error occurred in authentication server.'
    });
  }
}

async function auditGame(req, res, next) {
  try {    
    // Make sure required values are provided.   
    if (!req.body.action){
      return res.status(400).json({
        success: false,
        message: 'Action is required.'
      });      
    }

    if (!req.body.serverToken){
      return res.status(400).json({
        success: false,
        message: 'Server token is required.'
      });      
    }

    const tokenIndex = config.gamerLogin.validServerTokens.findIndex(token => token === req.body.serverToken);
    if (tokenIndex === -1){
      return res.status(400).json({
        success: false,
        message: 'Invalid server token.'
      });      
    }
    
    const action = req.body.action.trim();
    const gameAudit = createGameAudit(req.body.serverName, action);    
    
    if (gameAudit){
      res.status(200).json({
        success: true,
        message: 'Game audit log created.'
      });  
    }
    else {
      res.status(500).json({
        success: false,
        message: 'Unable to create game audit log.'
      });
    }
  }
  catch (err){
    await logger.error(err);
    res.status(500).json({
      success: false,
      message: 'Error occurred in auditing game.'
    });
  }
}



async function getMapCreatePage (req, res, next){
  if (!globals.Settings.allowMapSubmission){    
    return res.render('map-submission-disabled', {
      title: 'Map Submission Disabled'
    });
  }      

  const jwtString = req.headers.authorization || req.cookies.jwt;
  const username = await auth.getUsernameFromToken(jwtString);
  const user = await User.get(username);

  if (!user){
    res.redirect('/login');
    return;
  }

  if (user.status !== globals.ActiveStatus){
    await createServerAudit(user._id, user.username, req.ip, `Inactive user ${user.username} tried to access Create Map page.`);

    res.render('unauthorized', {
      title: 'Unauthorized'
    });
    return;
  }
  
  res.render('map-create', {
    title: 'Create a New Map',    
    user: user,
    xGrids: globals.MapXGrids,
    yGrids: globals.MapYGrids,
    maxCells: globals.MaxMapCells
  });
}

async function getMapListPage (req, res, next){
  try {       
    const jwtString = req.headers.authorization || req.cookies.jwt;
    const username = await auth.getUsernameFromToken(jwtString);
    const user = await User.get(username);

    if (!user){
      res.redirect('/login');
      return;
    }
          
    const filter = {};

    let queryMapName = trimIfNotEmpty(req.query.mapName);
    if (queryMapName){
      queryMapName = utils.sanitizeHTML(queryMapName);

      // https://stackoverflow.com/questions/16560291/searching-string-with-special-characters-in-mongodb-document
      // Escape all regex special characters:
      queryMapName = queryMapName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Having problem with names which contain special characters like "[".
      filter.name = {
        '$regex': queryMapName,
        '$options': 'i' // Case-insensitive
      };
    }
  
    let queryStatus = trimIfNotEmpty(req.query.status);
    if (queryStatus){
      queryStatus = utils.sanitizeHTML(queryStatus);
      
      if (globals.ValidMazeStatuses.includes(queryStatus)){
        const modifiedStatus = queryStatus.replace(/[.*+?^${}|[\]\\]/g, '\\$&');
      
        // Exact match.
        filter.status = modifiedStatus;
      }      
    }

    const limit = globals.Settings.mapListingPageSize || 15;
    const totalRecords = await Maze.getCount(filter);
    const totalPages = Math.ceil(totalRecords / limit);

    // Pagination.    
    let page = parseInt(req.query.page);

    if (isNaN(page)){
      page = 1;
    }
    else {
      if (page < 1 || page > totalPages){
        page = 1;      
      }
    }
    
    let maps = await Maze.list(page, limit, filter);    

    // Compile a list of user ids from the mazes to retrieve usernames.
    const userIds = maps.map(x => { return x.createdBy; });
    const users = await User.getByIds(userIds);        
    const userRoleValue = getRoleValueFromName(user.role);
    const minRoleValueToEditMemberStatus = getRoleValueFromName(globals.Settings.minRoleToEditMemberStatus) || globals.MaxRoleValue; 

    maps = maps.map((item) => {      
      item.canBeEdited = (user.id === item.createdBy) || userRoleValue >= minRoleValueToEditMemberStatus;
      item.statusColor = config.statusColors[item.status];

      // Populate username.
      const creator = users.find((x) => { return item.createdBy === x._id; });
      if (creator){        
        item.createdByUsername = creator.username;
      }

      return item;
    });    
    
    res.render('map-list', {
      title: 'Maps',      
      user: user,
      maps: maps,
      pageCount: totalPages,
      totalRecords: totalRecords,
      currentPage: page,
      mapName: queryMapName,
      status: queryStatus,
      validStatuses: globals.ValidMazeStatuses
    });
  }
  catch (err){
    await logger.error(err);
    console.log(err);
    res.status(500).render('500', { 
      'title': 'Something went wrong!' 
    });
  }  
}

async function searchMaps(req, res, next){
  try {    
    const jwtString = req.headers.authorization || req.cookies.jwt;    
    const username = await auth.getUsernameFromToken(jwtString);
    const user = await User.get(username);

    if (!user){
      res.redirect('/login');
      return;
    }

    let mapName = trimIfNotEmpty(req.body.mapName) || '';
    let searchStatus = trimIfNotEmpty(req.body.status) || '';

    mapName = utils.sanitizeHTML(mapName);    
    searchStatus = utils.sanitizeHTML(searchStatus);
            
    if (!globals.ValidMazeStatuses.includes(searchStatus)){
      searchStatus = '';
    }
    
    res.status(200).json({
      success: true,        
      redirectUrl: `/map/list/?page=1&mapName=${encodeURIComponent(mapName)}&status=${encodeURIComponent(searchStatus)}`
    });    
  }
  catch (err) {
    await logger.error(err);
    res.status(500);
    res.render('500', { 'title': 'Something went wrong!' });
  }
}



async function getMapViewPage (req, res, next){
  try {
    const jwtString = req.headers.authorization || req.cookies.jwt;
    const username = await auth.getUsernameFromToken(jwtString);

    if (username){
      const { id } = req.params;
      const user = await User.get(username);      
      const maze = await Maze.getById(id);
      maze.statusColor = config.statusColors[maze.status];
            
      const userRoleValue = getRoleValueFromName(user.role);      
      const minRoleValueToEditMemberStatus = getRoleValueFromName(globals.Settings.minRoleToEditMemberStatus) || globals.MaxRoleValue; 
      const minRoleValueToDeleteMember = getRoleValueFromName(globals.Settings.minRoleToDeleteMember) || globals.MaxRoleValue; 

      user.canEditMap = isDeveloper(user.role) || 
                          (user.id === maze.createdBy) || 
                          userRoleValue >= minRoleValueToEditMemberStatus;
      user.canDeleteMap = isDeveloper(user.role) || 
                          (user.id === maze.createdBy) ||
                          userRoleValue >= minRoleValueToDeleteMember;
      
      // Created by.
      const creator = await User.getById(maze.createdBy);
      if (creator){
        maze.createdByUsername = creator.username;
      }

      // Last updated by.
      const updatedBy = await User.getById(maze.lastUpdatedBy);
      if (updatedBy){
        maze.lastUpdatedByUsername = updatedBy.username;
      }
      
      res.render('map-view', {
        title: 'Map Details',
        user: user,
        maze: maze,
        maxCells: globals.MaxMapCells,
        xGrids: globals.MapXGrids,
        yGrids: globals.MapYGrids,
      });
    }
  }
  catch (err){
    res.render('500', {
      title: 'Internal Server Error'
    });
  }
}


async function getMapEditPage (req, res, next){
  try {
    const jwtString = req.headers.authorization || req.cookies.jwt;
    const username = await auth.getUsernameFromToken(jwtString);

    if (!username){
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const user = await User.get(username);
    if (user.status !== globals.ActiveStatus){
      await createServerAudit(user._id, user.username, req.ip, `Inactive user ${user.username} tried to access Map Edit page.`);

      return res.status(403).render('unauthorized', {
        title: 'Unauthorized'
      });        
    }

    const { id } = req.params;
    const maze = await Maze.getById(id);

    if (!maze){
      return res.status(404).render('404', {
        title: 'Map Not Found'
      });
    }
     
    const isMapCreator = (user.id === maze.createdBy);
    const userRoleValue = getRoleValueFromName(user.role);    
    const minRoleValueToEditMemberStatus = getRoleValueFromName(globals.Settings.minRoleToEditMemberStatus) || globals.MaxRoleValue; 

    maze.statusColor = config.statusColors[maze.status];
    user.canEditStatus = isDeveloper(user.role) || userRoleValue >= minRoleValueToEditMemberStatus;
    user.canEditName = isDeveloper(user.role) || isMapCreator;
    user.canEditMap = isDeveloper(user.role) || isMapCreator;

    const hasEditAccess = isMapCreator || userRoleValue >= minRoleValueToEditMemberStatus;

    if (!hasEditAccess){
      return res.status(403).render('unauthorized', {
        title: 'Unauthorized'
      });
    }   

    res.render('map-edit', {
      title: 'Edit Map',
      user: user,
      maze: maze,  
      xGrids: globals.MapXGrids,
      yGrids: globals.MapYGrids,
      maxCells: globals.MaxMapCells,
      statuses: globals.ValidMazeStatuses
    });    
  }
  catch (err){
    res.render('500', {
      title: 'Internal Server Error'
    });
  }
}


async function getMapDeletePage (req, res, next){
  try {
    const jwtString = req.headers.authorization || req.cookies.jwt;
    const username = await auth.getUsernameFromToken(jwtString);

    if (username){
      const { id } = req.params;
      const user = await User.get(username);

      if (user.status !== globals.ActiveStatus){
        await createServerAudit(user._id, user.username, req.ip, `Inactive user ${user.username} tried to access Map Delete page.`);

        res.status(403);
        res.render('unauthorized', {
          title: 'Unauthorized'
        });
        return;
      }
      
      const maze = await Maze.getById(id);
      maze.statusColor = config.statusColors[maze.status];

      if (!maze){
        return res.status(404).render('404', {
          title: 'Maze Not Found'
        });
      }

      const userRoleValue = getRoleValueFromName(user.role);
      const minRoleValueToDeleteMember = getRoleValueFromName(globals.Settings.minRoleToDeleteMember) || globals.MaxRoleValue;

      user.canDeleteMap = isDeveloper(user.role) || 
                            (user.id === maze.createdBy) ||
                            userRoleValue >= minRoleValueToDeleteMember;
            
      res.render('map-delete', {
        title: 'Map Details (Delete Page)',
        user: user,
        maze: maze,
        maxCells: globals.MaxMapCells,
        xGrids: globals.MapXGrids,
        yGrids: globals.MapYGrids,
      });
    }
  }
  catch (err){
    res.render('500', {
      title: 'Internal Server Error'
    });
  }
}

async function createMap(req, res, next) {
  try {
    if (!globals.Settings.allowMapSubmission){
      return res.status(403).json({
        success: false,
        message: 'Map submission is disabled at the moment.'
      });      
    }

    const jwtString = req.headers.authorization || req.cookies.jwt;
    const username = await auth.getUsernameFromToken(jwtString);

    if (!username){
      return res.status(403).json({
        success: false,
        message: 'Unauthorized.',
      });
    }

     // Username maybe retrieved from JWT string but the user could have been deleted.     
     const user = await User.get(username);
 
     if (!user){
       return res.status(404).json({
         success: false,
         message: 'User does not exist.'
       });      
     }

    // =====================================================================================================
    // Check required fields.
    // =====================================================================================================
    // Map Name.
    req.body.mapName = trimIfNotEmpty(req.body.mapName);    
    if (!checkRequiredString(req.body.mapName)){
      return res.status(400).json(createValidationMessage('mapName', 'Map Name is required.'));      
    }
    req.body.mapName = utils.sanitizeHTML(req.body.mapName);
    
    // =====================================================================================================
    // Check map name length and format (i.e. alphabets and spaces only).
    // =====================================================================================================
    const minMapNameLen = globals.MinMapNameLength;
    const maxMapNameLen = globals.MaxMapNameLength;

    if (req.body.mapName.length < minMapNameLen || req.body.mapName.length > maxMapNameLen){
      const msg = `Map Name must be between ${minMapNameLen} and ${maxMapNameLen} characters.`;
      return res.status(400).json(createValidationMessage('mapName', msg));
    }
    
    const mapNameRegex = globals.MapNameRegEx;

    if (!mapNameRegex.test(req.body.mapName)){
      const msg = 'Map Name must be alphabets, numbers, and single space only.';
      return res.status(400).json(createValidationMessage('mapName', msg));
    }

    // =====================================================================================================
    // Make sure duplicate map name does not exist.
    // =====================================================================================================
    const filter = {
      name: {
        // https://stackoverflow.com/questions/16560291/searching-string-with-special-characters-in-mongodb-document
        // Escape all regex special characters:
        '$regex': req.body.mapName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        '$options': 'i' // Case-insensitive
      }
    };
        
    const existingMazesCount = await Maze.getCount(filter);
        
    if (existingMazesCount > 0){
      return res.status(400).json(createValidationMessage('mapName', 'Duplicate map name.'));
    }      
    
    if (!req.body.cells){
      return res.status(400).json(createValidationMessage('mapData', 'Map Data is required.'));
    }
    
    if (req.body.cells.length < globals.MinMapCells || req.body.cells.length > globals.MaxMapCells){
      return res.status(400).json(createValidationMessage('mapData', `The number of cells must be between ${globals.MinMapCells} and ${globals.MaxMapCells}.`));
    }

    const mazeData = {
      name: req.body.mapName,      
      data: {
        xGrids: globals.MapXGrids,
        yGrids: globals.MapYGrids,
        cells: req.body.cells
      },
      createdBy: user.id
    };

    const maze = await Maze.create(mazeData);

    // =====================================================================================
    // Audit trail.
    const action = `${user.username} created a map: ${req.body.mapName}.`;
    await createServerAudit(user._id, user.username, action);
    // =====================================================================================
    
    return res.status(200).json({
      redirectUrl: '/map/view/' + maze.id
    });
  }
  catch (err) {
    console.log(err);
    await logger.error(err);

    res.status(500).json({
      success: false,
      message: 'Something went wrong!'
    });
  }
}


async function updateMap(req, res, next) {
  try {    
    const jwtString = req.headers.authorization || req.cookies.jwt;
    const username = await auth.getUsernameFromToken(jwtString);

    if (!username){
      return res.status(403).json({
        success: false,
        message: 'Unauthorized.',
      });
    }

     // Username maybe retrieved from JWT string but the user could have been deleted.     
     const user = await User.get(username);
 
     if (!user){
       return res.status(404).json({
         success: false,
         message: 'User does not exist.'
       });      
     }

    // =====================================================================================================
    // Check required fields.
    // =====================================================================================================
    // Map Name.
    req.body.mapName = trimIfNotEmpty(req.body.mapName);    
    if (!checkRequiredString(req.body.mapName)){
      return res.status(400).json(createValidationMessage('mapName', 'Map Name is required.'));      
    }
    req.body.mapName = utils.sanitizeHTML(req.body.mapName);

    // Status.
    req.body.status = trimIfNotEmpty(req.body.status);    
    if (!checkRequiredString(req.body.status)){
      return res.status(400).json(createValidationMessage('status', 'Status is required.'));      
    }
    req.body.status = utils.sanitizeHTML(req.body.status);
    
    // Rejected reason.
    if (req.body.status === 'Rejected'){
      req.body.rejectedReason = trimIfNotEmpty(req.body.rejectedReason);    
      if (!checkRequiredString(req.body.rejectedReason)){
        return res.status(400).json(createValidationMessage('rejectedReason', 'Rejected Reason is required.'));      
      }
      req.body.rejectedReason = utils.sanitizeHTML(req.body.rejectedReason);

      if (req.body.rejectedReason.length < 20){
        return res.status(400).json(createValidationMessage('rejectedReason', 'Rejected Reason must be at least 20 characters long.'));
      }
    }
    // =====================================================================================================
    // Check map name length and format (i.e. alphabets and spaces only).
    // =====================================================================================================
    const minMapNameLen = globals.MinMapNameLength;
    const maxMapNameLen = globals.MaxMapNameLength;

    if (req.body.mapName.length < minMapNameLen || req.body.mapName.length > maxMapNameLen){
      const msg = `Map Name must be between ${minMapNameLen} and ${maxMapNameLen} characters.`;
      return res.status(400).json(createValidationMessage('mapName', msg));
    }
    
    const mapNameRegex = globals.MapNameRegEx;

    if (!mapNameRegex.test(req.body.mapName)){
      const msg = 'Map Name must be alphabets, numbers, and single space only.';
      return res.status(400).json(createValidationMessage('mapName', msg));
    }

    const maze = await Maze.getById(req.body._id);

    if (!maze){
      return res.status(404).json({
        success: false,
        message: 'Maze not found.',
      });
    }

    const isDev = isDeveloper(user.role);
    const userRoleValue = getRoleValueFromName(user.role);
    const minRoleValueToEditMemberStatus = getRoleValueFromName(globals.Settings.minRoleToEditMemberStatus) || globals.MaxRoleValue; 
    const isOwnMap = isDev || user.id === maze.createdBy;
    const canEdit = isDev || isOwnMap || userRoleValue >= minRoleValueToEditMemberStatus;
                       
    if (!canEdit){      
      return res.status(403).json({
        success: false,
        message: 'Unauthorized.',
      });
    }        
    
    const canEditStatus = isDev || userRoleValue >= minRoleValueToEditMemberStatus;

    if (canEditStatus && req.body.status !== maze.status){
      if (!globals.ValidMazeStatuses.includes(req.body.status)){
        return res.status(400).json(createValidationMessage('status', 'Invalid map status.'));
      }                
    }
    
    // Make sure duplicate map name does not exist.
    if (isOwnMap && maze.name !== req.body.mapName){
      const filter = {
        name: {
          // https://stackoverflow.com/questions/16560291/searching-string-with-special-characters-in-mongodb-document
          // Escape all regex special characters:
          '$regex': req.body.mapName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          '$options': 'i' // Case-insensitive
        }
      };
          
      const existingMazes = await Maze.find(filter);
          
      for (const existingMaze of existingMazes){
        if (existingMaze.id !== maze.id){
          return res.status(400).json(createValidationMessage('mapName', 'Duplicate map name.'));
        }      
      }      
    }    

    if (!req.body.cells){
      return res.status(400).json(createValidationMessage('mapData', 'Map Data is required.'));
    }
    
    if (req.body.cells.length < globals.MinMapCells || req.body.cells.length > globals.MaxMapCells){
      return res.status(400).json(createValidationMessage('mapData', `The number of cells must be between ${globals.MinMapCells} and ${globals.MaxMapCells}.`));
    }

    const change = {
      data: {
        xGrids: globals.MapXGrids,
        yGrids: globals.MapYGrids,
        cells: req.body.cells
      },      
      lastUpdatedBy: user.id,
      lastUpdatedDate: new Date()
    };

    if (canEditStatus){
      change.status = req.body.status;

      if (req.body.status === 'Rejected'){
        change.rejectedReason = req.body.rejectedReason;
      }
    }

    if (isOwnMap){
      change.name = req.body.mapName;
    }

    const updatedMaze = await Maze.update(maze.id, change);
    
    if (updatedMaze){
      // Audit trail.
      const action = `${user.username} updated the map: ${maze.name}.`;
      await createServerAudit(user._id, user.username, action);
      // ===========================================================================================================
      return res.status(200).json({
        success: true,
        message: 'Map updated.',
        redirectUrl: `/map/view/${maze.id}`
      });
    }
    else {
      await logger.warn(`Unable to update ${maze.name}.`);

      return res.status(500).json({
        success: false,
        message: 'Unable to update maze.'
      });
    }
  }
  catch (err) {
    console.log(err);
    await logger.error(err);

    res.status(500).json({
      success: false,
      message: 'Something went wrong!'
    });
  }
}


async function deleteMap(req, res, next){
  try {
    const jwtString = req.headers.authorization || req.cookies.jwt;
    const username = await auth.getUsernameFromToken(jwtString);

    if (!username){
      return res.status(403).json({
        success: false,
        message: 'Unauthorized.',
      });
    }

    // Username maybe retrieved from JWT string but the user could have been deleted.     
    const user = await User.get(username);

    if (!user){
      return res.status(404).json({
        success: false,
        message: 'User does not exist.'
      });      
    }

    const maze = await Maze.getById(req.body._id);

    if (!maze){
      return res.status(404).json({
        success: false,
        message: 'Maze not found.',
      });        
    }

    if (user.status !== globals.ActiveStatus){
      await createServerAudit(user._id, user.username, req.ip, `Inactive user ${user.username} tried to delete map ${maze.name}.`);
      return res.status(403).render('unauthorized', { title: 'Unauthorized' });
    }

    const userRoleValue = getRoleValueFromName(user.role);
    const minRoleValueToDeleteMember = getRoleValueFromName(globals.Settings.minRoleToDeleteMember) || globals.MaxRoleValue;
      
    const canDeleteMap = isDeveloper(user.role) || 
                            (user.id === maze.createdBy) ||
                            userRoleValue >= minRoleValueToDeleteMember;

    if (!canDeleteMap) {
      await createServerAudit(user._id, user.username, req.ip, `Unauthorized user ${user.username} tried to delete the map ${maze.name}.`);

      return res.status(403).json({
        success: false,
        message: 'Unauthorized.'
      });        
    }
   
    await Maze.removeById(maze.id);
    
    const action = `${user.username} deleted the map ${maze.name} (id: ${maze.id}).`;
    await createServerAudit(user.id, user.username, action);
    
    return res.status(200).json({
      success: true,
      message: 'Map deleted.',
      redirectUrl: `/map/list`
    });    
  }
  catch (err){
    await logger.error(err);

    return res.status(500).json({
      success: false,
      message: 'Unable to delete the map.'
    });
  }
}

// ==================================================================================

async function sendMapData (req, res, next) {
  try {
    // Make sure required values are provided.    
    if (!req.body.serverToken){
      return res.status(400).json({
        success: false,
        message: 'Server token is required.'
      });
    }

    const tokenIndex = config.gamerLogin.validServerTokens.findIndex(token => token === req.body.serverToken);
    if (tokenIndex === -1){
      return res.status(400).json({
        success: false,
        message: 'Invalid server token.'
      });
    }
    
    console.log('Sending map data...');
    
    const mapData = {
      mazes: []
    };
        
    const approvedMazes = await Maze.getApproved();
    const userIds = approvedMazes.map(x => { return x.createdBy; });
    const users = await User.getByIds(userIds);    
    
    for (const maze of approvedMazes){      
      const modifiedMaze = {
        ...maze.data,
        id: maze.id,
        name: maze.name,
        author: 'Unknown'
      };

      const creator = users.find(x => x.id === maze.createdBy);
      if (creator){
        modifiedMaze.author = creator.username;
      }

      mapData.mazes.push(modifiedMaze);
    }

    res.status(200).json(mapData);
  }
  catch (err){
    console.log(err);
    await logger.error(err);

    res.status(500).json({
      success: false,
      message: 'Unexpected error occurred.'
    });
  }
}

async function sendTankCode (req, res, next) {
  try {
    // Make sure required values are provided.    
    if (!req.body.serverToken){
      res.status(400).json({
        success: false,
        message: 'Server token is required.'
      });
      return;
    }

    const tokenIndex = config.gamerLogin.validServerTokens.findIndex(token => token === req.body.serverToken);
    if (tokenIndex === -1){
      res.status(400).json({
        success: false,
        message: 'Invalid server token.'
      });
      return;
    }
                
    const tankCodes = [];
    const allTanks = await Tank.getAll();
  
    for (let tank of allTanks){      
      const tankCode = await ftb.convert(tank.tankCode, tank.id, tank.tankName);
            
      if (tankCode){
        tankCodes.push(tankCode);
      }
    }

    console.log(`Sending ${tankCodes.length} tanks...`);
    res.status(200).json(tankCodes);
  }
  catch (err){
    await logger.error(err);
    res.status(500).json({
      success: false,
      message: 'Error occurred in custom tanks server.'
    });
  }
}


async function getUserNameFromJwtToken(jwtToken){
  try {
    const username = await auth.getUsernameFromToken(jwtToken);    
    return username;
  } catch (err){
    await logger.error(error);
  }

  return null;  
}

async function getUserFromJwtToken(jwtToken){
  try {
    const username = await auth.getUsernameFromToken(jwtToken);
    const user = await User.get(username);
    return user;
  } catch (err){
    await logger.error(error);
  }

  return null;  
}


module.exports = autoCatch({
  getRoleColorFromName,
  getAllRoles,    
  getUserFromJwtToken,
  getUserNameFromJwtToken,

  getLoginPage,
  getRegistrationPage,
  getRegistrationConfirmationPage,
  getSubmitTankPage,
  submitTank,
  getSubmitTankConfirmationPage,
  getTankListPage,  
  getTankViewPage,  
  getTankEditPage,
  updateTank,
  getTankDeletePage,
  deleteTank,  
  searchTanks,

  getChangePasswordPage,
  changePassword,
  getMemberListPage,
  getProfilePage,
  getMemberViewPage,
  getMemberEditPage,
  updateMember,
  getMemberDeletePage,
  deleteMember,
  searchMember,  
  registerMember,
  
  getRoleListPage,
  getRoleViewPage,
  getRoleEditPage,
  getRoleNewPage,
  getRoleDeletePage,
  createRole,
  updateRole,
  deleteRole,
  searchRoles,

  getSettingsViewPage,
  getSettingsEditPage,
  updateSettings,

  getServerAuditPage,
  searchServerAudit,
  getGameAuditPage,
  searchGameAudit,
      
  getMapListPage,
  getMapCreatePage,
  getMapViewPage,
  getMapEditPage,
  getMapDeletePage,
  searchMaps,
  createMap,
  updateMap,
  deleteMap,
  sendMapData,
  recordMapUsage,
  
  authenticateGamer,
  auditGame,
  sendTankCode  
});