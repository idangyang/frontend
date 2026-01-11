const mongoose = require('mongoose');

const episodeSchema = new mongoose.Schema({
  series: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Series',
    required: true
  },
  episodeNumber: {
    type: String,
    required: true
  },
  sortOrder: {
    type: Number,
    required: true,
    default: 0
  },
  title: {
    type: String,dasdasdasdasd
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  filename: {
    type: String,
    required: true
  },
  filepath: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String,
    default: ''
  },
  duration: {
    type: Number,
    default: 0
  },
  aspectRatio: {
    type: Number,
    default: 1.78
  },
  views: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 确保同一系列中的集数唯一
episodeSchema.index({ series: 1, episodeNumber: 1 }, { unique: true });

module.exports = mongoose.model('Episode', episodeSchema);
