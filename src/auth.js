/* jshint esversion: 9 */
const jwt = require('jsonwebtoken');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const User = require('./models/user');
const autoCatch = require('./lib/auto-catch');
const logger = require('./logger');
const sha256 = require('./sha256');
const globals = require('./globals');
const ServerAudit = require('./models/server-audit');

const jwtSecret = process.env.JWT_SECRET || 'autyn7tyl0708e8tz6fpa1xsd465gckfkafb7jnq893f2e8tz6fpa3xlf';
const jwtOpts = { algorithm: 'HS256', expiresIn: '12h' };

async function createAudit(userid, username, action){
  const audit = {
    userid: userid,
    username: username,    
    action: action,
    actionDate: new Date()
  };
  await ServerAudit.create(audit);
}

passport.use(new LocalStrategy({    
    usernameField: 'username', // Default is "username".
    passwordField: 'password',    
  },

  async function (username, password, cb) {    
    try {      
      const user = await User.get(username);

      if (!user){        
        return cb('Authentication failed.', true);
      }
      
      const hashedPassword = await sha256.hash(password);
      const isUser = hashedPassword.toUpperCase() === user.passwordHash.toUpperCase();

      if (isUser) {        
        return cb(null, {
          username: user.username,
          status: user.status
        });
      } else {
        const action = `Login failed for user ${user.username} (id: ${user._id}). Wrong password.`;
        await createAudit(user._id, user.username, action);
      }
    }
    catch (err) {
      await logger.error(err);
    }

    cb('Authentication failed.', true);
  }
));


const authenticate = async function(req, res, next) {  
  passport.authenticate('local', {session: false}, async function(err, user) {
    try {
      if (user){
        if (user.status === globals.SuspendedStatus){
          const action = `Suspended user ${user.username} tried to login.`;
          await createAudit(null, user.username, action);
  
          res.status(403).json({
            success: false,
            message: 'Account suspended.'
          });
        }
        else {            
          // Store username in JWT.
          const token = await sign({ username: user.username });
              
          // Store the JWT token in database so that we can add it to blacklisted tokens
          // after a user has been suspended.
          const dbUser = await User.get(user.username);
          dbUser.jwtToken = token;
          await dbUser.save();
  
          const action = `User ${dbUser.username} (id: ${dbUser._id}) logged in.`;
          await createAudit(dbUser._id, dbUser.username, action);
            
          res.cookie('jwt', token, { 
            httpOnly: true, 
            sameSite: true,
            // 3 hours in milliseconds.
            maxAge: 10800000
          });
          
          res.json({
            success: true,
            token: token,
            username: dbUser.username,
            role: dbUser.role,
            status: dbUser.status,
            lastUpdatedBy: dbUser.lastUpdatedBy,
            redirectUrl: '/profile'
          });
        }
      }
      else {
        res.status(401).json({
          success: true,
          message: err ? err : 'Authentication failed.'
        });
        return next(err);
      }
    }
    catch (error){
      await logger.error(error);

      res.status(500).json({
        success: false,
        message: error.message ? error.message : 'Internal Server Error.'
      });
      return next(err);
    }
    
  })(req, res, next);
};


async function login (req, res, next) {
  if (req.user.status === globals.SuspendedStatus){
    const action = `Suspended user ${req.user.username} tried to login.`;
    await createAudit(null, req.user.username, action);

    res.status(403).json({
      success: false,
      message: 'Account suspended.'
    })
  }
  else {    
    // Store username in JWT.
    const token = await sign({ username: req.user.username });
    
    // Store the JWT token in database so that we can add it to blacklisted tokens
    // after a user has been suspended.
    const user = await User.get(req.user.username);
    if (user){
      user.jwtToken = token;
      await user.save();      
    }

    const action = `User ${user.username} (id: ${user._id}) logged in.`;
    await createAudit(user._id, user.username, action);
    await ServerAudit.deleteAll();
    
    res.cookie('jwt', token, { httpOnly: true, sameSite: true });
    res.json({
      success: true,
      token: token,
      username: user.username,
      role: user.role,
      status: user.status,
      lastUpdatedBy: user.lastUpdatedBy,
      redirectUrl: '/profile'
    });
  }
}


async function isTokenBlacklisted(jwtString){
  const foundToken = globals.BlacklistedTokens.find(token => token === jwtString);
  if (foundToken){
    return true;
  }

  return false;
}

async function getUsernameFromToken(jwtString){
  try {
    if (!jwtString){
      return null;
    }
    
    if (await isTokenBlacklisted(jwtString)){
      return null;
    }

    const payload = await verify(jwtString);
    
    if (payload && payload.username) {
      return payload.username;
    }
  }
  catch (err){
    await logger.error(err);
  }

  return null;
}

async function isAuthenticated (jwtString) {
  const username = await getUsernameFromToken(jwtString);

  if (username){
    const user = User.get(username);
    if (user){
      return true;
    }
  }

  return false;
}

async function logout (req, res, next) {
  try {
    const jwtString = req.headers.authorization || req.cookies.jwt;

    if (jwtString){
      const username = await getUsernameFromToken(jwtString);

      if (username){
        const user = await User.get(username);
        if (user){
          const action = `User ${user.username} (id: ${user._id}) logged out.`;
          await createAudit(user._id, user.username, action);
        }
      }

      globals.BlacklistedTokens.push(jwtString);
    }
  }
  catch (err){
    await logger.error(err);
  }

  res.redirect('/login');
}

async function sign (payload) {
  const token = await jwt.sign(payload, jwtSecret, jwtOpts);
  return token;
}


async function ensureGuest (req, res, next) {
  const jwtString = req.headers.authorization || req.cookies.jwt;

  const loggedIn = await isAuthenticated(jwtString);

  if (loggedIn){
    if (req.method === "GET"){      
      res.redirect('/profile');
    }
    else if (req.method === "POST") {      
      res.json({
        success: true,
        redirectUrl: '/profile' 
      });      
    } 
    
    return;
  }  

  return next();
}

async function ensureMember (req, res, next) {
  const jwtString = req.headers.authorization || req.cookies.jwt;
  const loggedIn = await isAuthenticated(jwtString);

  if (!loggedIn){
    if (req.method === "GET"){      
      res.redirect('/login');
    }
    else if (req.method === "POST") {      
      res.json({
        success: false,
        message: 'Please login',
        redirectUrl: '/login' 
      });      
    } 
    
    return;
  }  

  return next();
}

async function verify (jwtString = '') {
  jwtString = jwtString.replace(/^Bearer /i, '');

  try {
    const payload = await jwt.verify(jwtString, jwtSecret);
    return payload;
  } catch (err) {
    await logger.error(err);
  }
}


module.exports = {
  sign,
  verify,
  authenticate,  
  getUsernameFromToken,
  login: autoCatch(login),
  logout: autoCatch(logout),
  ensureMember: autoCatch(ensureMember),  
  ensureGuest: autoCatch(ensureGuest)  
};