# GPA Calculator - Setup Instructions

## Quick Start Guide

### Step 1: Install Node.js Dependencies

Open PowerShell in the project directory and run:

```powershell
npm install
```

This will install all required packages including Next.js, React, MySQL drivers, and authentication libraries.

### Step 2: Setup MySQL Database (XAMPP)

1. **Start XAMPP:**
   - Open XAMPP Control Panel
   - Click "Start" for Apache and MySQL modules
   - Wait for them to turn green

2. **Create Database:**
   - Open browser and go to: http://localhost/phpmyadmin
   - Click "New" in the left sidebar
   - Database name: `gpa_calculator`
   - Collation: `utf8mb4_general_ci`
   - Click "Create"

3. **Import Schema:**
   - Select `gpa_calculator` database
   - Click "Import" tab at the top
   - Click "Choose File" and select: `database/schema.sql`
   - Click "Go" at the bottom
   - You should see "Import has been successfully finished"

### Step 3: Configure Environment Variables

1. **Copy example file:**
   ```powershell
   copy .env.local.example .env.local
   ```

2. **Generate secret key:**
   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **Edit .env.local file:**
   Open `.env.local` in a text editor and update:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=gpa_calculator

   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=paste-the-generated-secret-here
   ```

### Step 4: Run the Application

```powershell
npm run dev
```

The application will start at: http://localhost:3000

### Step 5: Test the Application

**Option A: Use Test Account**
- Email: `test@example.com`
- Password: `password123`

**Option B: Register New Account**
- Go to: http://localhost:3000/register
- Fill in your details
- Click "Register"

## Common Issues and Solutions

### Issue: "Cannot connect to database"
**Solution:**
- Ensure XAMPP MySQL is running (green in control panel)
- Verify database name is `gpa_calculator`
- Check `.env.local` has correct credentials

### Issue: "Module not found" errors
**Solution:**
```powershell
# Delete node_modules and reinstall
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### Issue: "NEXTAUTH_SECRET is not set"
**Solution:**
- Generate a secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Add it to `.env.local`
- Restart the dev server

### Issue: Port 3000 already in use
**Solution:**
```powershell
# Use a different port
$env:PORT=3001; npm run dev
```

## Database Schema Reference

The `database/schema.sql` file creates three tables:

1. **users** - Stores user accounts
2. **subjects** - Stores subjects with year/semester info
3. **results** - Stores grades for each subject

## Next Steps After Setup

1. **Add Subjects:**
   - Go to Dashboard
   - Click "Add Subject"
   - Enter subject details

2. **Add Grades:**
   - Click "Add Grade" next to any subject
   - Enter grade point (0.00 to 4.00)

3. **View GPA:**
   - Cumulative GPA shows at the top
   - Breakdown shows GPA by year/semester
   - Use filters to view specific periods

## Production Deployment (Future)

When ready to deploy:

### Vercel Deployment
1. Push code to GitHub
2. Connect GitHub to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Supabase Database
1. Create Supabase project
2. Run schema.sql in Supabase SQL Editor
3. Update DATABASE_URL in Vercel env variables
4. Modify `src/lib/db.ts` to use PostgreSQL

See README.md for detailed deployment instructions.

## Project Commands

```powershell
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Environment Variables Explained

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | MySQL server address | `localhost` |
| `DB_PORT` | MySQL port number | `3306` |
| `DB_USER` | Database username | `root` |
| `DB_PASSWORD` | Database password | `` (empty for XAMPP) |
| `DB_NAME` | Database name | `gpa_calculator` |
| `NEXTAUTH_URL` | Application URL | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Auth encryption key | Generate with crypto |

## Support

If you encounter any issues:
1. Check XAMPP is running
2. Verify `.env.local` settings
3. Check browser console for errors
4. Restart the development server

---

Happy calculating! 🎓
