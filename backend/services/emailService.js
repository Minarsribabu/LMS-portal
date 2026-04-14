const nodemailer = require('nodemailer');

let transporter;

const buildTransporter = () => {
  if (transporter) {
    return transporter;
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  return transporter;
};

const sendEmail = async ({ to, subject, text }) => {
  const activeTransporter = buildTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!activeTransporter || !from || !to) {
    return { sent: false, reason: 'smtp_not_configured' };
  }

  await activeTransporter.sendMail({
    from,
    to,
    subject,
    text,
  });

  return { sent: true };
};

module.exports = {
  sendEmail,
};
