# Email Setup Guide for Forgot Password Feature

## Overview
The forgot password feature requires email configuration to send password reset links to users. This guide will help you set up email using Gmail or other SMTP providers.

## Option 1: Gmail (Recommended for Development)

### Step 1: Enable 2-Step Verification
1. Go to your Google Account: https://myaccount.google.com/
2. Click on "Security" in the left sidebar
3. Under "Signing in to Google", click "2-Step Verification"
4. Follow the steps to enable 2-Step Verification

### Step 2: Generate App Password
1. After enabling 2-Step Verification, go back to Security
2. Click on "App passwords" (under "Signing in to Google")
3. Select app: Choose "Mail"
4. Select device: Choose "Other" and enter "SecureAttend"
5. Click "Generate"
6. Copy the 16-character password (remove spaces)

### Step 3: Update .env File
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
SYSTEM_NAME=SecureAttend
```

### Step 4: Test Configuration
```bash
cd backend
node scripts/testEmailConfig.js
```

## Option 2: Other Email Providers

### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

### Yahoo Mail
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password
```
Note: Yahoo also requires app passwords. Generate one at: https://login.yahoo.com/account/security

### Custom SMTP Server
```env
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your-password
```

## Production Setup (Render)

### Step 1: Add Environment Variables
1. Go to your Render dashboard
2. Select your backend service
3. Go to "Environment" tab
4. Add the following variables:
   - `SMTP_HOST`: smtp.gmail.com
   - `SMTP_PORT`: 587
   - `SMTP_SECURE`: false
   - `SMTP_USER`: your-email@gmail.com
   - `SMTP_PASS`: your-app-password
   - `SYSTEM_NAME`: SecureAttend
   - `FRONTEND_URL`: https://secureattend-2-0.vercel.app

### Step 2: Redeploy
After adding environment variables, Render will automatically redeploy your service.

## Testing Email Functionality

### Test 1: Check SMTP Connection
```bash
cd backend
node scripts/testEmailConfig.js
```

This will:
- Verify SMTP connection
- Send a test email to your configured email address

### Test 2: Test Full Password Reset Flow
```bash
cd backend
node scripts/testForgotPassword.js
```

This will:
- Request password reset
- Generate token
- Send email (if configured)
- Verify token
- Reset password

### Test 3: Test from Frontend
1. Start your backend: `npm run dev` (in backend folder)
2. Start your frontend: `npm run dev` (in frontend folder)
3. Go to http://localhost:5173/login
4. Click "Forgot Password?"
5. Enter your email address
6. Check your email inbox

## Troubleshooting

### "Email not configured" message
- Make sure all SMTP_* variables are set in .env
- Restart your backend server after updating .env

### "Invalid login" or "Authentication failed"
- For Gmail: Make sure you're using an App Password, not your regular password
- For Gmail: Make sure 2-Step Verification is enabled
- Check that SMTP_USER and SMTP_PASS are correct

### "Connection timeout"
- Check your firewall settings
- Try using port 465 with SMTP_SECURE=true
- Some networks block SMTP ports

### Email goes to spam
- Add a proper "From" name in emailService.js
- Consider using a professional email service like SendGrid or AWS SES for production
- Set up SPF, DKIM, and DMARC records for your domain

### No email received
- Check spam/junk folder
- Verify the email address exists in the system
- Check backend console logs for errors
- Run testEmailConfig.js to verify configuration

## Development Mode Fallback

If email is not configured, the system will:
1. Log the reset token to the console
2. Return the token in the API response (development only)
3. You can manually construct the reset URL:
   ```
   http://localhost:5173/reset-password?token=YOUR_TOKEN_HERE
   ```

## Security Best Practices

1. **Never commit .env file**: Already in .gitignore
2. **Use App Passwords**: Don't use your main email password
3. **Rotate passwords**: Change app passwords periodically
4. **Monitor usage**: Check for unusual email sending activity
5. **Rate limiting**: Consider adding rate limits to prevent abuse
6. **Use professional service in production**: Consider SendGrid, AWS SES, or Mailgun

## Professional Email Services (Production)

For production, consider using dedicated email services:

### SendGrid
- Free tier: 100 emails/day
- Easy setup with API key
- Better deliverability
- https://sendgrid.com/

### AWS SES
- Very cheap ($0.10 per 1000 emails)
- Requires AWS account
- Excellent deliverability
- https://aws.amazon.com/ses/

### Mailgun
- Free tier: 5000 emails/month
- Simple API
- Good documentation
- https://www.mailgun.com/

## Email Template Customization

To customize the email template, edit `backend/services/emailService.js`:

```javascript
const mailOptions = {
  from: `"Your Company" <${process.env.SMTP_USER}>`,
  to: email,
  subject: 'Your Custom Subject',
  html: `Your custom HTML template`,
  text: `Your custom plain text version`
};
```

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Run `node scripts/testEmailConfig.js` for diagnostics
3. Check backend console logs for detailed error messages
4. Verify all environment variables are set correctly
