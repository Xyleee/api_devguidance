import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
  // Create a transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  // Define email options
  const mailOptions = {
    from: `DevGuidance Support <${process.env.EMAIL_FROM}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html || null
  };

  // Send the email
  await transporter.sendMail(mailOptions);
};

export const sendApplicationStatusEmail = async (application, status) => {
  let subject = '';
  let message = '';

  if (status === 'accepted') {
    subject = 'DevGuidance - Your Mentor Application has been Approved!';
    message = `
      Hello ${application.fullName},
      
      Great news! We're excited to inform you that your application to become a mentor at DevGuidance has been approved.
      
      You can now log in to our platform using the following credentials:
      Email: ${application.email}
      Password: ${application.password || 'Your temporary password has been sent in a separate email.'}
      
      Please change your password after your first login for security purposes.
      
      Thank you for your interest in sharing your knowledge and expertise with our community.
      
      ${application.adminNote ? `Additional note from our team: ${application.adminNote}` : ''}
      
      Best regards,
      The DevGuidance Team
    `;
  } else if (status === 'rejected') {
    subject = 'DevGuidance - Update on Your Mentor Application';
    message = `
      Hello ${application.fullName},
      
      Thank you for your interest in becoming a mentor at DevGuidance. After careful consideration, we regret to inform you that we are unable to accept your application at this time.
      
      ${application.adminNote ? `Note from our team: ${application.adminNote}` : ''}
      
      We appreciate your interest in our platform and wish you the best in your future endeavors.
      
      Best regards,
      The DevGuidance Team
    `;
  }

  await sendEmail({
    email: application.email,
    subject,
    message
  });
};

export default sendEmail;
