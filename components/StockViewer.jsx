"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Search, ArrowUpRight, ArrowDownRight, Loader2, TrendingUp, Calendar } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

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
    const [timeRange, setTimeRange] = useState('1D');
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

    // Load last viewed ticker and data on mount
    useEffect(() => {
        const savedTicker = localStorage.getItem('lastViewedTicker');
        const savedData = localStorage.getItem('stockViewerData');

        if (savedData) {
            try {
                const { stockData, news, aiSummary, timestamp } = JSON.parse(savedData);
                // Only use cached data if it's less than 1 hour old
                if (Date.now() - timestamp < 3600000) {
                    setStockData(stockData);
                    setNews(news);
                    setAiSummary(aiSummary);
                    setTicker(stockData.symbol);
                    return;
                }
            } catch (e) {
                console.error("Failed to parse saved stock data", e);
            }
        }

        if (savedTicker) {
            setTicker(savedTicker);
            handleSearch(savedTicker);
        }
    }, []);

    // Save data to localStorage whenever it changes
    useEffect(() => {
        if (stockData && stockData.symbol) {
            localStorage.setItem('lastViewedTicker', stockData.symbol);
            localStorage.setItem('stockViewerData', JSON.stringify({
                stockData,
                news,
                aiSummary,
                timestamp: Date.now()
            }));
        }
    }, [stockData, news, aiSummary]);

    // Fetch chart data when time range or stock data changes
    useEffect(() => {
        const fetchChartData = async () => {
            if (!stockData?.symbol) return;

            setChartLoading(true);
            try {
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
        // Don't clear data immediately to prevent flash if we have cached data
        // setStockData(null); 
        setShowSuggestions(false);
        setSelectedIndex(-1);

        try {
            // Fetch Metadata
            const metaRes = await fetch(`/api/proxy?service=tiingo&ticker=${searchTicker}`);
            const meta = await metaRes.json();

            // Fetch Quote
            const quoteRes = await fetch(`/api/proxy?service=finnhubQuote&ticker=${searchTicker}`);
            const quote = await quoteRes.json();

            if (!quote.c) throw new Error("Invalid ticker or no data found");

            const newStockData = {
                symbol: searchTicker,
                price: quote.c,
                changePercent: quote.c && quote.pc ? ((quote.c - quote.pc) / quote.pc) * 100 : 0,
                name: meta.name || searchTicker,
                description: meta.description || "No description available.",
                open: quote.o,
                high: quote.h,
                low: quote.l,
                prevClose: quote.pc
            };
            setStockData(newStockData);

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

    // Custom Tooltip for Google Finance style interaction
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const currentPrice = payload[0].value;
            // Calculate change relative to the first point in the visible chart data
            const startPrice = chartData.length > 0 ? chartData[0].price : currentPrice;
            const change = currentPrice - startPrice;
            const changePercent = (change / startPrice) * 100;
            const isPositive = change >= 0;

            return (
                <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-xl shadow-2xl min-w-[200px]">
                    <p className="text-slate-400 text-xs font-medium mb-1">{label}</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-white tracking-tight">
                            ${currentPrice.toFixed(2)}
                        </span>
                    </div>
                    <div className={`flex items-center gap-1 text-sm font-medium mt-1 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositive ? '+' : ''}{change.toFixed(2)} ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
                    </div>
                    <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-white/5">
                        vs {timeRange} start (${startPrice.toFixed(2)})
                    </p>
                </div>
            );
        }
        return null;
    };

    // Helper to determine market status (simple approximation)
    const isMarketOpen = () => {
        const now = new Date();
        const day = now.getDay();
        const hour = now.getHours();
        const minute = now.getMinutes();
        // Mon-Fri, 9:30 AM - 4:00 PM ET (approx)
        // This is a simple client-side check, not perfect but adds UI value
        if (day === 0 || day === 6) return false;
        if (hour < 9 || (hour === 9 && minute < 30)) return false;
        if (hour >= 16) return false;
        return true;
    };

    // Helper to format X-axis dates based on time range
    const formatXAxis = (tickItem) => {
        if (!tickItem) return '';
        const date = new Date(tickItem);

        if (timeRange === '1D') {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (timeRange === '5Y') {
            return date.getFullYear().toString();
        } else {
            // 1W, 1M, 3M, 1Y -> Short Month + Day (e.g., "Nov 25")
            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-6 space-y-12" onClick={() => setShowSuggestions(false)}>
            {/* Search Section */}
            <div className="flex flex-col items-center gap-6 relative z-20 pt-8">
                <div className="text-center space-y-2 mb-4">
                    <h1 className="text-4xl font-bold text-white tracking-tight">Market Intelligence</h1>
                    <p className="text-slate-400 text-lg">Real-time data, AI analysis, and institutional-grade charts.</p>
                </div>

                <div className="relative w-full max-w-2xl" ref={searchContainerRef} onClick={(e) => e.stopPropagation()}>
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl opacity-10 group-hover:opacity-25 transition duration-500 blur-sm"></div>
                        <input
                            type="text"
                            value={ticker}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            onFocus={() => ticker && setShowSuggestions(true)}
                            placeholder="Search for stocks, ETFs & more..."
                            className="relative w-full px-8 py-5 rounded-2xl bg-slate-900/90 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-transparent transition-all shadow-xl backdrop-blur-xl text-lg font-medium"
                        />
                        <button
                            onClick={() => handleSearch()}
                            className="absolute right-3 top-3 p-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-white transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95"
                        >
                            <Search className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Autocomplete Suggestions */}
                    {showSuggestions && suggestions.length > 0 && (
                        <ul className="absolute w-full mt-3 bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-[350px] overflow-y-auto backdrop-blur-xl custom-scrollbar ring-1 ring-white/5">
                            {suggestions.slice(0, 8).map((item, index) => (
                                <li
                                    key={index}
                                    onClick={() => handleSuggestionClick(item.symbol)}
                                    className={`px-6 py-4 cursor-pointer transition-colors border-b border-white/5 last:border-none group ${index === selectedIndex ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-sm group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                                {item.symbol.substring(0, 2)}
                                            </div>
                                            <div>
                                                <span className="font-bold text-white block">{item.symbol}</span>
                                                <span className="text-sm text-slate-400 truncate block max-w-[200px]">{item.description}</span>
                                            </div>
                                        </div>
                                        <span className="text-xs font-semibold text-slate-500 bg-white/5 px-2.5 py-1 rounded-full border border-white/5 group-hover:border-white/10 transition-colors">
                                            {item.type || 'STOCK'}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                {error && <p className="text-rose-400 bg-rose-500/10 px-4 py-2 rounded-lg border border-rose-500/20 text-sm font-medium animate-in fade-in slide-in-from-top-2">{error}</p>}
            </div>

            {loading && (
                <div className="flex flex-col items-center justify-center py-32 space-y-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-blue-500 blur-xl opacity-10 animate-pulse"></div>
                        <Loader2 className="w-16 h-16 text-blue-500 animate-spin relative z-10" />
                    </div>
                    <p className="text-slate-400 animate-pulse font-medium tracking-wide">Analyzing market data...</p>
                </div>
            )}

            {!loading && !stockData && (
                <div className="text-center py-20 animate-in fade-in zoom-in-95 duration-700">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/5 mb-6 ring-1 ring-white/10">
                        <TrendingUp className="w-10 h-10 text-slate-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Start Your Analysis</h3>
                    <p className="text-slate-500 max-w-md mx-auto">
                        Search for any global stock, ETF, or index to view real-time price action, AI-driven insights, and institutional metrics.
                    </p>

                    <div className="flex flex-wrap justify-center gap-3 mt-8">
                        {['AAPL', 'NVDA', 'TSLA', 'MSFT', 'AMZN', 'GOOGL'].map(sym => (
                            <button
                                key={sym}
                                onClick={() => handleSearch(sym)}
                                className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-slate-400 hover:text-white transition-all text-sm font-medium"
                            >
                                {sym}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {!loading && stockData && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">

                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-8">
                        <div>
                            <div className="flex items-center gap-4 mb-2">
                                <h1 className="text-5xl font-bold text-white tracking-tight">{stockData.name}</h1>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider border ${isMarketOpen() ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-700/30 text-slate-400 border-slate-600/30'}`}>
                                    {isMarketOpen() ? 'MARKET OPEN' : 'MARKET CLOSED'}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-xl text-slate-400">
                                <span className="font-semibold text-white">{stockData.symbol}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                <span className="text-slate-500">Nasdaq</span>
                            </div>
                            <p className="text-lg text-slate-400 mt-4 max-w-3xl leading-relaxed">{stockData.description}</p>
                        </div>
                        <div className="text-left md:text-right">
                            <div className="text-6xl font-bold text-white tracking-tighter tabular-nums">
                                ${stockData.price.toFixed(2)}
                            </div>
                            <div className={`flex items-center md:justify-end gap-2 mt-2 text-xl font-medium ${stockData.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {stockData.changePercent >= 0 ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
                                {Math.abs(stockData.changePercent).toFixed(2)}% <span className="text-slate-500 text-base font-normal ml-1">Today</span>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* Left Column: Chart & Stats (Span 2) */}
                        <div className="lg:col-span-2 space-y-8">

                            {/* Chart Card */}
                            <div className="glass-panel rounded-3xl p-1 border border-white/5 bg-slate-900/40 shadow-xl shadow-black/10">
                                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                        Price Performance
                                    </h3>
                                    <div className="flex bg-slate-800/50 rounded-lg p-1 ring-1 ring-white/5">
                                        {Object.keys(TIME_RANGES).map((range) => (
                                            <button
                                                key={range}
                                                onClick={() => setTimeRange(range)}
                                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${timeRange === range
                                                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/10'
                                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                                    }`}
                                            >
                                                {range}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="h-[500px] w-full p-4 relative group">
                                    {chartLoading && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm z-10 rounded-2xl transition-all">
                                            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                                        </div>
                                    )}
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                            <XAxis
                                                dataKey="date"
                                                stroke="#475569"
                                                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                                                tickLine={false}
                                                axisLine={false}
                                                minTickGap={60}
                                                dy={10}
                                                tickFormatter={formatXAxis}
                                            />
                                            <YAxis
                                                domain={['auto', 'auto']}
                                                stroke="#475569"
                                                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                                                tickLine={false}
                                                axisLine={false}
                                                tickFormatter={(val) => `$${val.toFixed(0)}`}
                                                width={50}
                                                dx={-10}
                                            />
                                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#fff', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.5 }} />
                                            {stockData?.open && (
                                                <ReferenceLine
                                                    y={stockData.open}
                                                    stroke="#94a3b8"
                                                    strokeDasharray="3 3"
                                                    strokeOpacity={0.5}
                                                />
                                            )}
                                            <Area
                                                type="monotone"
                                                dataKey="price"
                                                stroke="#3b82f6"
                                                strokeWidth={2}
                                                fillOpacity={1}
                                                fill="url(#colorPrice)"
                                                activeDot={{ r: 6, strokeWidth: 0, fill: '#fff', stroke: '#3b82f6', strokeWidth: 2 }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Key Statistics Grid */}
                            <div className="glass-panel rounded-3xl p-8 border border-white/5">
                                <h3 className="text-xl font-bold text-white mb-6">Key Statistics</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-slate-800/40 p-5 rounded-2xl border border-white/5 hover:bg-white/5 transition-colors">
                                        <p className="text-xs text-slate-500 mb-1 font-bold uppercase tracking-wider">Open</p>
                                        <p className="text-2xl font-bold text-white tracking-tight">
                                            {stockData.open ? `$${stockData.open.toFixed(2)}` : 'N/A'}
                                        </p>
                                    </div>
                                    <div className="bg-slate-800/40 p-5 rounded-2xl border border-white/5 hover:bg-white/5 transition-colors">
                                        <p className="text-xs text-slate-500 mb-1 font-bold uppercase tracking-wider">High</p>
                                        <p className="text-2xl font-bold text-white tracking-tight">
                                            {stockData.high ? `$${stockData.high.toFixed(2)}` : 'N/A'}
                                        </p>
                                    </div>
                                    <div className="bg-slate-800/40 p-5 rounded-2xl border border-white/5 hover:bg-white/5 transition-colors">
                                        <p className="text-xs text-slate-500 mb-1 font-bold uppercase tracking-wider">Low</p>
                                        <p className="text-2xl font-bold text-white tracking-tight">
                                            {stockData.low ? `$${stockData.low.toFixed(2)}` : 'N/A'}
                                        </p>
                                    </div>
                                    <div className="bg-slate-800/40 p-5 rounded-2xl border border-white/5 hover:bg-white/5 transition-colors">
                                        <p className="text-xs text-slate-500 mb-1 font-bold uppercase tracking-wider">Prev Close</p>
                                        <p className="text-2xl font-bold text-white tracking-tight">
                                            {stockData.prevClose ? `$${stockData.prevClose.toFixed(2)}` : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: AI & News (Span 1) */}
                        <div className="space-y-8">
                            {/* AI Summary */}
                            <div className="glass-panel rounded-3xl p-8 border-t-4 border-t-blue-500 relative overflow-hidden shadow-xl shadow-blue-900/5">
                                <div className="absolute top-0 right-0 p-32 bg-blue-500/5 blur-3xl rounded-full pointer-events-none -mr-16 -mt-16"></div>
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3 relative z-10">
                                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 shadow-inner shadow-blue-500/5 ring-1 ring-blue-500/10">
                                        <TrendingUp className="w-5 h-5" />
                                    </div>
                                    AI Analysis
                                </h3>
                                <div className="prose prose-invert prose-sm max-w-none text-slate-300 whitespace-pre-line leading-relaxed relative z-10 font-medium">
                                    {aiSummary || (
                                        <div className="flex flex-col gap-4">
                                            <div className="h-4 bg-white/5 rounded w-3/4 animate-pulse"></div>
                                            <div className="h-4 bg-white/5 rounded w-full animate-pulse"></div>
                                            <div className="h-4 bg-white/5 rounded w-5/6 animate-pulse"></div>
                                            <div className="h-4 bg-white/5 rounded w-4/5 animate-pulse"></div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Recent News */}
                            <div className="glass-panel rounded-3xl p-8 border border-white/5">
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-slate-700/50 text-slate-300 shadow-inner ring-1 ring-white/5">
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
                                                className="block hover:bg-white/5 p-5 -mx-5 rounded-2xl transition-all border border-transparent hover:border-white/5 group-hover:shadow-lg group-hover:shadow-black/20"
                                            >
                                                <h4 className="text-sm font-semibold text-slate-200 group-hover:text-blue-400 transition-colors line-clamp-2 leading-relaxed">
                                                    {item.headline}
                                                </h4>
                                                <div className="flex items-center justify-between mt-4">
                                                    <p className="text-[10px] font-bold uppercase tracking-wider bg-white/5 px-2 py-1 rounded text-slate-400 border border-white/5">
                                                        {new URL(item.url).hostname.replace('www.', '')}
                                                    </p>
                                                    <span className="text-xs text-slate-500 font-medium">
                                                        {new Date(item.datetime * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
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
