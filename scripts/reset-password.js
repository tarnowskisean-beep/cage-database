
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
});

async function resetPassword(username, newPassword) {
    try {
        console.log(`Resetting password for user: ${username}`);
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);

        const res = await pool.query(
            'UPDATE "Users" SET "PasswordHash" = $1 WHERE "Username" = $2 RETURNING "UserID"',
            [hash, username]
        );

        if (res.rowCount > 0) {
            console.log(`✅ Password updated successfully for ${username}.`);
        } else {
            console.log(`❌ User ${username} not found.`);
        }

    } catch (e) {
        console.error('Error resetting password:', e);
    } finally {
        await pool.end();
    }
}

// Default to resetting 'agraham' to 'password123'
resetPassword('agraham', 'password123');
