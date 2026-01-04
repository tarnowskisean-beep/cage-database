
import { query } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const res = await query('SELECT * FROM "Clients" LIMIT 5');
        return new Response(JSON.stringify(res.rows, null, 2));
    } catch (e: any) {
        return new Response(e.message, { status: 500 });
    }
}
