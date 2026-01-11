const mongoose = require('mongoose');

const danmakuSchema = new mongoose.Schema({
  videoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true,dasdasdasdasdas
    maxlength: 100
  },
  time: {
    type: Number,
    required: true
  },
  color: {
    type: String,
    default: '#FFFFFF'
  },
  type: {
    type: String,
    enum: ['scroll', 'top', 'bottom'],
    default: 'scroll'
  },
  isVoice: {
    type: Boolean,
    default: false
  },
  audioUrl: {
    type: String,
    default: null
  },
  duration: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Danmaku', danmakuSchema);
