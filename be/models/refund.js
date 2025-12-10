// models/refund.js
const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  bankInfo: {
    accountNumber: { type: String },
    bankName: { type: String },
    accountHolder: { type: String }
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'confirmed'],
    default: 'pending'
  },
  adminNote: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Refund', refundSchema);
