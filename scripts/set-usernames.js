const mariadb = require('mariadb');
const pool = mariadb.createPool({ host: 'localhost', port: 3306, user: 'root', password: '', database: 'gpa_calculator' });

async function run() {
  const conn = await pool.getConnection();
  try {
    // Assign known usernames for seeded accounts
    await conn.query("UPDATE users SET username = 'superadmin' WHERE email = 'superadmin@gpa.local' AND username IS NULL");
    await conn.query("UPDATE users SET username = 'test_user' WHERE email = 'test@example.com' AND username IS NULL");
    // Give any remaining NULL usernames a generated one
    const rows = await conn.query("SELECT id FROM users WHERE username IS NULL");
    for (const row of rows) {
      await conn.query("UPDATE users SET username = ? WHERE id = ?", [`user_${row.id}`, row.id]);
    }
    const all = await conn.query("SELECT id, name, username, email FROM users");
    console.log('Current users:', all);
  } finally {
    conn.release();
    await pool.end();
  }
}

run().catch(e => { console.error(e); process.exit(1); });
