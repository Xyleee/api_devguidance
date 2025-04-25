import nodemailer from 'nodemailer';

const testEmail = async () => {
  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Verify connection
    await transporter.verify();
    console.log('SMTP connection verified successfully');

    return transporter;
  } catch (error) {
    console.error('SMTP Connection Error:', error);
    throw error;
  }
};

export default testEmail;
