// models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  from: {
    type: String,
    required: true,
    trim: true
  },
  to: {
    type: String,
    required: true,
    trim: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String,
    default: ''
  },
  isGroup: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Add indexes for better query performance
messageSchema.index({ from: 1, to: 1, timestamp: 1 });
messageSchema.index({ timestamp: 1 });

module.exports = mongoose.model('Message', messageSchema);