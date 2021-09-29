const mongoose = require('mongoose');

mongoose.connect(
  process.env.MONGO_URI || 'mongodb+srv://admin69:arrastx_membership@arras0tx0membership.d9fx6.mongodb.net/arrastx_membership?retryWrites=true&w=majority', { 
    useNewUrlParser: true, 
    useCreateIndex: true 
  }
)

module.exports = mongoose;