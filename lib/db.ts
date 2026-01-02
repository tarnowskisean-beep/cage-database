import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
});

export async function query(text: string, params?: unknown[]) {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    // console.log('executed query', { text, duration, rows: res.rowCount });
    return res;
}

// Helper for clients used to MSSQL style
export async function getPool() {
    return pool;
}

// No-op for syntax highlighting if needed
export const sql = {
    // Basic types for compatibility if needed, but we'll switch to native types
    Int: 'int',
    NVarChar: 'text',
    Decimal: 'decimal',
    DateTime2: 'timestamp',
};
