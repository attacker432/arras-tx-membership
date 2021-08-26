const mongoose = require('mongoose');

mongoose.connect(
  process.env.MONGO_URI || 'mongodb://localhost:69/', { 
    useNewUrlParser: true, 
    useCreateIndex: true 
  }
)

module.exports = mongoose;