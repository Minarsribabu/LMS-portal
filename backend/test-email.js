require('dotenv').config();

const { sendEmail } = require('./services/emailService');

const run = async () => {
  const recipient = process.argv[2] || process.env.EMAIL_USER;

  if (!recipient) {
    console.error('Email failed: Provide recipient as argument or set EMAIL_USER');
    process.exit(1);
  }

  const result = await sendEmail({
    to: recipient,
    subject: 'LMS Portal Email Test',
    text: 'This is a test email from LMS Portal to verify SMTP configuration.',
  });

  if (!result.sent) {
    process.exit(1);
  }
};

run().catch((error) => {
  console.error('Email failed:', error.message);
  process.exit(1);
});
