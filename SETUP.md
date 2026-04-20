# Configuration Guide

## ⚡ Quick Start (No Email Setup Needed)

Get started immediately without email configuration:

```bash
npm install
npm run dev
```

Visit http://localhost:3000 and login:
- **Username:** `admin`
- **Password:** `admin123`

All features work in **Demo Mode**:
- Create proposals ✅
- Manage companies & services ✅
- Preview proposals ✅
- Send proposals (demo mode, no real emails) ✅

When you're ready to send real emails, follow the email setup section below.

---

## Environment Variables Setup

This project uses environment variables for configuration. Follow these steps to set up your development environment.

### 1. Create `.env.local` file

Copy `.env.example` to `.env.local` and update the values:

```bash
cp .env.example .env.local
```

### 2. Admin Credentials

Update these in `.env.local`:

```env
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin123"
```

**Important for Production:**
- Change these default credentials immediately
- Use strong, unique passwords
- Never commit `.env.local` to version control

### 3. Email Configuration (Optional)

Email functionality is **optional**. The application works in two modes:

#### Without Email Setup (Development Mode - Recommended for Testing)

- Proposal sending works with demo responses
- No actual emails are sent
- Great for testing the proposal workflow
- No SMTP configuration needed

#### With Email Setup (Production Mode)

Configure SMTP settings in `.env.local` to send real emails:

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM_EMAIL="support@yourcompany.com"
```

### Setting Up Gmail

**Important:** Gmail requires an **App Password**, not your regular Gmail password.

#### Step 1: Enable 2-Step Verification

1. Go to https://myaccount.google.com/security
2. Click on "2-Step Verification" 
3. Follow the prompts (you'll need to confirm with your phone)
4. Once enabled, you can generate an App Password

#### Step 2: Generate App Password

1. Go to https://myaccount.google.com/apppasswords
2. You should see a dropdown menu asking "Select the app and device you're using this app password for"
3. Select:
   - **App:** Choose "Mail"
   - **Device:** Choose "Windows Computer" (or your device type)
4. Click "Generate"
5. Google will show a 16-character password in a popup

#### Step 3: Copy the App Password (Important!)

Google shows the password like: `xxxx xxxx xxxx xxxx` (with spaces for readability)

**Copy the password WITHOUT the spaces:**
- ❌ Wrong: `abcd efgh ijkl mnop` (with spaces)
- ✅ Correct: `abcdefghijklmnop` (without spaces)

#### Step 4: Update `.env.local`

```env
SMTP_USER="your-full-email@gmail.com"
SMTP_PASSWORD="abcdefghijklmnop"
SMTP_FROM_EMAIL="your-email@gmail.com"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
```

#### Step 5: Restart Your Development Server

After updating `.env.local`, restart `npm run dev`

You should see `✅ SMTP server is ready to send emails` in the console.

#### Common Gmail Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Username and Password not accepted" | Wrong password or using Gmail password | Use App Password from step above (without spaces) |
| "2-Step verification is not enabled" | 2FA required by Google | Enable 2FA at https://myaccount.google.com/security |
| "Less secure app" warning | Trying to use regular Gmail password | Use App Password instead |
| "Cannot connect to SMTP server" | Wrong host/port | Use `smtp.gmail.com` and port `587` |
| "STARTTLS error" | TLS/SSL settings wrong | Set `SMTP_SECURE="false"` and `SMTP_PORT="587"` |

### Other Email Providers

- **Outlook/Hotmail:** Use SMTP host `smtp-mail.outlook.com`
- **AWS SES:** Use host `email-smtp.[region].amazonaws.com`
- **SendGrid:** Use host `smtp.sendgrid.net` with port `587`
- **Brevo (Sendinblue):** Use host `smtp-relay.brevo.com` with port `587`

### Testing Email Configuration

1. Start the development server: `npm run dev`
2. Login with admin credentials
3. Go to Admin Proposals page
4. Create a proposal with:
   - Company selected
   - Client name entered
   - At least one service selected
5. Go to Preview tab
6. Enter customer email and click "Send Proposal via Email"
7. Check if email was received

### Troubleshooting

- **"Email service not configured":** Make sure all SMTP variables are set in `.env.local`
- **"Failed to send email":** Check SMTP credentials are correct in `.env.local`
- **Gmail: "Less secure app":** Use App Password instead (recommended)
- **Port 587 blocked:** Try port 465 with `SMTP_SECURE="true"`

### Environment Files

- `.env.example` - Template with all available options (commit to repo)
- `.env` - Default values (commit to repo)
- `.env.local` - Local overrides (DO NOT commit)
- `.env.local.test` - Test environment (DO NOT commit)

## Running the Application

### Development (No Email Setup Required)

```bash
npm install
npm run dev
```

Visit http://localhost:3000 and login with admin credentials.

**Demo Mode:** 
- All features work without email configuration
- Proposal sending shows success messages but doesn't send real emails
- Perfect for testing and demos
- Console logs show what would be sent

### Production (Email Setup Required)

```bash
# Set SMTP environment variables in .env.local or your hosting platform
npm run build
npm start
```

Make sure to set all email and admin credentials before deploying.
