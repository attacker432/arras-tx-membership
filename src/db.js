const mongoose = require('mongoose');

mongoose.connect(
  process.env.MONGO_URI || 'mongodb://localhost:4000/arras-tx-dashboard.glitch.me', { 
    useNewUrlParser: true, 
    useCreateIndex: true 
  }
)

module.exports = mongoose;