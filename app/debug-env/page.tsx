import { sql } from "@/lib/db";
import { query } from "@/lib/db";

export const dynamic = 'force-dynamic';

export default async function DebugEnvPage() {
    const envCheck = {
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'Defined (Length: ' + process.env.NEXTAUTH_SECRET.length + ')' : 'MISSING',
        DATABASE_URL: process.env.DATABASE_URL ? 'Defined (Starts with: ' + process.env.DATABASE_URL.substring(0, 10) + '...)' : 'MISSING (Using Fallback)',
        NODE_ENV: process.env.NODE_ENV,
    };

    let dbStatus = 'Unknown';
    let dbError = '';

    try {
        const start = Date.now();
        await query('SELECT 1');
        dbStatus = `Connected in ${Date.now() - start}ms`;
    } catch (e: any) {
        dbStatus = 'Failed';
        dbError = e.message;
    }

    return (
        <div style={{ padding: '2rem', fontFamily: 'monospace', background: '#000', color: '#0f0', minHeight: '100vh' }}>
            <h1>Deployment Debugger</h1>

            <h2>Environment Variables</h2>
            <pre>{JSON.stringify(envCheck, null, 2)}</pre>

            <h2>Database Connection</h2>
            <p>Status: {dbStatus}</p>
            {dbError && <p style={{ color: 'red' }}>Error: {dbError}</p>}
        </div>
    );
}
