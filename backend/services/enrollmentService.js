const Enrollment = require('../models/Enrollment');
const { sendCourseEnrollmentEmail } = require('./emailService');

const enrollUserInCourse = async ({ course, user }) => {
  const userId = user._id.toString();
  const alreadyEnrolled = course.enrolledUsers.some((entry) => entry.toString() === userId);
  const existingEnrollment = await Enrollment.findOne({ userId: user._id, courseId: course._id });

  if (!alreadyEnrolled) {
    course.enrolledUsers.push(user._id);
  }

  const requestEntry = (course.enrollmentRequests || []).find(
    (entry) => entry.user.toString() === userId
  );
  if (requestEntry) {
    requestEntry.status = 'approved';
  }

  await course.save();

  await Enrollment.findOneAndUpdate(
    { userId: user._id, courseId: course._id },
    { $setOnInsert: { userId: user._id, courseId: course._id, enrolledAt: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  if (!existingEnrollment) {
    try {
      await sendCourseEnrollmentEmail(user.email, course.title);
    } catch (error) {
      console.error('Email failed:', error.message);
    }
  }

  return {
    alreadyEnrolled,
  };
};

module.exports = {
  enrollUserInCourse,
};