const nodemailer = require('nodemailer');

let transporter;

const buildTransporter = () => {
  if (transporter) {
    return transporter;
  }

  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
  const host = process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 587);
  const service = process.env.EMAIL_SERVICE || process.env.SMTP_SERVICE || (!process.env.EMAIL_HOST && !process.env.SMTP_HOST ? 'gmail' : undefined);

  if (!host || !user || !pass) {
    return null;
  }

  const transportConfig = service
    ? {
        service,
        auth: {
          user,
          pass,
        },
      }
    : {
        host,
        port,
        secure: port === 465,
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
    console.warn('Email failed');
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

module.exports = {
  sendEmail,
};
