import express from 'express';
import testEmail from '../utils/testEmail.js';

const router = express.Router();

router.post('/test-email', async (req, res) => {
  try {
    const { to, subject, text } = req.body;

    // Create transporter
    const transporter = await testEmail();

    // Send test email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: to || process.env.EMAIL_USER, // default to self if no recipient specified
      subject: subject || 'Test Email from DevGuidance',
      text: text || 'This is a test email from DevGuidance application.',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2563eb;">DevGuidance Test Email</h2>
          <p>${text || 'This is a test email from DevGuidance application.'}</p>
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #666; font-size: 12px;">This is an automated test message.</p>
        </div>
      `
    });

    console.log('Test email sent:', info.messageId);

    res.status(200).json({
      success: true,
      message: 'Test email sent successfully',
      messageId: info.messageId
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending test email',
      error: error.message
    });
  }
});

export default router;
