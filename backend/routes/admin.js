const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Course = require('../models/Course');
const { verifyToken, verifyTokenFlexible, authorizeRoles, JWT_SECRET } = require('../middleware/authMiddleware');
const { sendEmail } = require('../services/emailService');

const router = express.Router();

const sanitizeTopics = (topics = []) => {
  if (!Array.isArray(topics)) {
    return [];
  }

  return topics
    .map((topic, index) => ({
      title: String(topic?.title || '').trim(),
      videoUrl: String(topic?.videoUrl || topic?.video || '').trim(),
      videoPath: String(topic?.videoPath || topic?.filePath || '').trim(),
      transcript: String(topic?.transcript || '').trim(),
      order: Number.isFinite(Number(topic?.order)) ? Number(topic.order) : index,
    }))
    .filter((topic) => topic.title);
};

const sanitizeCoursePayload = (body = {}) => {
  return {
    title: String(body.title || '').trim(),
    description: String(body.description || '').trim(),
    thumbnail: String(body.thumbnail || '').trim(),
    sessions: body.sessions ? Number(body.sessions) : undefined,
    level: body.level,
    topics: sanitizeTopics(body.topics),
  };
};

const isValidLevel = (level) => ['Beginner', 'Intermediate', 'Advanced'].includes(level);

// POST /api/admin/create-admin - Create new admin (ADMIN ONLY)
router.post('/create-admin', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    // Validation
    if (!name || !normalizedEmail || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Create new admin
    const newAdmin = new User({ name, email: normalizedEmail, password, role: 'admin' });
    await newAdmin.save();

    // Generate token for new admin
    const token = jwt.sign(
      { id: newAdmin._id, email: newAdmin.email, role: newAdmin.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.status(201).json({
      message: 'Admin created successfully',
      admin: newAdmin.toJSON(),
      token,
    });
  } catch (error) {
    console.error('Create admin error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/monitoring/:service - Validate admin and redirect to monitoring URL
router.get('/monitoring/:service', verifyTokenFlexible, authorizeRoles('admin'), async (req, res) => {
  const service = String(req.params.service || '').toLowerCase();
  const allowedTargets = {
    grafana: '/grafana/',
    prometheus: '/prometheus/',
  };

  const target = allowedTargets[service];
  if (!target) {
    return res.status(404).json({ error: 'Unknown monitoring service' });
  }

  return res.redirect(target);
});

// GET /api/admin/courses - List all courses (ADMIN ONLY)
router.get('/courses', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const courses = await Course.find()
      .populate('enrolledUsers', 'name email role')
      .populate('enrollmentRequests.user', 'name email role');
    return res.status(200).json(courses.map((course) => course.toJSON()));
  } catch (error) {
    console.error('Get courses error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/courses - Create a new course (ADMIN ONLY)
router.post('/courses', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { title, sessions, level } = req.body;

    if (!title || !sessions || !level) {
      return res.status(400).json({ error: 'Title, sessions, and level are required' });
    }

    const course = await Course.create({ title, sessions, level, enrolledUsers: [] });
    return res.status(201).json({ message: 'Course created successfully', course: course.toJSON() });
  } catch (error) {
    console.error('Create course error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/courses/:courseId/enroll - Enroll a user into a course (ADMIN ONLY)
router.post('/courses/:courseId/enroll', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { courseId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const alreadyEnrolled = course.enrolledUsers.some((entry) => entry.toString() === userId);
    if (!alreadyEnrolled) {
      course.enrolledUsers.push(userId);
    }

    const requestEntry = (course.enrollmentRequests || []).find(
      (entry) => entry.user.toString() === userId
    );
    if (requestEntry) {
      requestEntry.status = 'approved';
    }

    await course.save();

    if (!alreadyEnrolled) {
      try {
        await sendEmail({
          to: user.email,
          subject: 'Course Registration Confirmation',
          text: `Hi ${user.name},\n\nYou have been enrolled in the course: ${course.title}.\n\nHappy learning!`,
        });
      } catch (emailError) {
        console.warn('Enrollment email failed:', emailError.message);
      }
    }

    const updatedCourse = await Course.findById(courseId).populate('enrolledUsers', 'name email role');
    return res.status(200).json({ message: 'User enrolled successfully', course: updatedCourse.toJSON() });
  } catch (error) {
    console.error('Enroll user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/courses/:id - Remove course (ADMIN ONLY)
router.delete('/courses/:id', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    return res.status(200).json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/course - Create course with optional topics (ADMIN ONLY)
router.post('/course', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const payload = sanitizeCoursePayload(req.body);

    if (!payload.title) {
      return res.status(400).json({ error: 'Course title is required' });
    }

    if (payload.level && !isValidLevel(payload.level)) {
      return res.status(400).json({ error: 'Invalid level value' });
    }

    const course = await Course.create({
      title: payload.title,
      description: payload.description,
      thumbnail: payload.thumbnail,
      sessions: payload.sessions || 1,
      level: payload.level || 'Beginner',
      topics: payload.topics,
      enrolledUsers: [],
      enrollmentRequests: [],
    });

    return res.status(201).json({ message: 'Course created successfully', course: course.toJSON() });
  } catch (error) {
    console.error('Create course (extended) error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/course/:id - Update course and topics (ADMIN ONLY)
router.put('/course/:id', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const payload = sanitizeCoursePayload(req.body);

    if (!payload.title) {
      return res.status(400).json({ error: 'Course title is required' });
    }

    if (payload.level && !isValidLevel(payload.level)) {
      return res.status(400).json({ error: 'Invalid level value' });
    }

    const updateData = {
      title: payload.title,
      description: payload.description,
      thumbnail: payload.thumbnail,
      topics: payload.topics,
    };

    if (payload.sessions) {
      updateData.sessions = payload.sessions;
    }
    if (payload.level) {
      updateData.level = payload.level;
    }

    const updated = await Course.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) {
      return res.status(404).json({ error: 'Course not found' });
    }

    return res.status(200).json({ message: 'Course updated successfully', course: updated.toJSON() });
  } catch (error) {
    console.error('Update course error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/course/:id - Delete course (ADMIN ONLY)
router.delete('/course/:id', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const removed = await Course.findByIdAndDelete(req.params.id);
    if (!removed) {
      return res.status(404).json({ error: 'Course not found' });
    }

    return res.status(200).json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course (extended) error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/course/:id/topic - Add topic to existing course (ADMIN ONLY)
router.post('/course/:id/topic', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const topicPayload = sanitizeTopics([req.body])[0];

    if (!topicPayload?.title) {
      return res.status(400).json({ error: 'Topic title is required' });
    }

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const nextOrder = Number.isFinite(Number(topicPayload.order))
      ? Number(topicPayload.order)
      : course.topics.length;

    course.topics.push({ ...topicPayload, order: nextOrder });
    await course.save();

    return res.status(201).json({ message: 'Topic added successfully', course: course.toJSON() });
  } catch (error) {
    console.error('Add topic error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/users - List all users (ADMIN ONLY)
router.get('/users', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const users = await User.find({});
    return res.status(200).json(users.map(u => u.toJSON()));
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/users/:id - Delete user (ADMIN ONLY)
router.delete('/users/:id', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Cannot delete yourself
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/stats - Get admin statistics (ADMIN ONLY)
router.get('/stats', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const totalRegularUsers = await User.countDocuments({ role: 'user' });
    const totalCourses = await Course.countDocuments();

    return res.status(200).json({
      totalUsers,
      totalAdmins,
      totalRegularUsers,
      totalCourses,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
