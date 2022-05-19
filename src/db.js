/*const mongoose = require('mongoose');

mongoose.connect(
  process.env.MONGO_URI || 'mongodb+srv://admin69:arrastx_membership@arras0tx0membership.d9fx6.mongodb.net/arrastx_membership?retryWrites=true&w=majority', { 
    useNewUrlParser: true, 
    useCreateIndex: true 
  }
)

module.exports = mongoose; */
// here is where we connect to the database
/*
const mongoose = require('mongoose');
const mongodb_URI =
  "mongodb+srv://LB:Lionim4321@cluster0.w6jgm.mongodb.net/cluster0?retryWrites=true&w=majority"; //process.env.MONGODB_URI
//const mongodb_URI = 'mongodb+srv://tjhickey:WcaLKkT3JJNiN8dX@cluster0.kgugl.mongodb.net/atlasAuthDemo?retryWrites=true&w=majority' //process.env.MONGODB_URI
const dbURL = mongodb_URI;
mongoose.connect(dbURL, {
    useCreateIndex: true, useNewUrlParser: true, useUnifiedTopology: true  });

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function() {
  console.log("we are connected!!!");
});
module.exports = mongoose; */
const mongoose = require('mongoose');

mongoose.connect(
  process.env.MONGO_URI || 'mongodb+srv://NotSus:N0tSusIsVeryC00l@memberdatabase.7qw2l.mongodb.net/?retryWrites=true&w=majority', { 
    useNewUrlParser: true, 
    useCreateIndex: true 
  }
)

module.exports = mongoose; 