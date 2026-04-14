const nodemailer = require('nodemailer');

let transporter;

const buildTransporter = () => {
  if (transporter) {
    return transporter;
  }

  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
  const service = process.env.EMAIL_SERVICE || process.env.SMTP_SERVICE || 'gmail';

  if (!user || !pass) {
    console.warn('Email skipped: EMAIL_USER and EMAIL_PASS are not configured');
    return null;
  }

  const transportConfig = {
    service,
    auth: {
      user,
      pass,
    },
  };

  transporter = nodemailer.createTransport(transportConfig);

  return transporter;
};

const sendEmail = async ({ to, subject, text }) => {
  const activeTransporter = buildTransporter();
  const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.EMAIL_USER || process.env.SMTP_USER;

  if (!activeTransporter || !from || !to) {
    console.warn('Email skipped: SMTP configuration is incomplete');
    return { sent: false, reason: 'smtp_not_configured' };
  }

  try {
    await activeTransporter.sendMail({
      from,
      to,
      subject,
      text,
    });

    console.log('Email sent successfully');
    return { sent: true };
  } catch (error) {
    console.error('Email failed:', error.message);
    return { sent: false, error };
  }
};

const sendWelcomeEmail = async (userEmail, username) => {
  return sendEmail({
    to: userEmail,
    subject: 'Welcome to LMS Portal',
    text: `Hello ${username}, welcome to LMS Portal!`,
  });
};

const sendCourseEnrollmentEmail = async (userEmail, courseName) => {
  return sendEmail({
    to: userEmail,
    subject: 'Course Enrollment Confirmation',
    text: `You have successfully enrolled in ${courseName}`,
  });
};

const sendCourseCompletionEmail = async (userEmail, courseName) => {
  return sendEmail({
    to: userEmail,
    subject: 'Course Completion Congratulations',
    text: `Congratulations! You have successfully completed ${courseName}.`,
  });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendCourseEnrollmentEmail,
  sendCourseCompletionEmail,
};
