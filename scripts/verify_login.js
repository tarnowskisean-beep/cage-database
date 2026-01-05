const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' }); // Or standard .env if verified

// Using the HARDCODED string from seed script to be sure we hit the same DB
const CONNECTION_STRING = 'postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres';

async function verify() {
    console.log("🔍 Verifying 'starnowski'...");
    const client = new Client({
        connectionString: CONNECTION_STRING,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // 1. Check User
        const res = await client.query('SELECT * FROM "Users" WHERE "Username" = $1', ['starnowski']);
        if (res.rows.length === 0) {
            console.error("❌ User 'starnowski' NOT FOUND in database.");

            // Check who exists
            const all = await client.query('SELECT "Username" FROM "Users"');
            console.log("   Existing users:", all.rows.map(u => u.Username).join(', '));
            return;
        }

        const user = res.rows[0];
        console.log("✅ User found:", user.Username, `(ID: ${user.UserID})`);
        console.log("   IsActive:", user.IsActive);
        console.log("   Keys:", Object.keys(user).join(', '));
        console.log("   2FA Enabled:", user.TwoFactorEnabled);

        // 2. Check Password
        const isMatch = await bcrypt.compare('password', user.PasswordHash);
        if (isMatch) {
            console.log("✅ Password 'password' matches hash.");
        } else {
            console.error("❌ Password 'password' DOES NOT MATCH hash.");
        }

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

verify();
