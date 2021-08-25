const mongoose = require("mongoose");

mongoose.connect(
  process.env.MONGO_URI || "mongodb://arras-tx.andrewspec.repl.co:3000",
  {
    useNewUrlParser: true,
    useCreateIndex: true
  }
);

module.exports = mongoose;
