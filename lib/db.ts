import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
});

export async function query(text: string, params?: unknown[]) {
    const start = Date.now();
    const res = await pool.query(text, params);
    // const duration = Date.now() - start;
    // console.log('executed query', { text, duration, rows: res.rowCount });
    return res;
}

// Transaction Helper
export async function transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
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
