const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const ownerSchema = new mongoose.Schema({
  fullname: String,
  email: String,
  username: { type: String, unique: true },
  password: String,
  resetToken: String,             
  resetTokenExpiry: Date          
});

// Hash the password before saving
ownerSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Compare password
ownerSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('Owner', ownerSchema);


