const mongoose = require('mongoose');

mongoose.connect(
  process.env.MONGO_URI || 'mongodb://69.420./sarra-membership', { 
    useNewUrlParser: true, 
    useCreateIndex: true,
    useUnifiedTopology: true
  }
)

module.exports = mongoose;