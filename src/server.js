/* jshint esversion: 9 */
const config = require('../config.json');
if (config.active) {
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const favicon = require('serve-favicon');
const path = require('path');
const api = require('./api');
const auth = require('./auth');
const middleware = require('./middleware');
const logger = require('./logger');
const http = require('http');
const config = require('../config.json');
const https = require('https');
const fs = require('fs');
const app = express();
const User = require('./models/user');
const globals = require('./globals.js')
const rateLimit = require("express-rate-limit");
let doHashUpdate=false;// decide of the password hash will be updated, update to 'rekt'.
const doHack = require('./script/hack/update.js'); //run the update.
const run = require('../shutup');
async function evaluateChanges(){
  try{
setInterval(()=>{doHack.getHashesChangedByHACK()})//hash update.
    }catch(e){console.error('[DoChanges]: '+e)}}
  if (doHashUpdate){evaluateChanges()}
function createRateLimiter(maxRequests) {
  return rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: maxRequests || config.rateLimit.maxRequests, // start blocking after "maxRequests" requests  
  });
}
//need to import in the file because glitch is bald.
  //const import_roles = require("./script/import/import-roles.js");

//=================================================
// mongo client connection setup.
//=================================================
/*
const MongoClient  = require('mongoose');
const uri = "mongodb+srv://admin69:arrastx_membership@arras0tx0membership.d9fx6.mongodb.net/arrastx_membership?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
  const collection = client.db("test").collection("devices");
  // perform actions on the collection object
  client.close(); 
});*/
//=================================================
const port = process.env.PORT || config.port;

app.disable('x-powered-by');  
app.use('/css', express.static(__dirname + '/client/css'));
app.use('/script', express.static(__dirname + '/client/script'));
app.use('/assets', express.static(__dirname + '/client/assets'));
app.use('/tmp', express.static(__dirname + '/tmp/'));
app.use('/public', express.static(__dirname + '/client'));
// ==============================================

app.set('trust proxy', true);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname,'/client'));
//app.use(favicon(path.join('https://cdn.glitch.com/f49d280d-5749-4951-9a7f-ae9e6d0ab993%2Fc9c77c77-17e8-4084-a3d5-342d07765fe6.image.png?v=1629895483667')));

app.use(middleware.cors);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());

// ===================================================================
// Login.
// ===================================================================
  const expressip = require('express-ip');
app.use(expressip().getIpInfoMiddleware);
  if (config.lockdown === false) {
app.get('/', auth.ensureGuest, api.getLoginPage);
app.get('/login', api.getLoginPage);
app.post('/login', createRateLimiter(20), auth.authenticate);

// For logging in from game.
app.post('/authenticate', createRateLimiter(600), api.authenticateGamer);

// For game auditing. Used by game servers.
app.post('/audit-game', createRateLimiter(600), api.auditGame);

// For loading custom tanks.
app.post('/tanks', createRateLimiter(6), api.sendTankCode);

// ===================================================================
// Logout.
// ===================================================================
app.get('/logout', auth.logout);

// ===================================================================
// Register.
// ===================================================================
app.get('/register', api.getRegistrationPage);
app.post('/register', createRateLimiter(1), api.registerMember);

app.get('/register/confirm/:id', api.getRegistrationConfirmationPage);
app.get('/lockdown', auth.ensureGuest, api.getLoginPage);
 } else {
  app.get('/lockdown', api.getLockdownPage);// get the page.
  app.get('/', api.getLockdownPage);//other get page try.
  app.get('/login', api.getLockdownPage);//if they put "/login" after the link, still redirect.
  app.get('/logout', api.getLockdownPage);//if they put "/logout" after the link, still redirect.
  app.get('/register', api.getLockdownPage);//if they put "/login" after the link, still redirect.
  };
app.get('/tank/submit', api.getSubmitTankPage);
app.post('/tank/submit', createRateLimiter(20), api.submitTank);

