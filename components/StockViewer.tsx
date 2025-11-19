"use client";

import { useState, useEffect } from "react";
import { Search, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";

interface StockData {
    price: number;
    changePercent: number;
    name: string;
    description: string;
}

interface NewsItem {
    headline: string;
    url: string;
    summary: string;
}

export default function StockViewer() {
    const [ticker, setTicker] = useState("");
    const [loading, setLoading] = useState(false);
    const [stockData, setStockData] = useState<StockData | null>(null);
    const [news, setNews] = useState<NewsItem[]>([]);
    const [aiSummary, setAiSummary] = useState("");
    const [error, setError] = useState("");

    const handleSearch = async () => {
        if (!ticker) return;
        setLoading(true);
        setError("");
        setStockData(null);
        setNews([]);
        setAiSummary("");

        try {
            // Fetch Metadata
            const metaRes = await fetch(`/api/proxy?service=tiingo&ticker=${ticker}`);
            const meta = await metaRes.json();

            // Fetch Quote
            const quoteRes = await fetch(`/api/proxy?service=finnhubQuote&ticker=${ticker}`);
            const quote = await quoteRes.json();

            if (!quote.c) throw new Error("Invalid ticker or no data found");

            setStockData({
                price: quote.c,
                changePercent: quote.c && quote.pc ? ((quote.c - quote.pc) / quote.pc) * 100 : 0,
                name: meta.name || ticker,
                description: meta.description || "No description available.",
            });

            // Fetch News
            const newsRes = await fetch(`/api/proxy?service=finnhubNews&ticker=${ticker}`);
            const newsData = await newsRes.json();
            const newsArr = Array.isArray(newsData) ? newsData.slice(0, 5) : [];
            setNews(newsArr);

            // Generate AI Summary
            if (newsArr.length > 0) {
                const aggregatedNews = newsArr.map((a: any) => `${a.headline}\n${a.summary || ""}`).join("\n\n");
                const prompt = `
          Based on the recent headlines for ${meta.name || ticker}, generate a summary with these rules:
          - Exactly 3 concise bullet points explaining the main drivers of the stock's movement
          - 1-line "Why this matters" conclusion
          - Plain-language, easy to understand for investors
          - Output ready to display directly on a web page
          
          News:
          ${aggregatedNews.slice(0, 10000)}
        `;

                const aiRes = await fetch(`/api/proxy?service=gemini&ticker=${ticker}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ role: "user", parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.2, maxOutputTokens: 400 }
                    })
                });

                const aiData = await aiRes.json();
                const candidate = aiData.candidates?.[0];
                setAiSummary(candidate?.content?.parts?.[0]?.text || "Summary unavailable.");
            } else {
                setAiSummary("No news available to generate summary.");
            }

        } catch (err) {
            setError("Failed to fetch stock data. Please check the ticker and try again.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-6 space-y-8">
            {/* Search Section */}
            <div className="flex flex-col items-center gap-4">
                <div className="relative w-full max-w-md">
                    <input
                        type="text"
                        value={ticker}
                        onChange={(e) => setTicker(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        placeholder="Enter ticker symbol (e.g. AAPL)..."
                        className="w-full px-6 py-4 rounded-full bg-slate-800/50 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-lg backdrop-blur-sm"
                    />
                    <button
                        onClick={handleSearch}
                        className="absolute right-2 top-2 p-2 bg-blue-600 hover:bg-blue-500 rounded-full text-white transition-colors"
                    >
                        <Search className="w-5 h-5" />
                    </button>
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
                                <p className="text-slate-400 mt-1 line-clamp-2">{stockData.description}</p>
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
                        {/* AI Summary */}
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-900/20 to-slate-900/20 border border-blue-500/20 backdrop-blur-md">
                            <h3 className="text-lg font-semibold text-blue-400 mb-4 flex items-center gap-2">
                                ✨ AI Analysis
                            </h3>
                            <div className="prose prose-invert prose-sm max-w-none text-slate-300 whitespace-pre-line leading-relaxed">
                                {aiSummary || "Generating AI summary..."}
                            </div>
                        </div>

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
                    </div>
                </div>
            )}
        </div>
    );
}
