import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Debug: Log role
        console.log('GET /settings/mappings User:', (session.user as any).id, 'Role:', (session.user as any).role);

        const { searchParams } = new URL(request.url);
        const source = searchParams.get('source');

        let sql = 'SELECT * FROM "mapping_rules" ORDER BY "source_system", "target_column"';
        let params: any[] = [];

        if (source) {
            sql = 'SELECT * FROM "mapping_rules" WHERE "source_system" = $1 ORDER BY "target_column"';
            params = [source];
        }

        const result = await query(sql, params);
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('GET /api/settings/mappings error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'Admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { source_system, source_column, target_column, default_value, transformation_rule, is_active } = body;

        // Basic Validation
        if (!source_system || !target_column) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const result = await query(`
            INSERT INTO "mapping_rules" 
            ("source_system", "source_column", "target_column", "default_value", "transformation_rule", "is_active")
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [source_system, source_column || null, target_column, default_value || null, transformation_rule || null, is_active ?? true]);

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('POST /api/settings/mappings error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'Admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id, source_system, source_column, target_column, default_value, transformation_rule, is_active } = body;

        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        const result = await query(`
            UPDATE "mapping_rules" 
            SET "source_system" = $1, "source_column" = $2, "target_column" = $3, "default_value" = $4, 
                "transformation_rule" = $5, "is_active" = $6, "updated_at" = CURRENT_TIMESTAMP
            WHERE "id" = $7
            RETURNING *
        `, [source_system, source_column || null, target_column, default_value || null, transformation_rule || null, is_active ?? true, id]);

        if (result.rowCount === 0) return NextResponse.json({ error: 'Rule not found' }, { status: 404 });

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('PUT /api/settings/mappings error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'Admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        await query('DELETE FROM "mapping_rules" WHERE "id" = $1', [id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/settings/mappings error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
