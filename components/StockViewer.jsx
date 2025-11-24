"use client";

import { useState, useRef, useEffect } from "react";
import { Search, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";

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
        <div className="w-full max-w-4xl mx-auto p-6 space-y-8" onClick={() => setShowSuggestions(false)}>
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
                        className="w-full px-6 py-4 rounded-full bg-slate-800/50 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-lg backdrop-blur-sm"
                    />
                    <button
                        onClick={() => handleSearch()}
                        className="absolute right-2 top-2 p-2 bg-blue-600 hover:bg-blue-500 rounded-full text-white transition-colors"
                    >
                        <Search className="w-5 h-5" />
                    </button>

                    {/* Autocomplete Suggestions */}
                    {showSuggestions && suggestions.length > 0 && (
                        <ul className="absolute w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50 max-h-60 overflow-y-auto">
                            {suggestions.slice(0, 6).map((item, index) => (
                                <li
                                    key={index}
                                    onClick={() => handleSuggestionClick(item.symbol)}
                                    className={`px-4 py-3 cursor-pointer transition-colors border-b border-slate-700/50 last:border-none ${index === selectedIndex ? 'bg-slate-700' : 'hover:bg-slate-700'}`}
                                >
                                    <div className="font-bold text-white">{item.symbol}</div>
                                    <div className="text-xs text-slate-400 truncate">{item.description}</div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                {error && <p className="text-red-400">{error}</p>}
            </div>

            {loading && (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
            )}

            {!loading && stockData && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Company Header */}
                    <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-md">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-3xl font-bold text-white">{stockData.name}</h2>
                                <p className="text-slate-400 mt-1">{stockData.description}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-mono font-bold text-white">
                                    ${stockData.price.toFixed(2)}
                                </div>
                                <div className={`flex items-center justify-end gap-1 font-medium ${stockData.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {stockData.changePercent >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                    {Math.abs(stockData.changePercent).toFixed(2)}%
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Recent News */}
                        <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-md">
                            <h3 className="text-lg font-semibold text-white mb-4">Recent News</h3>
                            <ul className="space-y-4">
                                {news.map((item, i) => (
                                    <li key={i} className="group">
                                        <a
                                            href={item.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block hover:bg-slate-700/30 p-3 -mx-3 rounded-lg transition-colors"
                                        >
                                            <h4 className="text-sm font-medium text-slate-200 group-hover:text-blue-400 transition-colors line-clamp-2">
                                                {item.headline}
                                            </h4>
                                            <p className="text-xs text-slate-500 mt-1">
                                                {new URL(item.url).hostname.replace('www.', '')}
                                            </p>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* AI Summary */}
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-900/20 to-slate-900/20 border border-blue-500/20 backdrop-blur-md">
                            <h3 className="text-lg font-semibold text-blue-400 mb-4 flex items-center gap-2">
                                AI Summary
                            </h3>
                            <div className="prose prose-invert prose-sm max-w-none text-slate-300 whitespace-pre-line leading-relaxed">
                                {aiSummary || "Generating AI summary..."}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
