import nodemailer from 'nodemailer';

// Create reusable transporter
let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    // Check if email is configured
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('⚠️  Email not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env');
      return null;
    }

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    console.log('✅ Email transporter configured');
  }
  return transporter;
};

export const sendPasswordResetEmail = async (email, resetToken) => {
  const transport = getTransporter();
  
  if (!transport) {
    console.log('📧 Email not configured - token logged to console instead');
    console.log(`🔑 Reset token for ${email}: ${resetToken}`);
    return { sent: false, reason: 'Email not configured' };
  }

  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: `"${process.env.SYSTEM_NAME || 'SecureAttend'}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>We received a request to reset your password for your ${process.env.SYSTEM_NAME || 'SecureAttend'} account.</p>
              <p>Click the button below to reset your password:</p>
              <center>
                <a href="${resetLink}" class="button">Reset Password</a>
              </center>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #667eea;">${resetLink}</p>
              <div class="warning">
                <strong>⚠️ Important:</strong>
                <ul>
                  <li>This link will expire in 1 hour</li>
                  <li>If you didn't request this reset, please ignore this email</li>
                  <li>Your password will not change until you create a new one</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${process.env.SYSTEM_NAME || 'SecureAttend'}. All rights reserved.</p>
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Password Reset Request

Hello,

We received a request to reset your password for your ${process.env.SYSTEM_NAME || 'SecureAttend'} account.

Click the link below to reset your password:
${resetLink}

This link will expire in 1 hour.

If you didn't request this reset, please ignore this email. Your password will not change until you create a new one.

© ${new Date().getFullYear()} ${process.env.SYSTEM_NAME || 'SecureAttend'}. All rights reserved.
      `.trim()
    };

    const info = await transport.sendMail(mailOptions);
    console.log('✅ Password reset email sent:', info.messageId);
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    return { sent: false, error: error.message };
  }
};

export const testEmailConnection = async () => {
  const transport = getTransporter();
  
  if (!transport) {
    return { success: false, message: 'Email not configured' };
  }

  try {
    await transport.verify();
    console.log('✅ Email server connection verified');
    return { success: true, message: 'Email server connection successful' };
  } catch (error) {
    console.error('❌ Email server connection failed:', error);
    return { success: false, message: error.message };
  }
};
