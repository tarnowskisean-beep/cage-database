
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    return NextResponse.json({ message: 'POST works!' });
}

export async function GET(request: Request) {
    return NextResponse.json({ message: 'GET works!' });
}
