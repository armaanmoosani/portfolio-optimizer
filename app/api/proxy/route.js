import { NextResponse } from 'next/server';

export async function GET(request) {
    const { searchParams } = request.nextUrl;
    const service = searchParams.get('service');
    const ticker = searchParams.get('ticker');
    const query = searchParams.get('query');

    if (!service) {
        return NextResponse.json({ error: 'Missing service parameter' }, { status: 400 });
    }

    try {
        let url;
        let options = { headers: {} };

        switch (service) {
            case 'tiingo':
                if (!ticker) return NextResponse.json({ error: 'Missing ticker' }, { status: 400 });
                url = `https://api.tiingo.com/tiingo/daily/${ticker}?token=${process.env.API_KEY}`;
                break;

            case 'finnhubQuote':
                if (!ticker) return NextResponse.json({ error: 'Missing ticker' }, { status: 400 });
                url = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${process.env.FINNHUB_API_KEY}`;
                break;

            case 'finnhubNews':
                if (!ticker) return NextResponse.json({ error: 'Missing ticker' }, { status: 400 });

                // Fallback logic: Try 1 day, then 3 days, then 7 days
                const lookbacks = [1, 3, 7, 14, 30, 60, 90, 180, 365, 1825];
                let finalData = [];

                for (const days of lookbacks) {
                    const today = new Date();
                    const fromDate = new Date(today);
                    fromDate.setDate(today.getDate() - days);

                    const toStr = today.toISOString().split('T')[0];
                    const fromStr = fromDate.toISOString().split('T')[0];

                    const fetchUrl = `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${fromStr}&to=${toStr}&token=${process.env.FINNHUB_API_KEY}`;

                    try {
                        const res = await fetch(fetchUrl);
                        if (res.ok) {
                            const data = await res.json();
                            if (Array.isArray(data) && data.length > 0) {
                                finalData = data;
                                break; // Found news, stop searching
                            }
                        }
                    } catch (e) {
                        console.error(`Error fetching news for ${days} days:`, e);
                    }
                }

                return NextResponse.json(finalData);

            case 'finnhubAutocomplete':
                if (!query) return NextResponse.json({ error: 'Missing query' }, { status: 400 });
                url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${process.env.FINNHUB_API_KEY}`;
                break;

            default:
                return NextResponse.json({ error: 'Unknown service' }, { status: 400 });
        }

        const response = await fetch(url, options);
        const data = await response.json();

        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('Proxy error:', error);
        return NextResponse.json({ error: 'Failed fetching data' }, { status: 500 });
    }
}

export async function POST(request) {
    const { searchParams } = request.nextUrl;
    const service = searchParams.get('service');

    if (service === 'gemini') {
        try {
            const body = await request.json();
            const response = await fetch(
                'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
                {
                    method: 'POST',
                    headers: {
                        'x-goog-api-key': process.env.GEMINI_API_KEY,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(body),
                }
            );
            const data = await response.json();
            return NextResponse.json(data, { status: response.status });
        } catch (error) {
            console.error('Gemini proxy error:', error);
            return NextResponse.json({ error: 'Failed fetching data' }, { status: 500 });
        }
    }

    return NextResponse.json({ error: 'Unknown service' }, { status: 400 });
}