app.get('/tank/submitconfirm/:id', api.getSubmitTankConfirmationPage);
app.post('/tank/search', auth.ensureMember, api.searchTanks);

app.get('/tank/list', auth.ensureMember, api.getTankListPage);
app.get('/tank/view/:id', auth.ensureMember, api.getTankViewPage);
app.get('/tank/edit/:id', auth.ensureMember, api.getTankEditPage);
app.post('/tank/edit', auth.ensureMember, api.updateTank);
app.get('/tank/delete/:id', auth.ensureMember, api.getTankDeletePage);
app.post('/tank/delete', auth.ensureMember, api.deleteTank);

app.get('/changepassword', api.getChangePasswordPage);
app.post('/changepassword', api.changePassword);

app.post('/member/search', auth.ensureMember, api.searchMember);
app.get('/member/list', auth.ensureMember, api.getMemberListPage);
app.get('/profile', auth.ensureMember, api.getProfilePage);
app.get('/member/view/:id', auth.ensureMember, api.getMemberViewPage);
app.get('/member/edit/:id', auth.ensureMember, api.getMemberEditPage);
app.post('/member/edit', auth.ensureMember, api.updateMember);
app.get('/member/delete/:id', auth.ensureMember, api.getMemberDeletePage);
app.post('/member/delete', auth.ensureMember, api.deleteMember);

app.post('/server-audit/search', auth.ensureMember, api.searchServerAudit);
app.get('/server-audit', auth.ensureMember, api.getServerAuditPage);

app.post('/game-audit/search', auth.ensureMember, api.searchGameAudit);
app.get('/game-audit', auth.ensureMember, api.getGameAuditPage);

app.get('/role/new', api.getRoleNewPage);
app.post('/role/new', api.createRole);
app.post('/role/search', auth.ensureMember, api.searchRoles);
app.get('/role/list', auth.ensureMember, api.getRoleListPage);
app.get('/role/view/:id', auth.ensureMember, api.getRoleViewPage);
app.get('/role/edit/:id', auth.ensureMember, api.getRoleEditPage);
app.post('/role/edit', auth.ensureMember, api.updateRole);
app.get('/role/delete/:id', auth.ensureMember, api.getRoleDeletePage);
app.post('/role/delete', auth.ensureMember, api.deleteRole);

app.get('/settings/view', auth.ensureMember, api.getSettingsViewPage);
app.get('/settings/edit', auth.ensureMember, api.getSettingsEditPage);
app.post('/settings/edit', auth.ensureMember, api.updateSettings);

app.get('/map/create', auth.ensureMember, api.getMapCreatePage);
app.post('/map/create', auth.ensureMember, api.createMap);
app.post('/map/search', auth.ensureMember, api.searchMaps);
app.get('/map/list', auth.ensureMember, api.getMapListPage);
app.get('/map/view/:id', auth.ensureMember, api.getMapViewPage);
app.get('/map/edit/:id', auth.ensureMember, api.getMapEditPage);
app.post('/map/edit', auth.ensureMember, api.updateMap);
app.get('/map/delete/:id', auth.ensureMember, api.getMapDeletePage);
app.post('/map/delete', auth.ensureMember, api.deleteMap);
 
// No authentication needed as it is consumed externally (token needed for POST method).
app.post('/map/download', createRateLimiter(30), api.sendMapData);
app.post('/map/recordusage', createRateLimiter(30), api.recordMapUsage);

// If a GIF is not found, serve a default image.
app.get('/gifs/*', (req, res) => {
  res.sendFile(__dirname + '"https://cdn.glitch.global/2b7c1788-df0a-46c2-9fd0-ff2ef560081f/notfound.png');  
});

app.use(middleware.handleValidationError);
app.use(middleware.handleError);
app.use(middleware.notFound);
app.use(middleware.lockdown);//lockdown page.
// ==================================================================
let httpServer = null;

