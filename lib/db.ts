import sql from 'mssql';

const config = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'CompassCaging123!',
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'CompassCaging',
    options: {
        encrypt: false, // For local dev
        trustServerCertificate: true,
    },
};

let pool: sql.ConnectionPool | null = null;

export async function getPool() {
    if (pool) return pool;

    try {
        pool = await sql.connect(config);
        return pool;
    } catch (err) {
        console.error('Database Connection Failed:', err);
        throw err;
    }
}

export { sql };
