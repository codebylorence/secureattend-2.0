# Forgot Password Implementation

## Overview
The forgot password feature allows users to reset their password through a secure token-based system.

## Features
- Secure token generation using crypto
- Token expiration (1 hour)
- One-time use tokens
- Email lookup by username or employee email
- Password validation (minimum 6 characters)

## Database Schema

### password_resets Table
```sql
CREATE TABLE password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expiresAt DATETIME NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
);
```

## API Endpoints

### 1. Request Password Reset
**POST** `/api/users/forgot-password`

Request body:
```json
{
  "email": "user@example.com"
}
```

Response:
```json
{
  "message": "If an account with that email exists, a password reset link has been sent.",
  "success": true,
  "resetToken": "token_here" // Only in development mode
}
```

### 2. Verify Reset Token
**GET** `/api/users/verify-reset-token/:token`

Response:
```json
{
  "valid": true,
  "userId": 1
}
```

### 3. Reset Password
**POST** `/api/users/reset-password`

Request body:
```json
{
  "token": "reset_token_here",
  "newPassword": "newpassword123"
}
```

Response:
```json
{
  "message": "Password has been reset successfully. You can now login with your new password.",
  "success": true
}
```

## Frontend Routes

### /forgot-password
- User enters their email address
- System sends reset instructions
- Shows confirmation message

### /reset-password?token=xxx
- Verifies token validity
- User enters new password
- Confirms password match
- Resets password and redirects to login

## User Flow

1. User clicks "Forgot Password?" on login page
2. User enters email address
3. System generates reset token and stores in database
4. In production: Email sent with reset link
5. In development: Token logged to console
6. User clicks reset link (or navigates to reset page with token)
7. System verifies token is valid and not expired
8. User enters new password
9. System updates password and marks token as used
10. User redirected to login with success message

## Security Features

- Tokens are hashed using SHA-256 before storage
- Tokens expire after 1 hour
- Tokens can only be used once
- Old unused tokens are deleted when new ones are created
- Generic success message prevents user enumeration
- Password must be at least 6 characters

## Development Mode

In development (`NODE_ENV=development`), the reset token is returned in the API response and logged to the console. This allows testing without email configuration.

In production, remove the `resetToken` from the response and implement email sending.

## Email Integration

The system now includes full email functionality using Nodemailer.

### Quick Setup (Gmail)

1. Enable 2-Step Verification in your Google Account
2. Generate an App Password (Security > App passwords)
3. Update backend/.env:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
SYSTEM_NAME=SecureAttend
```

4. Test configuration:
```bash
cd backend
node scripts/testEmailConfig.js
```

### Detailed Setup Guide

See [EMAIL_SETUP_GUIDE.md](./EMAIL_SETUP_GUIDE.md) for:
- Complete Gmail setup instructions
- Other email providers (Outlook, Yahoo, custom SMTP)
- Production deployment on Render
- Troubleshooting common issues
- Professional email services (SendGrid, AWS SES, Mailgun)

### Development Mode

If email is not configured:
- Reset token is logged to console
- Token is returned in API response (development only)
- You can manually construct reset URL with the token

## Testing

Run the test script:
```bash
node backend/scripts/testForgotPassword.js
```

This will:
1. Request a password reset for admin
2. Verify the token
3. Reset the password
4. Attempt to reuse the token (should fail)

After testing, reset admin password:
```bash
node backend/scripts/resetAdminPassword.js
```

## Files Modified/Created

### Backend
- `backend/models/passwordReset.js` - Password reset model
- `backend/services/authService.js` - Added reset functions
- `backend/controllers/authController.js` - Added reset endpoints
- `backend/routes/userRoutes.js` - Added reset routes
- `backend/migrations/20260222000001-create-password-resets.cjs` - Migration
- `backend/scripts/createPasswordResetTable.js` - Table creation script
- `backend/scripts/testForgotPassword.js` - Test script
- `backend/scripts/resetAdminPassword.js` - Admin password reset utility

### Frontend
- `frontend/src/pages/ForgotPassword.jsx` - Forgot password page
- `frontend/src/pages/ResetPassword.jsx` - Reset password page
- `frontend/src/pages/Login.jsx` - Updated forgot password button
- `frontend/src/router/AppRouter.jsx` - Added new routes

## Notes

- The system looks up users by email in two ways:
  1. Direct username match (for admin accounts)
  2. Employee email lookup (for employee accounts)
- Tokens are stored as SHA-256 hashes for security
- The system prevents timing attacks by always returning the same message
- Old unused tokens are automatically cleaned up when new ones are created
