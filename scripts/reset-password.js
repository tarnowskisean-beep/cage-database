const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres",
    ssl: { rejectUnauthorized: false }
});

async function resetPassword() {
    try {
        const username = 'agraham';
        const password = 'password';
        const hash = await bcrypt.hash(password, 10);

        console.log(`Resetting password for user '${username}' to '${password}'...`);

        // Check if user exists
        const res = await pool.query('SELECT * FROM "Users" WHERE "Username" = $1', [username]);
        if (res.rows.length === 0) {
            console.log("User not found. Creating...");
            await pool.query(
                'INSERT INTO "Users" ("Username", "Email", "PasswordHash", "Role", "Initials") VALUES ($1, $2, $3, $4, $5)',
                [username, 'alyssa@compass.com', hash, 'Admin', 'AG']
            );
        } else {
            console.log("User found. Updating...");
            await pool.query(
                'UPDATE "Users" SET "PasswordHash" = $1 WHERE "Username" = $2',
                [hash, username]
            );
        }

        console.log("✅ Password reset successfully.");

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

resetPassword();
