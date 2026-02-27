# Email Verification Setup Guide

## Web3Forms Configuration

The app uses Web3Forms to send verification codes via email. Follow these steps to set it up:

### 1. Get Your Web3Forms Access Key

1. Go to [Web3Forms](https://web3forms.com/)
2. Click "Get Started" or "Sign Up"
3. Create a free account
4. Once logged in, you'll see your **Access Key**
5. Copy the access key

### 2. Add Access Key to Environment

Open `.env.local` and add your Web3Forms access key:

```env
WEB3FORMS_ACCESS_KEY=your-actual-access-key-here
```

### 3. How It Works

**Login Flow:**
1. User enters their email address
2. System sends a 6-digit verification code to their email
3. User enters the verification code
4. User enters their password
5. User is logged in

**Registration Flow:**
- User registers with email and password
- Account is created but not verified
- User must verify email on first login

### 4. Testing

To test the email verification:

```powershell
# Start the development server
npm run dev
```

1. Register a new account at `http://localhost:3000/register`
2. Go to login page `http://localhost:3000/login`
3. Enter your email
4. Check your email for the 6-digit code
5. Enter the code
6. Enter your password
7. You're logged in!

### 5. Verification Code Details

- **Code Length**: 6 digits
- **Expiration**: 10 minutes
- **One-time use**: Each code can only be used once
- **Format**: Numeric (e.g., 123456)

### 6. Database Schema

The verification system uses a new table:

```sql
verification_codes
├── id (INT)
├── user_id (INT) - Foreign key to users
├── email (VARCHAR)
├── code (VARCHAR) - 6-digit code
├── expires_at (DATETIME) - Expiration time
├── used (BOOLEAN) - Whether code was used
└── created_at (DATETIME)
```

### 7. API Endpoints

**Send Verification Code:**
```
POST /api/auth/send-code
Body: { "email": "user@example.com" }
```

**Verify Code:**
```
POST /api/auth/verify-code
Body: { "email": "user@example.com", "code": "123456" }
```

### 8. Security Features

- ✅ Codes expire after 10 minutes
- ✅ Codes are one-time use only
- ✅ Email must match existing user
- ✅ Failed attempts are logged
- ✅ Codes are stored securely in database

### 9. Troubleshooting

**"Failed to send verification email"**
- Check your Web3Forms access key is correct
- Verify you have internet connection
- Check Web3Forms dashboard for quota limits

**"Invalid or expired verification code"**
- Code may have expired (10 minutes)
- Code may have already been used
- Check for typos in the code

**"No account found with this email"**
- User must register first
- Check email spelling

### 10. Production Deployment

For production (Vercel), add the environment variable:

1. Go to Vercel Dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add: `WEB3FORMS_ACCESS_KEY` with your access key
5. Redeploy the application

### 11. Alternative Email Services

If you prefer to use a different email service, you can modify `src/lib/email.ts` to use:
- **SendGrid**
- **Mailgun**
- **AWS SES**
- **Nodemailer with SMTP**

Just replace the `sendVerificationCode` method implementation.

---

## Quick Start

```powershell
# 1. Get Web3Forms key from https://web3forms.com/
# 2. Add to .env.local
WEB3FORMS_ACCESS_KEY=your-key-here

# 3. Run the app
npm run dev

# 4. Test login with email verification
```

That's it! Your email verification system is ready to use.
