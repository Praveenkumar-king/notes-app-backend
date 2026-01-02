const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },

  // 🔐 Forgot password fields
  resetPasswordToken: String,
  resetPasswordExpire: Date

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
