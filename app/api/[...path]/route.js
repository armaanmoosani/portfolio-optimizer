import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NODE_ENV === 'development'
    ? 'http://127.0.0.1:8000'
    : process.env.NEXT_PUBLIC_API_URL;

if (!BACKEND_URL) {
    console.error("ENV Error!");
}

async function proxyRequest(request, { params }) {
    // Capture the path from the dynamic route params
    const path = params.path.join('/');
    const searchParams = request.nextUrl.searchParams.toString();
    const queryString = searchParams ? `?${searchParams}` : '';

    const targetUrl = `${BACKEND_URL}/api/${path}${queryString}`;

    console.log(`Proxying request to: ${targetUrl}`);

    try {
        const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text();

        const response = await fetch(targetUrl, {
            method: request.method,
            headers: {
                'Content-Type': 'application/json',
                // Add any other necessary headers here
            },
            body: body,
        });

        const data = await response.json();

        return NextResponse.json(data, {
            status: response.status,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        console.error('Proxy error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch data from backend' },
            { status: 500 }
        );
    }
}

export async function GET(request, context) {
    return proxyRequest(request, context);
}

export async function POST(request, context) {
    return proxyRequest(request, context);
}

export async function PUT(request, context) {
    return proxyRequest(request, context);
}

export async function DELETE(request, context) {
    return proxyRequest(request, context);
}
