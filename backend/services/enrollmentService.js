const Enrollment = require('../models/Enrollment');
const { sendEmail } = require('./emailService');

const buildEnrollmentEmailText = (name, courseTitle) => (
  `Hi ${name},\n\nYour enrollment in ${courseTitle} is confirmed.\n\nYou can now open the course detail page to review topics, videos, and transcripts.\n\nHappy learning!`
);

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
    await sendEmail({
      to: user.email,
      subject: 'Course Enrollment Confirmation',
      text: buildEnrollmentEmailText(user.name, course.title),
    });
  }

  return {
    alreadyEnrolled,
  };
};

module.exports = {
  enrollUserInCourse,
};