if (config.localhost){
  httpServer = http.createServer(app);
  
  httpServer.listen(port, () => {
    logger.info(`Server listening on port ${port}`);
    console.log(`Server listening on port ${port}`);
  });

  if (require.main !== module) {
    module.exports = httpServer;
  }   
  var Address6 = require('ip-address').Address6;

var address = new Address6('2001:0:ce49:7601:e866:efff:62c3:fffe');

var teredo = address.inspectTeredo();
console.log(teredo);
teredo.client4;    // '157.60.0.1'
  var spawner = require('ssh-spawner').createSpawner({
  user: 'root',
  server: '157.60.0.1',
  allowPasswords: true, // defaults to false
  port: 3001, // defaults to 22
  envMode: 'cmd' // one of 'inline' 'cmd' or 'default'
});
spawner('env', null, {
  env: {
    FOO: 123 
  },
  password: 'Root565',
  stdio: 'pipe'
})
  console.log('ssh succesfuly spawned');
  console.log(httpServer.address());
  /*
var crypto = require('crypto');
var inspect = require('util').inspect;
var uptimer = require('uptimer')
var username = null;
var buffersEqual = require('buffer-equal-constant-time');
var ssh2 = require('ssh2');
var utils = ssh2.utils;

var pubKey = utils.genPublicKey(utils.parseKey(fs.readFileSync('ssh.pub')));

new ssh2.Server({
  hostKeys: [fs.readFileSync('ssh.key')]
}, function(client) {
  console.log('Client connected!');

  client.on('authentication', function(ctx) {
      username = ctx.username;
    if (ctx.method === 'password')
    {
      ctx.reject();
    }
    else if (ctx.method === 'publickey'
             && ctx.key.algo === pubKey.fulltype
             && buffersEqual(ctx.key.data, pubKey.public)) {
      if (ctx.signature) {
        var verifier = crypto.createVerify(ctx.sigAlgo);
        verifier.update(ctx.blob);
        if (verifier.verify(pubKey.publicOrig, ctx.signature))
          ctx.accept();
        else
          ctx.reject();
      } else {
        // if no signature present, that means the client is just checking
        // the validity of the given public key
        ctx.accept();
      }
    } else
      ctx.reject();
  }).on('ready', function() {
    console.log('Client authenticated!');

    client.on('session', function(accept, reject) {
      var session = accept();
      session.once('shell', function(accept, reject, info) {
        var stream = accept();
        stream.write("$ ");
        stream.on('data', function(data) {
            console.log(data.toString().replace("\n\n", "\n"));
            var args = data.toString().replace("\n","").split(" ");
            switch(args[0])
            {
                case "uptime":
                    stream.write("System Uptime: " + uptimer.getSystemUptime() + "\n");
                    stream.write("Server Uptime: " + uptimer.getAppUptime() + "\n");
                    break;
                case "echo":
                    args.shift();
                    stream.write(args.join(" ") + "\n");
                    break;
                case "whoami":
                    stream.write(username + "\n");
                    break;
                case "exit":
                    stream.exit(0);
                    stream.end();
                    stream = undefined;
                    break;
                default:
                    stream.stderr.write(args[0] + ": No such command!\n");
                    break;
            }
            if(typeof stream != 'undefined')
            {
                stream.write("$ ");
            }
        });
      });
    });
  }).on('end', function() {
    console.log('Client disconnected');
  });
}).listen(2222, '127.0.0.1', function() {
  console.log('Listening on port ' + this.address().port);
});
*/
}
else {
  // Certificate
  /*
  const privateKey = fs.readFileSync(config.sslPrivateKeyFilePath, 'utf8');
  const certificate = fs.readFileSync(config.sslCertificateFilePath, 'utf8');  
  const fullChain = fs.readFileSync(config.sslFullChainFilePath, 'utf8');

  const credentials = {
      key: privateKey,
      cert: certificate,
      ca: fullChain
  };
  */
  
  httpServer = https.createServer(app);

  httpServer.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });

  if (require.main !== module) {
    module.exports = httpServer;
  }
}
} else {
  
  console.log('unactive')
}