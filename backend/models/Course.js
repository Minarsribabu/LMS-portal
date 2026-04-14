const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    videoUrl: { type: String, default: '', trim: true },
    videoPath: { type: String, default: '', trim: true },
    transcript: { type: String, default: '', trim: true },
    order: { type: Number, default: 0 },
  },
  {
    timestamps: false,
  }
);

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    thumbnail: { type: String, default: '', trim: true },
    sessions: { type: Number, min: 1, default: 1 },
    level: {
      type: String,
      default: 'Beginner',
      enum: ['Beginner', 'Intermediate', 'Advanced'],
    },
    topics: [topicSchema],
    enrolledUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    enrollmentRequests: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        status: {
          type: String,
          enum: ['pending', 'approved', 'rejected'],
          default: 'pending',
        },
        requestedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

courseSchema.set('toJSON', {
  transform: (_, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    ret.enrolledCount = Array.isArray(ret.enrolledUsers) ? ret.enrolledUsers.length : 0;
    if (!Array.isArray(ret.enrollmentRequests)) {
      ret.enrollmentRequests = [];
    }
    if (!Array.isArray(ret.topics)) {
      ret.topics = [];
    }
    return ret;
  },
});

module.exports = mongoose.model('Course', courseSchema);