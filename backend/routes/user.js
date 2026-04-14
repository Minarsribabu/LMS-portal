const express = require('express');
const User = require('../models/User');
const Course = require('../models/Course');
const Progress = require('../models/Progress');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');
const { enrollUserInCourse } = require('../services/enrollmentService');

const router = express.Router();

const buildUserProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    return null;
  }

  const enrolledCourses = await Course.find({ enrolledUsers: userId }).select('title description thumbnail sessions level topics createdAt enrolledUsers');

  const baseUser = user.toJSON();

  return {
    ...baseUser,
    profileImage: baseUser.profilePicture || '',
    enrolledCourses: enrolledCourses.map((course) => course.toJSON()),
  };
};

// GET /api/user/profile - Get current user profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const profile = await buildUserProfile(req.user.id);
    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json(profile);
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/user/courses - Get all courses with enrollment status for current user
router.get('/courses', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const courses = await Course.find().sort({ createdAt: 1 });

    const coursesWithStatus = courses.map((course) => {
      const jsonCourse = course.toJSON();
      const isEnrolled = course.enrolledUsers.some((entry) => entry.toString() === userId);

      const request = (course.enrollmentRequests || []).find(
        (entry) => entry.user.toString() === userId
      );

      return {
        ...jsonCourse,
        enrollmentStatus: isEnrolled ? 'approved' : request?.status || 'none',
      };
    });

    return res.status(200).json(coursesWithStatus);
  } catch (error) {
    console.error('Get user courses error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/user/courses/:courseId/request-enrollment - Request enrollment in a course
router.post('/courses/:courseId/request-enrollment', verifyToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const isEnrolled = course.enrolledUsers.some((entry) => entry.toString() === userId);
    if (isEnrolled) {
      return res.status(400).json({ error: 'Already enrolled in this course' });
    }

    const existingRequest = (course.enrollmentRequests || []).find(
      (entry) => entry.user.toString() === userId
    );

    if (existingRequest?.status === 'pending') {
      return res.status(200).json({ message: 'Enrollment request is already pending', enrollmentStatus: 'pending' });
    }

    if (existingRequest?.status === 'rejected') {
      existingRequest.status = 'pending';
      existingRequest.requestedAt = new Date();
    } else if (!existingRequest) {
      course.enrollmentRequests.push({ user: userId, status: 'pending' });
    }

    await course.save();
    return res.status(200).json({ message: 'Enrollment request submitted', enrollmentStatus: 'pending' });
  } catch (error) {
    console.error('Request enrollment error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/user/courses/:courseId/enroll - Enroll in a course and create an enrollment record
router.post('/courses/:courseId/enroll', verifyToken, authorizeRoles('user'), async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const isEnrolled = course.enrolledUsers.some((entry) => entry.toString() === userId);
    if (isEnrolled) {
      return res.status(200).json({ message: 'You are already enrolled in this course', enrollmentStatus: 'approved' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await enrollUserInCourse({ course, user });

    return res.status(200).json({
      message: 'Course enrollment confirmed',
      enrollmentStatus: 'approved',
    });
  } catch (error) {
    console.error('Enroll course error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/user/progress - Mark topic as completed for a user
router.post('/progress', verifyToken, async (req, res) => {
  try {
    const { courseId, topicId, status } = req.body;
    const userId = req.user.id;

    if (!courseId || !topicId) {
      return res.status(400).json({ error: 'courseId and topicId are required' });
    }

    if (status && status !== 'completed') {
      return res.status(400).json({ error: 'Only completed status is supported' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const isEnrolled = course.enrolledUsers.some((entry) => entry.toString() === userId);
    if (!isEnrolled) {
      return res.status(403).json({ error: 'You are not enrolled in this course' });
    }

    const topicExists = (course.topics || []).some((topic) => topic._id.toString() === String(topicId));
    if (!topicExists) {
      return res.status(404).json({ error: 'Topic not found in this course' });
    }

    const progress = await Progress.findOneAndUpdate(
      { userId, courseId, topicId },
      { $set: { status: 'completed', completedAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json({ message: 'Topic marked as completed', progress: progress.toJSON() });
  } catch (error) {
    console.error('Update progress error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/user/progress/:courseId - Get completed topics and percentage for current user
router.get('/progress/:courseId', verifyToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const course = await Course.findById(courseId).select('title topics enrolledUsers');
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const isEnrolled = course.enrolledUsers.some((entry) => entry.toString() === userId);
    if (!isEnrolled) {
      return res.status(403).json({ error: 'You are not enrolled in this course' });
    }

    const progressDocs = await Progress.find({ userId, courseId, status: 'completed' });
    const completedTopicIds = progressDocs.map((item) => item.topicId.toString());

    const totalTopics = Array.isArray(course.topics) ? course.topics.length : 0;
    const completedTopics = totalTopics
      ? course.topics.filter((topic) => completedTopicIds.includes(topic._id.toString())).length
      : 0;
    const progressPercentage = totalTopics ? Math.round((completedTopics / totalTopics) * 100) : 0;

    return res.status(200).json({
      courseId,
      completedTopicIds,
      completedTopics,
      totalTopics,
      progressPercentage,
    });
  } catch (error) {
    console.error('Get progress error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/user/profile - Update user profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { name, email, profilePicture, profileImage } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    const incomingPicture = profilePicture !== undefined ? profilePicture : profileImage;
    const normalizedProfilePicture = typeof incomingPicture === 'string' ? incomingPicture.trim() : incomingPicture;

    // Validation
    if (!name && !normalizedEmail && incomingPicture === undefined) {
      return res.status(400).json({ error: 'At least one field (name, email, or profile picture) is required' });
    }

    if (normalizedProfilePicture && typeof normalizedProfilePicture !== 'string') {
      return res.status(400).json({ error: 'profilePicture must be a base64 string or URL' });
    }

    // Check if email is already taken
    if (normalizedEmail) {
      const existingUser = await User.findOne({ email: normalizedEmail, _id: { $ne: req.user.id } });
      if (existingUser) {
        return res.status(409).json({ error: 'Email already in use' });
      }
    }

    // Update user (exclude password and role)
    const updateData = {};
    if (name) updateData.name = name;
    if (normalizedEmail) updateData.email = normalizedEmail;
    if (incomingPicture !== undefined) updateData.profilePicture = normalizedProfilePicture || '';

    const user = await User.findByIdAndUpdate(req.user.id, updateData, { new: true });

    const profile = await buildUserProfile(user.id);
    return res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        ...profile,
        profileImage: profile.profilePicture || '',
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
