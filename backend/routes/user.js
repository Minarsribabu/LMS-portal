const express = require('express');
const User = require('../models/User');
const Course = require('../models/Course');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

const buildUserProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    return null;
  }

  const enrolledCourses = await Course.find({ enrolledUsers: userId }).select('title sessions level createdAt enrolledUsers');

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
