// models/user.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, trim: true },
  password: { type: String, required: true },
  email:    { type: String, unique: true, lowercase: true, trim: true },
  phone:    String,
  address:  String,
  avatar:   String,
  bio:      String,
  note:     String,

  role:     { type: String, enum: ['admin', 'employee', 'customer'], default: 'customer' }
}, { timestamps: true });

// Hash khi save/update mật khẩu
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Hash khi insertMany (seed)
userSchema.pre('insertMany', async function(next, docs) {
  try {
    if (!Array.isArray(docs)) return next();
    for (const doc of docs) {
      if (doc.password && !String(doc.password).startsWith('$2b$')) {
        const salt = await bcrypt.genSalt(10);
        doc.password = await bcrypt.hash(doc.password, salt);
      }
    }
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('User', userSchema);

