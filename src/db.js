/*const mongoose = require('mongoose');

mongoose.connect(
  process.env.MONGO_URI || 'mongodb+srv://admin69:arrastx_membership@arras0tx0membership.d9fx6.mongodb.net/arrastx_membership?retryWrites=true&w=majority', { 
    useNewUrlParser: true, 
    useCreateIndex: true 
  }
)

module.exports = mongoose; */
// here is where we connect to the database
const mongoose = require('mongoose');
const mongodb_URI =
  "mongodb+srv://cs152ajSum2020:2emSqHY7pwyoHZ9k@cluster0.yjamu.mongodb.net/test?authSource=admin&replicaSet=Cluster0-shard-0&readPreference=primary&appname=MongoDB%20Compass&ssl=true"; //process.env.MONGODB_URI
//const mongodb_URI = 'mongodb+srv://tjhickey:WcaLKkT3JJNiN8dX@cluster0.kgugl.mongodb.net/atlasAuthDemo?retryWrites=true&w=majority' //process.env.MONGODB_URI
const dbURL = mongodb_URI;
mongoose.connect(dbURL, { useUnifiedTopology: true });

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function() {
  console.log("we are connected!!!");
});
module.exports = mongoose;