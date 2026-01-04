import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function DebugEnv() {
    let dbStatus = 'Unknown';
    try {
        const res = await query('SELECT NOW()');
        dbStatus = 'Connected: ' + res.rows[0].now;
    } catch (err: any) {
        dbStatus = 'Error: ' + err.message;
    }

    return (
        <div className="p-8 font-mono">
            <h1>Debug Environment</h1>
            <p>DB Status: {dbStatus}</p>
        </div>
    );
}
