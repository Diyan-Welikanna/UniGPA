# GPA Calculator - Next.js + MySQL

A full-stack GPA calculator application built with Next.js 14, TypeScript, and MySQL. Track your academic performance with semester, year, multi-year, and cumulative GPA calculations.

## Features

- **User Authentication**: Secure login and registration system with email verification
- **Email Verification**: Two-factor authentication via verification codes sent to email
- **Subject Management**: Add, edit, and delete subjects with year/semester organization
- **Grade Tracking**: Record grades and completion status for each subject
- **Multi-level GPA Calculation**:
  - Semester GPA
  - Year GPA (all semesters in a year)
  - Multi-Year GPA (selected years)
  - Cumulative GPA (all years)
- **Interactive Dashboard**: 
  - Visual GPA breakdown by year and semester
  - Filterable subject list
  - Include/exclude incomplete subjects
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MySQL (XAMPP for local development) with Prisma ORM
- **Authentication**: NextAuth.js with email verification
- **Email Service**: Web3Forms for verification codes
- **ORM**: Prisma

## Prerequisites

- Node.js 18+ installed
- XAMPP or MySQL server installed
- Git (optional)

## Local Setup (XAMPP + MySQL)

### 1. Install Dependencies

```powershell
cd "c:\Users\D\Desktop\Projects\GPA- Calculator"
npm install
```

### 2. Setup XAMPP MySQL Database

1. Start XAMPP Control Panel
2. Start Apache and MySQL services
3. Open phpMyAdmin (http://localhost/phpmyadmin)
4. Import the database schema:
   - Click "Import" tab
   - Choose file: `database/schema.sql`
   - Click "Go"

Alternatively, run the SQL directly:
```sql
-- Copy and paste the contents of database/schema.sql into phpMyAdmin SQL tab
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Copy from example
copy .env.local.example .env.local
```

Edit `.env.local` with your settings:

```env
# Database Configuration (XAMPP MySQL)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=gpa_calculator

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-change-this-in-production
```

**Generate NEXTAUTH_SECRET:**
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Run the Development Server

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Test the Application

Default test account (created by schema.sql):
- **Email**: test@example.com
- **Password**: password123

Or register a new account at: http://localhost:3000/register

## Database Schema

### Users Table
```sql
- id (INT, PRIMARY KEY)
- name (VARCHAR)
- email (VARCHAR, UNIQUE)
- password (VARCHAR, hashed)
- created_at, updated_at (TIMESTAMP)
```

### Subjects Table
```sql
- id (INT, PRIMARY KEY)
- user_id (INT, FOREIGN KEY)
- subject_name (VARCHAR)
- credits (DECIMAL)
- year (INT)
- semester (INT)
- created_at, updated_at (TIMESTAMP)
```

### Results Table
```sql
- id (INT, PRIMARY KEY)
- subject_id (INT, FOREIGN KEY, UNIQUE)
- grade_point (DECIMAL, 0.00-4.00)
- status (ENUM: 'Completed', 'Incomplete')
- created_at, updated_at (TIMESTAMP)
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/signin` - Login (NextAuth)
- `POST /api/auth/signout` - Logout (NextAuth)

### Subjects
- `GET /api/subjects` - Get all subjects (with optional filters)
- `POST /api/subjects` - Create new subject
- `GET /api/subjects/[id]` - Get single subject
- `PUT /api/subjects/[id]` - Update subject
- `DELETE /api/subjects/[id]` - Delete subject

### Results
- `GET /api/results?subject_id=X` - Get result for subject
- `POST /api/results` - Create/update result
- `DELETE /api/results?subject_id=X` - Delete result

### GPA Calculations
- `GET /api/gpa?type=cumulative` - Get cumulative GPA
- `GET /api/gpa?type=semester&year=1&semester=1` - Get semester GPA
- `GET /api/gpa?type=year&year=1` - Get year GPA
- `GET /api/gpa?type=multi-year&years=1,2` - Get multi-year GPA
- `GET /api/gpa?type=breakdown` - Get complete breakdown

## GPA Calculation Formula

$$
\text{GPA} = \frac{\sum (\text{Grade Point} \times \text{Credits})}{\sum \text{Credits}}
$$

- Grade Point Scale: 0.00 - 4.00
- Credits: 0.5 - 10.0 per subject

## Deployment

### Option 1: Vercel + Supabase (Recommended for Production)

#### 1. Setup Supabase Database

1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Go to SQL Editor and run `database/schema.sql`
4. Get connection string from Project Settings > Database
5. Update connection string format:
   ```
   postgresql://user:password@host:5432/database
   ```

#### 2. Deploy to Vercel

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) and import repository
3. Add environment variables:
   ```
   DATABASE_URL=postgresql://...
   NEXTAUTH_URL=https://your-app.vercel.app
   NEXTAUTH_SECRET=your-generated-secret
   ```
4. Deploy!

#### 3. Update Database Connection

Modify `src/lib/db.ts` for PostgreSQL (Supabase):

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default pool;
```

Update `package.json`:
```json
"dependencies": {
  "pg": "^8.11.3",
  ...
}
```

### Option 2: Deploy with MySQL

You can also deploy to:
- **PlanetScale** (MySQL-compatible)
- **Railway** (supports MySQL)
- **DigitalOcean** (MySQL droplet)

Just update the `DATABASE_URL` environment variable accordingly.

## Project Structure

```
GPA-Calculator/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── [...nextauth]/route.ts
│   │   │   │   └── register/route.ts
│   │   │   ├── subjects/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── results/route.ts
│   │   │   └── gpa/route.ts
│   │   ├── dashboard/
│   │   │   ├── page.tsx
│   │   │   └── layout.tsx
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── lib/
│   │   ├── db.ts
│   │   └── gpaCalculator.ts
│   └── types/
│       ├── index.ts
│       └── next-auth.d.ts
├── database/
│   └── schema.sql
├── .env.local.example
├── .gitignore
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── next.config.js
└── README.md
```

## Usage Guide

### 1. Register/Login
- Create an account or login with existing credentials

### 2. Add Subjects
- Click "Add Subject" button
- Enter subject name, credits, year, and semester
- Click "Add"

### 3. Add Grades
- Click "Add Grade" next to a subject
- Enter grade point (0.00-4.00)
- Select status (Completed/Incomplete)

### 4. View GPA
- Dashboard shows cumulative GPA at the top
- Breakdown section shows GPA by year and semester
- Use filters to view specific years/semesters

### 5. Manage Subjects
- Edit or delete subjects as needed
- Update grades by deleting and re-adding results

## Troubleshooting

### Database Connection Error
- Verify XAMPP MySQL is running
- Check `.env.local` credentials match XAMPP settings
- Ensure database `gpa_calculator` exists

### Authentication Issues
- Verify `NEXTAUTH_SECRET` is set in `.env.local`
- Clear browser cookies and try again
- Check console for error messages

### Build Errors
- Delete `node_modules` and `.next` folders
- Run `npm install` again
- Ensure Node.js version is 18+

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Check browser console for errors
4. Verify database schema is correctly imported

---

Built with ❤️ using Next.js and MySQL
