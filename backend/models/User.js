const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
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
  avatar: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  // GitHub关联字段
  githubId: {
    type: String,
    unique: true,
    sparse: true
  },
  githubName: {
    type: String
  },
  githubEmail: {
    type: String
  },
  githubAvatar: {
    type: String
  },
  githubAccessToken: {
    type: String
  },
  githubRefreshToken: {
    type: String
  }
});

module.exports = mongoose.model('User', UserSchema);