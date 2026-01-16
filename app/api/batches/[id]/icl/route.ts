
import { NextResponse } from 'next/server';
import { generateICL } from '@/lib/icl-generator';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;

        // Generate ICL Buffer
        const iclBuffer = await generateICL(id);

        // Return Stream
        return new NextResponse(iclBuffer as any, {
            headers: {
                'Content-Type': 'application/octet-stream', // X9.37 usually generic binary
                'Content-Disposition': `attachment; filename="Batch_${id}_ICL.x937"`
            }
        });

    } catch (e: any) {
        console.error('ICL generation failed', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
