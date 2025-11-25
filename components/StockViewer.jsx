"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Search, ArrowUpRight, ArrowDownRight, Loader2, TrendingUp, Calendar } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Map frontend time ranges to yfinance params
const TIME_RANGES = {
    '1D': { period: '1d', interval: '5m' },
    '1W': { period: '5d', interval: '15m' },
    '1M': { period: '1mo', interval: '1d' },
    '3M': { period: '3mo', interval: '1d' },
    '1Y': { period: '1y', interval: '1d' },
    '5Y': { period: '5y', interval: '1wk' },
};

export default function StockViewer() {
    const [ticker, setTicker] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [loading, setLoading] = useState(false);
    const [stockData, setStockData] = useState(null);
    const [news, setNews] = useState([]);
    const [aiSummary, setAiSummary] = useState("");
    const [error, setError] = useState("");
    const [timeRange, setTimeRange] = useState('1M');
    const [chartData, setChartData] = useState([]);
    const [chartLoading, setChartLoading] = useState(false);
    const searchContainerRef = useRef(null);

    // Click outside to close suggestions
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Fetch chart data when time range or stock data changes
    useEffect(() => {
        const fetchChartData = async () => {
            if (!stockData?.name) return;

            setChartLoading(true);
            try {
                // Use the ticker from stockData (or the search ticker if available)
                // We need the symbol. stockData doesn't explicitly store symbol but we can infer or pass it.
                // Let's store symbol in stockData to be safe.
                const symbol = stockData.symbol;
                const { period, interval } = TIME_RANGES[timeRange];

                // Call the backend via the Next.js proxy
                const res = await fetch(`/api/history?ticker=${symbol}&period=${period}&interval=${interval}`);
                if (!res.ok) throw new Error("Failed to fetch history");

                const data = await res.json();
                setChartData(data);
            } catch (err) {
                console.error("Chart fetch error:", err);
                setChartData([]);
            } finally {
                setChartLoading(false);
            }
        };

        fetchChartData();
    }, [stockData, timeRange]);

    const handleInputChange = async (e) => {
        const value = e.target.value.toUpperCase();
        setTicker(value);
        setSelectedIndex(-1);

        if (!value) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        try {
            const res = await fetch(`/api/proxy?service=finnhubAutocomplete&query=${encodeURIComponent(value)}`);
            if (res.ok) {
                const data = await res.json();
                setSuggestions(data.result || []);
                setShowSuggestions(true);
            }
        } catch (err) {
            console.error("Autocomplete error:", err);
        }
    };

    const handleSuggestionClick = (symbol) => {
        setTicker(symbol);
        setSuggestions([]);
        setShowSuggestions(false);
        setSelectedIndex(-1);
        handleSearch(symbol);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                handleSuggestionClick(suggestions[selectedIndex].symbol);
            } else {
                handleSearch();
            }
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            if (showSuggestions && suggestions.length > 0) {
                setSelectedIndex(prev => (prev + 1) % Math.min(suggestions.length, 6));
            }
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (showSuggestions && suggestions.length > 0) {
                setSelectedIndex(prev => (prev - 1 + Math.min(suggestions.length, 6)) % Math.min(suggestions.length, 6));
            }
        }
    };

    // Modified to accept an optional overrideTicker
    const handleSearch = async (overrideTicker) => {
        const searchTicker = typeof overrideTicker === 'string' ? overrideTicker : ticker;
        if (!searchTicker) return;

        setLoading(true);
        setError("");
        setStockData(null);
        setNews([]);
        setAiSummary("");
        setShowSuggestions(false); // Hide suggestions if open
        setSelectedIndex(-1);

        try {
            // Fetch Metadata
            const metaRes = await fetch(`/api/proxy?service=tiingo&ticker=${searchTicker}`);
            const meta = await metaRes.json();

            // Fetch Quote
            const quoteRes = await fetch(`/api/proxy?service=finnhubQuote&ticker=${searchTicker}`);
            const quote = await quoteRes.json();

            if (!quote.c) throw new Error("Invalid ticker or no data found");

            setStockData({
                symbol: searchTicker, // Store symbol for chart fetching
                price: quote.c,
                changePercent: quote.c && quote.pc ? ((quote.c - quote.pc) / quote.pc) * 100 : 0,
                name: meta.name || searchTicker,
                description: meta.description || "No description available.",
            });

            // Fetch News
            const newsRes = await fetch(`/api/proxy?service=finnhubNews&ticker=${searchTicker}`);
            const newsData = await newsRes.json();
            const newsArr = Array.isArray(newsData) ? newsData : [];

            if (newsArr.length === 0) {
                setNews([]);
                setAiSummary("AI summary unavailable — no news data.");
            } else {
                setNews(newsArr.slice(0, 5));

                // Generate AI Summary
                const aggregatedNews = newsArr.map((a) => `${a.headline}\n${a.summary || ""}`).join("\n\n");
                const companyName = meta.name ? `${meta.name} (${searchTicker})` : searchTicker;

                const prompt = `
You are an AI assistant that writes investor summaries. Here’s an example:

Robinhood shares rise ahead of Q3 earnings report after market close today, fueled by strong growth expectations. Analysts expect EPS of $0.54 versus $0.17 a year ago, and revenues rising 88% to $1.21 billion. Options traders anticipate a 9.45% price swing. Product expansion and crypto trading growth are driving revenue diversification. Why this matters: Investors are weighing growth potential against valuation risks.

Now, based on the recent headlines and the latest price change for ${companyName}, generate a summary with these rules:
- Exactly 3 concise bullet points explaining the main drivers of the stock's movement
- 1-line "Why this matters" conclusion
- Plain-language, easy to understand for investors of all experience levels
- Include important metrics or context if available
- Do not use Markdown, bold, or other formatting
- Output ready to display directly on a web page
- Only summarize the provided news content; do not add unrelated information

Recent headlines and summaries:
${aggregatedNews.slice(0, 15000)}
`;

                const aiRes = await fetch(`/api/proxy?service=gemini&ticker=${searchTicker}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ role: "user", parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.2, maxOutputTokens: 400 }
                    })
                });

                if (!aiRes.ok) throw new Error("AI Fetch failed");

                const aiData = await aiRes.json();
                const candidate = aiData.candidates?.[0];
                const summaryText = candidate?.content?.parts?.[0]?.text ||
                    candidate?.content ||
                    aiData.output_text ||
                    "Summary unavailable.";
                setAiSummary(summaryText);
            }

        } catch (err) {
            setError("Failed to fetch stock data. Please check the ticker and try again.");
            console.error(err);
            setAiSummary("AI summary unavailable.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto p-6 space-y-8" onClick={() => setShowSuggestions(false)}>
            {/* Search Section */}
            <div className="flex flex-col items-center gap-4 relative z-20">
                <div className="relative w-full max-w-md" ref={searchContainerRef} onClick={(e) => e.stopPropagation()}>
                    <input
                        type="text"
                        value={ticker}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onFocus={() => ticker && setShowSuggestions(true)}
                        placeholder="Enter ticker symbol (e.g. AAPL)..."
                        className="w-full px-6 py-4 rounded-full bg-slate-900/60 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-xl backdrop-blur-xl"
                    />
                    <button
                        onClick={() => handleSearch()}
                        className="absolute right-2 top-2 p-2 bg-blue-600 hover:bg-blue-500 rounded-full text-white transition-colors shadow-lg"
                    >
                        <Search className="w-5 h-5" />
                    </button>

                    {/* Autocomplete Suggestions */}
                    {showSuggestions && suggestions.length > 0 && (
                        <ul className="absolute w-full mt-2 bg-slate-900/90 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 max-h-60 overflow-y-auto backdrop-blur-xl">
                            {suggestions.slice(0, 6).map((item, index) => (
                                <li
                                    key={index}
                                    onClick={() => handleSuggestionClick(item.symbol)}
                                    className={`px-4 py-3 cursor-pointer transition-colors border-b border-white/5 last:border-none ${index === selectedIndex ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                >
                                    <div className="font-bold text-white">{item.symbol}</div>
                                    <div className="text-xs text-slate-400 truncate">{item.description}</div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                {error && <p className="text-rose-400 bg-rose-500/10 px-4 py-2 rounded-lg border border-rose-500/20">{error}</p>}
            </div>

            {loading && (
                <div className="flex justify-center py-24">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                </div>
            )}

            {!loading && stockData && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Left Column: Chart & Price (Span 2) */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Price Header */}
                            <div className="glass-panel rounded-2xl p-8">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-4xl font-bold text-white tracking-tight">{stockData.name}</h2>
                                        <p className="text-lg text-slate-400 mt-1 font-medium">{stockData.description}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-5xl font-bold text-white tracking-tighter tabular-nums">
                                            ${stockData.price.toFixed(2)}
                                        </div>
                                        <div className={`flex items-center justify-end gap-2 mt-2 text-lg font-medium ${stockData.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {stockData.changePercent >= 0 ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
                                            {Math.abs(stockData.changePercent).toFixed(2)}%
                                        </div>
                                    </div>
                                </div>

                                {/* Chart Controls */}
                                <div className="flex items-center gap-2 mt-8 mb-4">
                                    {Object.keys(TIME_RANGES).map((range) => (
                                        <button
                                            key={range}
                                            onClick={() => setTimeRange(range)}
                                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${timeRange === range
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                                }`}
                                        >
                                            {range}
                                        </button>
                                    ))}
                                </div>

                                {/* Chart Area */}
                                <div className="h-[400px] w-full mt-4 relative">
                                    {chartLoading && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm z-10 rounded-lg">
                                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                        </div>
                                    )}
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                            <XAxis
                                                dataKey="date"
                                                stroke="#64748b"
                                                tick={{ fill: '#64748b', fontSize: 12 }}
                                                tickLine={false}
                                                axisLine={false}
                                                minTickGap={40}
                                            />
                                            <YAxis
                                                domain={['auto', 'auto']}
                                                stroke="#64748b"
                                                tick={{ fill: '#64748b', fontSize: 12 }}
                                                tickLine={false}
                                                axisLine={false}
                                                tickFormatter={(val) => `$${val.toFixed(0)}`}
                                                width={60}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                                    borderColor: 'rgba(255,255,255,0.1)',
                                                    borderRadius: '12px',
                                                    color: '#f8fafc',
                                                    backdropFilter: 'blur(12px)'
                                                }}
                                                itemStyle={{ color: '#fff' }}
                                                formatter={(value) => [`$${value.toFixed(2)}`, 'Price']}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="price"
                                                stroke="#3b82f6"
                                                strokeWidth={2}
                                                fillOpacity={1}
                                                fill="url(#colorPrice)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: AI & News (Span 1) */}
                        <div className="space-y-6">
                            {/* AI Summary */}
                            <div className="glass-panel rounded-2xl p-6 border-t-4 border-t-blue-500">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                                        <TrendingUp className="w-5 h-5" />
                                    </div>
                                    AI Analysis
                                </h3>
                                <div className="prose prose-invert prose-sm max-w-none text-slate-300 whitespace-pre-line leading-relaxed">
                                    {aiSummary || (
                                        <div className="flex items-center gap-2 text-slate-500 animate-pulse">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Analyzing market data...
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Recent News */}
                            <div className="glass-panel rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <div className="p-2 rounded-lg bg-slate-700/50 text-slate-300">
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    Recent News
                                </h3>
                                <ul className="space-y-4">
                                    {news.map((item, i) => (
                                        <li key={i} className="group">
                                            <a
                                                href={item.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block hover:bg-white/5 p-4 -mx-4 rounded-xl transition-all border border-transparent hover:border-white/5"
                                            >
                                                <h4 className="text-sm font-semibold text-slate-200 group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                                                    {item.headline}
                                                </h4>
                                                <div className="flex items-center justify-between mt-2">
                                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                                                        {new URL(item.url).hostname.replace('www.', '')}
                                                    </p>
                                                    <span className="text-xs text-slate-600">
                                                        {new Date(item.datetime * 1000).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
