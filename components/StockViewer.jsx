"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowUpRight, ArrowDownRight, Loader2, TrendingUp, Calendar } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot, BarChart, Bar, ComposedChart, Scatter, Cell, Legend, Line } from 'recharts';
import { useGlobalState } from "@/app/context/GlobalState";
import { useToast } from "@/components/Toast";
import AnimatedPrice from "./AnimatedPrice";
import FadeInSection from "./FadeInSection";
import AnalystRatings from "./AnalystRatings";

// Map frontend time ranges to yfinance params
const TIME_RANGES = {
    '1D': { period: '1d', interval: '5m' },
    '1W': { period: '5d', interval: '15m' },
    '1M': { period: '1mo', interval: '1d' },
    '3M': { period: '3mo', interval: '1d' },
    'YTD': { period: 'ytd', interval: '1d' },
    '1Y': { period: '1y', interval: '1wk' },
    '5Y': { period: '5y', interval: '1wk' },
    'MAX': { period: 'max', interval: '1wk' },
};

export default function StockViewer() {
    const { stockViewerState, updateStockState } = useGlobalState();
    const { ticker, stockData, news, aiSummary, loading, chartData, timeRange, stockInfo } = stockViewerState;
    const toast = useToast();
    const router = useRouter();

    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [error, setError] = useState("");
    const [chartLoading, setChartLoading] = useState(false);
    const [hoveredData, setHoveredData] = useState(null);

    const searchContainerRef = useRef(null);

    // State for Relative Performance (Moved to top)
    const [comparables, setComparables] = useState([]);
    const [comparableData, setComparableData] = useState({});
    const [activeComparables, setActiveComparables] = useState([]);
    const [loadingComparables, setLoadingComparables] = useState(false);
    const [loadingAnalystRatings, setLoadingAnalystRatings] = useState(false);

    // Client-side only rendering for Chart to avoid SSR issues
    const [isMounted, setIsMounted] = useState(false);

    // Persistence: Load Comparables from LocalStorage on mount/ticker change
    useEffect(() => {
        if (!stockData?.symbol) return;

        try {
            const savedComparables = localStorage.getItem(`comparables_${stockData.symbol}`);
            const savedActive = localStorage.getItem(`active_comparables_${stockData.symbol}`);

            if (savedComparables) {
                setComparables(JSON.parse(savedComparables));
            }
            if (savedActive) {
                setActiveComparables(JSON.parse(savedActive));
            }
        } catch (e) {
            console.error("Failed to load comparables from storage", e);
        }
    }, [stockData?.symbol]);

    // Persistence: Save Comparables to LocalStorage when they change
    useEffect(() => {
        if (!stockData?.symbol) return;
        if (comparables.length > 0) {
            localStorage.setItem(`comparables_${stockData.symbol}`, JSON.stringify(comparables));
        }
    }, [comparables, stockData?.symbol]);

    // Persistence: Save Active Comparables when they change
    useEffect(() => {
        if (!stockData?.symbol) return;
        localStorage.setItem(`active_comparables_${stockData.symbol}`, JSON.stringify(activeComparables));
    }, [activeComparables, stockData?.symbol]);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Helper to normalize data for relative comparison (0% start)
    // Moved up to avoid ReferenceError initialization issues
    const getRelativeData = () => {
        if (!chartData || chartData.length === 0) return [];

        const basePrice0 = chartData[0]?.price || 1;

        // Create lookup maps for all active comparables for faster date matching
        const compMaps = {};
        activeComparables.forEach(ticker => {
            const compPoints = comparableData[ticker];
            if (compPoints && compPoints.length > 0) {
                // Map date string to price for O(1) lookup
                // Using normalized date string/timestamp from the API response
                compMaps[ticker] = {
                    data: new Map(compPoints.map(p => [p.date, p.price])),
                    basePrice: compPoints[0]?.price || 1
                };
            }
        });

        return chartData.map((point) => {
            const newItem = {
                date: point.date,
                [stockData.symbol]: ((point.price / basePrice0) - 1) * 100
            };

            activeComparables.forEach(ticker => {
                const compMap = compMaps[ticker];
                if (compMap) {
                    const compPrice = compMap.data.get(point.date);
                    if (compPrice !== undefined) {
                        newItem[ticker] = ((compPrice / compMap.basePrice) - 1) * 100;
                    } else {
                        // If exact date match missing, try to find closest previous (optional, but keep null for now to avoid misleading lines)
                        newItem[ticker] = null;
                    }
                } else {
                    newItem[ticker] = null;
                }
            });

            return newItem;
        });
    };

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
            if (!stockData?.symbol) return;

            // Only show loading state if we don't have chart data or if the data doesn't match the current view
            // This prevents the "regeneration" flash on reload
            if (chartData.length === 0) {
                setChartLoading(true);
            }

            try {
                const symbol = stockData.symbol;
                const { period, interval } = TIME_RANGES[timeRange];

                // Call the backend via the Next.js proxy
                const res = await fetch(`/api/history?ticker=${symbol}&period=${period}&interval=${interval}`);
                if (!res.ok) throw new Error("Failed to fetch history");

                const data = await res.json();

                // Sync last point with live price for 1D view
                if (timeRange === '1D' && stockData?.price && data.length > 0) {
                    const lastPoint = data[data.length - 1];
                    // Update the last point's price to match the live quote
                    // This ensures the chart line connects to the big number at the top
                    lastPoint.price = stockData.price;
                }

                updateStockState({ chartData: data });
            } catch (err) {
                console.error("Chart fetch error:", err);
                // Only clear chart data on error if we were loading from scratch
                if (chartData.length === 0) {
                    updateStockState({ chartData: [] });
                }
            } finally {
                setChartLoading(false);
            }
        };

        // Only fetch if chartData is empty or if the ticker/timeRange changed from what's cached
        // This check is a bit loose, but prevents infinite loops. 
        // Ideally we'd track "lastFetchedParams" in state.
        // For now, we rely on the fact that updateStockState will trigger re-render.
        // To avoid loop, we should check if current chartData matches expectation? 
        // Actually, let's just fetch if we need to.
        // Simple optimization: If we already have data and it looks "fresh" (handled by GlobalState mount), skip?
        // But user might change timeRange.

        // We need to know if the current chartData corresponds to the current timeRange.
        // Since we don't store "chartDataTimeRange", we might re-fetch.
        // Let's just fetch. The backend is fast.
        fetchChartData();
    }, [stockData?.symbol, timeRange]);

    // FETCH COMPARABLES DATA when timeRange or comparables list changes
    useEffect(() => {
        const fetchComparableData = async () => {
            // Only fetch if we have comparables
            if (comparables.length === 0) return;

            setLoadingComparables(true);
            try {
                const { period, interval } = TIME_RANGES[timeRange];

                const compPromises = comparables.map(t =>
                    fetch(`/api/history?ticker=${t}&period=${period}&interval=${interval}`)
                        .then(r => r.ok ? r.json() : [])
                        .then(d => ({ ticker: t, data: d }))
                );

                const histories = await Promise.all(compPromises);
                const historyMap = {};
                histories.forEach(({ ticker, data }) => {
                    if (data && data.length > 0) historyMap[ticker] = data;
                });

                setComparableData(historyMap);
            } catch (err) {
                console.error("Error fetching comparable data:", err);
            } finally {
                setLoadingComparables(false);
            }
        };

        fetchComparableData();
    }, [comparables, timeRange]);

    const handleInputChange = async (e) => {
        const value = e.target.value.toUpperCase();
        updateStockState({ ticker: value });
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
        updateStockState({ ticker: symbol });
        setSuggestions([]);
        setShowSuggestions(false);
        setSelectedIndex(-1);
        handleSearch(symbol);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            setShowSuggestions(false);
            setSuggestions([]);
            setSelectedIndex(-1);
            if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                handleSearch(suggestions[selectedIndex].symbol);
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

        updateStockState({ loading: true });
        setError("");
        setShowSuggestions(false);
        setSelectedIndex(-1);

        // Reset Competitor State
        setComparables([]);
        setComparableData({});
        setActiveComparables([]);
        setLoadingComparables(true);

        try {
            // Get current time range settings for chart fetch
            const { period, interval } = TIME_RANGES[timeRange];

            // PHASE 1: Fetch all data in parallel (including chart)
            const [metaRes, quoteRes, infoRes, newsRes, chartRes] = await Promise.all([
                fetch(`/api/proxy?service=tiingo&ticker=${searchTicker}`),
                fetch(`/api/proxy?service=finnhubQuote&ticker=${searchTicker}`),
                fetch(`/api/stock_info?ticker=${searchTicker}`),
                fetch(`/api/proxy?service=finnhubNews&ticker=${searchTicker}`),
                fetch(`/api/history?ticker=${searchTicker}&period=${period}&interval=${interval}`)
            ]);

            const [meta, quote, infoData, newsData, chartDataRaw] = await Promise.all([
                metaRes.json(),
                quoteRes.json(),
                infoRes.json(),
                newsRes.json(),
                chartRes.json()
            ]);

            if (!quote.c) throw new Error("Invalid ticker or no data found");

            const newStockData = {
                symbol: searchTicker,
                price: quote.c,
                change: quote.c && quote.pc ? quote.c - quote.pc : 0,
                changePercent: quote.c && quote.pc ? ((quote.c - quote.pc) / quote.pc) * 100 : 0,
                name: meta.name || searchTicker,
                description: meta.description || "No description available.",
                open: quote.o,
                high: quote.h,
                low: quote.l,
                prevClose: quote.pc
            };

            const newsArr = Array.isArray(newsData) ? newsData : [];

            // Sync last chart point with live price for 1D view
            let processedChartData = Array.isArray(chartDataRaw) ? chartDataRaw : [];
            if (timeRange === '1D' && quote.c && processedChartData.length > 0) {
                processedChartData[processedChartData.length - 1].price = quote.c;
            }

            // Update state with ALL data at once and STOP loading
            updateStockState({
                stockData: newStockData,
                ticker: searchTicker,
                stockInfo: infoData,
                news: newsArr.slice(0, 5),
                aiSummary: "", // Clear while AI loads (shows skeleton)
                chartData: processedChartData,
                loading: false
            });

            // Show result IMMEDIATELY after primary data is ready
            router.push('/stocks');
            setTimeout(() => {
                document.getElementById('stock-results')?.scrollIntoView({ behavior: 'smooth' });
            }, 100);

            // PHASE 2: Generate AI Summary (COMPLETELY ASYNC - doesn't block UI)
            (async () => {
                let newAiSummary = "AI summary unavailable.";

                if (newsArr.length === 0) {
                    newAiSummary = "AI summary unavailable — no news data.";
                } else {
                    const aggregatedNews = newsArr.map((a) => `${a.headline}\n${a.summary || ""}`).join("\n\n");
                    const companyName = meta.name ? `${meta.name} (${searchTicker})` : searchTicker;

                    const prompt = `
You are an AI assistant that writes investor summaries. Here's an example:

Robinhood shares rise ahead of Q3 earnings report after market close today, fueled by strong growth expectations. Analysts expect EPS of $0.54 versus $0.17 a year ago, and revenues rising 88% to $1.21 billion. Options traders anticipate a 9.45% price swing. Product expansion and crypto trading growth are driving revenue diversification. Why this matters: Investors are weighing growth potential against valuation risks.

Now, based on the recent headlines and the latest price change for ${companyName}, generate a summary with these rules:
- Exactly 3 concise bullet points explaining the main drivers of the stock's movement
- Use the "•" character for bullet points (do not use asterisks)
- 1-line "Why this matters" conclusion
- Plain-language, easy to understand for investors of all experience levels
- Include important metrics or context if available
- Do not use Markdown formatting (no bold, italics, etc.)
- Output ready to display directly on a web page
- Only summarize the provided news content; do not add unrelated information

Recent headlines and summaries:
${aggregatedNews.slice(0, 15000)}
`;

                    try {
                        const aiRes = await fetch(`/api/proxy?service=gemini&ticker=${searchTicker}`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                contents: [{ role: "user", parts: [{ text: prompt }] }],
                                generationConfig: { temperature: 0.2, maxOutputTokens: 400 }
                            })
                        });

                        if (aiRes.ok) {
                            const aiData = await aiRes.json();
                            const candidate = aiData.candidates?.[0];
                            newAiSummary = candidate?.content?.parts?.[0]?.text ||
                                candidate?.content ||
                                aiData.output_text ||
                                "Summary unavailable.";
                        }
                    } catch (aiErr) {
                        console.error("AI summary failed:", aiErr);
                    }
                }

                updateStockState({ aiSummary: newAiSummary });
            })();

            // PHASE 4: Fetch Analyst Ratings (ASYNC/Non-blocking)
            (async () => {
                setLoadingAnalystRatings(true);
                try {
                    const res = await fetch(`/api/analyst_ratings?ticker=${searchTicker}`);
                    if (res.ok) {
                        const data = await res.json();
                        updateStockState({ analystRatings: data });
                    }
                } catch (err) {
                    console.error("Analyst ratings fetch error:", err);
                } finally {
                    setLoadingAnalystRatings(false);
                }
            })();

            // PHASE 3: Fetch Competitors (Also ASYNC/Non-blocking)
            (async () => {
                try {
                    const compPrompt = `
Identify exactly 4 distinct public companies that are the most direct direct competitors or comparable peers to ${searchTicker} (${meta.name || searchTicker}).
Return ONLY a valid JSON array of their ticker symbols. Do not explain.
Example output: ["NVDA", "INTC", "TSM", "QCOM"]
`;
                    const compRes = await fetch(`/api/proxy?service=gemini&ticker=${searchTicker}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            contents: [{ role: "user", parts: [{ text: compPrompt }] }],
                            generationConfig: { temperature: 0.1, maxOutputTokens: 100 }
                        })
                    });

                    if (!compRes.ok) throw new Error("AI competitor fetch failed");

                    const compData = await compRes.json();
                    const candidate = compData.candidates?.[0];
                    const text = candidate?.content?.parts?.[0]?.text || "";

                    // Extract JSON array from text (in case AI adds markdown code blocks)
                    const jsonMatch = text.match(/\[.*\]/s);
                    if (!jsonMatch) throw new Error("No JSON found in AI response");

                    const competitors = JSON.parse(jsonMatch[0]);
                    setComparables(competitors); // Triggers useEffect to load history
                } catch (err) {
                    console.error("Competitor fetch error:", err);
                } finally {
                    setLoadingComparables(false);
                }
            })();

        } catch (err) {
            setError("Failed to fetch stock data. Please check the ticker and try again.");
            console.error(err);
            updateStockState({ aiSummary: "AI summary unavailable.", loading: false });
            setLoadingComparables(false);
        }
    };

    // Calculate baseline price based on time range
    const baselinePrice = useMemo(() => {
        if (timeRange === '1D' && stockData?.prevClose) return stockData.prevClose;
        return chartData.length > 0 ? chartData[0].price : 0;
    }, [timeRange, stockData, chartData]);

    // Calculate period change for header
    const periodChange = useMemo(() => {
        if (chartData.length === 0 || !baselinePrice) return null;
        const currentPrice = chartData[chartData.length - 1].price;
        const change = currentPrice - baselinePrice;
        const percent = (change / baselinePrice) * 100;
        return { change, percent, isPositive: change >= 0 };
    }, [chartData, baselinePrice]);


    // Calculate Pre-Market Data
    const preMarketData = useMemo(() => {
        if (!stockData || timeRange !== '1D' || chartData.length === 0) return null;

        // Find the first point that is "Regular Market"
        const openIndex = chartData.findIndex(d => d.isRegularMarket);

        // If no regular market data or it starts at 0, no pre-market
        if (openIndex <= 0) return null;

        const regularOpenPrice = chartData[openIndex].price;
        const currentPrice = chartData[openIndex - 1].price; // Last pre-market price

        // Pre-market change is usually vs Prev Close
        const change = currentPrice - (stockData.prevClose || regularOpenPrice);
        const percent = (change / (stockData.prevClose || regularOpenPrice)) * 100;

        // Calculate offset for gradient (0 to 1)
        const splitOffset = openIndex / (chartData.length - 1);

        return {
            price: currentPrice,
            change,
            percent,
            splitOffset,
            openIndex,
            endDate: chartData[openIndex].date
        };
    }, [chartData, timeRange, stockData]);

    // Calculate After Hours Data
    const afterHoursData = useMemo(() => {
        if (timeRange !== '1D' || chartData.length === 0) return null;

        // Find the last point that is "Regular Market"
        let closeIndex = -1;
        for (let i = chartData.length - 1; i >= 0; i--) {
            if (chartData[i].isRegularMarket) {
                closeIndex = i;
                break;
            }
        }

        // If no regular market data or all regular, handle gracefully
        if (closeIndex === -1 || closeIndex === chartData.length - 1) return null;

        const regularClosePrice = chartData[closeIndex].price;
        const currentPrice = chartData[chartData.length - 1].price;
        const change = currentPrice - regularClosePrice;
        const percent = (change / regularClosePrice) * 100;

        // Calculate offset for gradient (0 to 1)
        const splitOffset = closeIndex / (chartData.length - 1);

        return {
            regularClosePrice,
            price: currentPrice,
            change,
            percent,
            splitOffset,
            closeIndex,
            closeDate: chartData[closeIndex].date
        };
    }, [chartData, timeRange]);

    // Filter Chart Data based on User Request:
    // "When after hours start remove the pre market segment start it from the market open time."
    // Filter Chart Data based on User Request:
    // "When after hours start remove the pre market segment start it from the market open time."
    const visibleChartData = useMemo(() => {
        if (timeRange !== '1D') return chartData;

        // If we are in after-hours (afterHoursData exists), hide pre-market
        if (afterHoursData && preMarketData && preMarketData.openIndex > 0) {
            return chartData.slice(preMarketData.openIndex);
        }

        return chartData;
    }, [chartData, timeRange, afterHoursData, preMarketData]);

    // Calculate Y-axis domain to ensure reference line is visible
    const yDomain = useMemo(() => {
        // Use visibleChartData since that's what the chart displays
        const dataToUse = visibleChartData.length > 0 ? visibleChartData : chartData;
        if (dataToUse.length === 0) return ['auto', 'auto'];

        let min = Math.min(...dataToUse.map(d => d.price));
        let max = Math.max(...dataToUse.map(d => d.price));

        // If we have a baseline price (prevClose) in 1D view, ensure it's included in the domain
        if (timeRange === '1D' && baselinePrice > 0) {
            min = Math.min(min, baselinePrice);
            max = Math.max(max, baselinePrice);
        }

        // Add some padding (2%)
        const padding = (max - min) * 0.02;
        return [min - padding, max + padding];
    }, [visibleChartData, chartData, baselinePrice, timeRange]);

    // Calculate split offset for the VISIBLE chart data
    const visibleSplitOffset = useMemo(() => {
        if (!afterHoursData || !preMarketData || timeRange !== '1D') return 0;
        return preMarketData.splitOffset; // Or logic to handle multiple splits if needed
    }, [afterHoursData, preMarketData, timeRange]);

    // Live Price Updates Polling
    useEffect(() => {
        if (timeRange !== '1D' || !stockData?.symbol || loading) return;

        const interval = setInterval(async () => {
            // Market Holidays (2024-2028)
            const marketHolidays = [
                // 2024
                '2024-01-01', '2024-01-15', '2024-02-19', '2024-03-29', '2024-05-27', '2024-06-19', '2024-07-04', '2024-09-02', '2024-11-28', '2024-12-25',
                // 2025
                '2025-01-01', '2025-01-20', '2025-02-17', '2025-04-18', '2025-05-26', '2025-06-19', '2025-07-04', '2025-09-01', '2025-11-27', '2025-12-25',
                // 2026
                '2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25', '2026-06-19', '2026-07-03', '2026-09-07', '2026-11-26', '2026-12-25',
                // 2027
                '2027-01-01', '2027-01-18', '2027-02-15', '2027-03-26', '2027-05-31', '2027-06-18', '2027-07-05', '2027-09-06', '2027-11-25', '2027-12-24',
                // 2028 (Note: Jan 1 is Sat, no NY holiday observed)
                '2028-01-17', '2028-02-21', '2028-04-14', '2028-05-29', '2028-06-19', '2028-07-04', '2028-09-04', '2028-11-23', '2028-12-25'
            ];

            // Check if today is a holiday
            // Note: toISOString is UTC, so we should use local date string for US/Eastern ideally or approximate with local
            // Simple consistent approximation using local time string in a standard format
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const date = String(now.getDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${date}`;

            if (marketHolidays.includes(todayStr)) return;

            // Check if extended trading hours (Mon-Fri, 4:00 AM - 8:00 PM ET)
            // Pre-market: 4:00 AM - 9:30 AM, Regular: 9:30 AM - 4:00 PM, After-hours: 4:00 PM - 8:00 PM
            const day = now.getDay();
            const hour = now.getHours();
            // Extended hours: 4 AM to 8 PM (4-20), Mon-Fri (1-5)
            const extendedHoursOpen = day >= 1 && day <= 5 && hour >= 4 && hour < 20;

            if (!extendedHoursOpen) return;

            try {
                const res = await fetch(`/api/quote?ticker=${stockData.symbol}`);
                if (!res.ok) return;

                const quote = await res.json();

                // 1. Update Header Price (Stock Data)
                const newStockData = {
                    ...stockData,
                    price: quote.price,
                    change: quote.change,
                    changesPercentage: quote.percent,
                    timestamp: quote.timestamp
                };

                // 2. Update Chart Data
                let newChartData = [...chartData];
                if (newChartData.length > 0) {
                    const lastPoint = newChartData[newChartData.length - 1];
                    const quoteTime = new Date(quote.timestamp).getTime();
                    const lastTime = new Date(lastPoint.date).getTime();

                    const isNewCandle = (quoteTime - lastTime) >= 60000; // 1 minute

                    if (isNewCandle) {
                        newChartData.push({
                            date: new Date(quote.timestamp).toISOString(),
                            price: quote.price,
                            isRegularMarket: true
                        });
                    } else {
                        newChartData[newChartData.length - 1] = {
                            ...lastPoint,
                            price: quote.price
                        };
                    }
                }

                updateStockState({
                    stockData: newStockData,
                    chartData: newChartData
                });

            } catch (e) {
                console.error("Live update failed", e);
            }
        }, 10000); // 10 seconds

        return () => clearInterval(interval);
    }, [stockData?.symbol, timeRange, loading, chartData]);




    // Calculate Display Data (Dynamic based on Hover)
    const displayData = useMemo(() => {
        if (!stockData) return { price: 0, change: 0, percent: 0, label: '', isPositive: false, isRegular: true };

        // Default to latest data
        let price = stockData.price;
        let change = stockData.change;
        let percent = stockData.changePercent;
        let label = timeRange === '1D' ? 'Today' : timeRange;
        let isRegular = true;

        // If hovering, use hovered data
        if (hoveredData) {
            price = hoveredData.price;

            // Determine context based on hover
            if (timeRange === '1D') {
                if (preMarketData && hoveredData.index < preMarketData.openIndex) {
                    // Hovering Pre-Market
                    label = 'Pre-market';
                    change = price - stockData.prevClose;
                    percent = (change / stockData.prevClose) * 100;
                    isRegular = false;
                } else if (afterHoursData && hoveredData.index > afterHoursData.closeIndex) {
                    // Hovering After-Hours
                    label = 'After hours';
                    change = price - afterHoursData.regularClosePrice;
                    percent = (change / afterHoursData.regularClosePrice) * 100;
                    isRegular = false;
                } else {
                    // Hovering Regular Market
                    label = 'Regular';
                    change = price - stockData.prevClose;
                    percent = (change / stockData.prevClose) * 100;
                }
            } else {
                // Non-1D views
                change = price - baselinePrice;
                percent = (change / baselinePrice) * 100;
                label = hoveredData.dateStr || timeRange;
            }
        } else {
            // Not hovering - show latest appropriate data
            if (timeRange !== '1D' && periodChange) {
                // For non-1D views, show the change over the selected period
                change = periodChange.change;
                percent = periodChange.percent;
                label = timeRange;
            } else if (afterHoursData) {
                price = afterHoursData.price;
                change = afterHoursData.change;
                percent = afterHoursData.percent;
                label = 'After hours';
                isRegular = false;
            } else if (preMarketData && !afterHoursData && chartData.length > 0 && !chartData[chartData.length - 1].isRegularMarket) {
                // Only Pre-market data available so far
                price = preMarketData.price;
                change = preMarketData.change;
                percent = preMarketData.percent;
                label = 'Pre-market';
                isRegular = false;
            }
        }

        return { price, change, percent, label, isPositive: (change || 0) >= 0, isRegular };
    }, [hoveredData, stockData, preMarketData, afterHoursData, timeRange, baselinePrice, chartData]);


    // Custom Tooltip for Google Finance style interaction
    const CustomTooltip = ({ active, payload, label }) => {
        // Sync hover state with tooltip data
        useEffect(() => {
            if (active && payload && payload.length) {
                const newPayload = payload[0].payload;
                // Only update if the date/price is different to avoid infinite loops
                if (!hoveredData || hoveredData.date !== newPayload.date || hoveredData.price !== newPayload.price) {
                    // We need the index for pre-market logic. 
                    // Recharts payload usually doesn't have index directly in the data item unless we put it there.
                    // But we can find it or pass it. 
                    // Actually, let's just rely on the data object itself.
                    // We can find the index in chartData if needed, or rely on date comparison.
                    // Let's find the index to be safe for the pre-market logic.
                    const index = chartData.findIndex(d => d.date === newPayload.date);
                    setHoveredData({ ...newPayload, index });
                }
            }
        }, [active, payload, label]);

        if (active && payload && payload.length) {
            const currentPrice = payload[0].value;
            // Calculate change relative to the baseline price
            const startPrice = baselinePrice || currentPrice;
            const change = currentPrice - startPrice;
            const changePercent = (change / startPrice) * 100;
            const isPositive = change >= 0;

            // Format date based on timeRange
            let dateStr = label;
            try {
                const date = new Date(payload[0].payload.date); // Access original date string from payload
                if (timeRange === '1D') {
                    // "10:30"
                    dateStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } else if (timeRange === '1W') {
                    // "Tue, Nov 25 10:30"
                    dateStr = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) + ' ' +
                        date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } else if (['1M', '3M', 'YTD'].includes(timeRange)) {
                    // "Tue, Nov 25"
                    dateStr = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
                } else {
                    // 1Y, 5Y, MAX -> "Nov 25, 2024"
                    dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                }
            } catch (e) {
                console.error("Date format error", e);
            }

            return (
                <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-xl shadow-2xl min-w-[200px]">
                    <p className="text-slate-400 text-xs font-medium mb-1">{dateStr}</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-white tracking-tight">
                            ${currentPrice.toFixed(2)}
                        </span>
                    </div>
                    <div className={`flex items-center gap-1 text-sm font-medium mt-1 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositive ? '+' : ''}{change.toFixed(2)} ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
                    </div>
                    <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-white/5">
                        vs {timeRange === '1D' ? 'prev close' : `${timeRange} start`} (${startPrice.toFixed(2)})
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
        } else if (timeRange === '5Y' || timeRange === 'MAX') {
            return date.getFullYear().toString();
        } else {
            // 1W, 1M, 3M, 1Y -> Short Month + Day (e.g., "Nov 25")
            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        }
    };

    // Helper to format large numbers (T/B/M)
    const formatLargeNumber = (num) => {
        if (!num) return '-';
        if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
        if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
        if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
        return `$${num.toLocaleString()}`;
    };



    return (
        <div className="w-full max-w-7xl mx-auto p-6 space-y-12" onClick={() => setShowSuggestions(false)}>
            {/* Search Section */}
            <div className="flex flex-col items-center relative z-20 min-h-[80vh]">
                {/* Title Section - At the top */}
                <div className="text-center space-y-2 mb-8 pt-4">
                    <h1 className="text-4xl font-bold text-white tracking-tight">Market Intelligence</h1>
                    <p className="text-slate-400 text-lg">Real-time data, AI analysis, and institutional-grade charts.</p>
                </div>

                {/* Centered Content Group */}
                <div className="flex-1 flex flex-col justify-center items-center w-full max-w-2xl -mt-32">
                    <div className="w-full" ref={searchContainerRef} onClick={(e) => e.stopPropagation()}>
                        {/* Start Your Analysis & Popular Tickers - Moved Above Search */}
                        {!stockData && !loading && (
                            <div className="flex flex-col items-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 ring-1 ring-white/10">
                                        <TrendingUp className="w-6 h-6 text-slate-400" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white">Start Your Analysis</h3>
                                </div>
                                <p className="text-slate-500 text-sm max-w-md mx-auto text-center mb-6">
                                    Search for any global stock, ETF, or index to view real-time price action.
                                </p>

                                <div className="flex flex-wrap justify-center items-center gap-3">
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
                                disabled={loading}
                                className="absolute right-3 top-3 p-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-white transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Search className="w-5 h-5" />
                                )}
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
                    {error && <p className="text-rose-400 bg-rose-500/10 px-4 py-2 rounded-lg border border-rose-500/20 text-sm font-medium animate-in fade-in slide-in-from-top-2 mt-4">{error}</p>}
                </div>
            </div>
            {!loading && stockData && (
                <div id="stock-results" className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 -mt-12">

                    {/* Ticker Info */}
                    <FadeInSection>
                        <div className="flex flex-col items-center text-center gap-6 border-b border-white/5 pb-8">
                            <div className="flex flex-col items-center">
                                <div className="flex items-center justify-center gap-4 mb-2">
                                    <h1 className="text-5xl font-bold text-white tracking-tight">{stockData.name}</h1>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider border ${isMarketOpen() ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-700/30 text-slate-400 border-slate-600/30'}`}>
                                        {isMarketOpen() ? 'MARKET OPEN' : 'MARKET CLOSED'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-center gap-3 text-xl text-slate-400">
                                    <span className="font-semibold text-white">{stockData.symbol}</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                    <span className="text-slate-500">Nasdaq</span>
                                </div>
                                <p className="text-lg text-slate-400 mt-4 max-w-3xl leading-relaxed mx-auto">{stockData.description}</p>
                            </div>
                        </div>
                    </FadeInSection>

                    {/* Main Content Grid */}
                    <FadeInSection delay={100} className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* Left Column: Chart & Stats (Span 2) */}
                        <div className="lg:col-span-2 space-y-8">

                            {/* Chart Card */}
                            <div className="glass-panel rounded-3xl p-1 border border-white/5 bg-slate-900/40 shadow-xl shadow-black/10">
                                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                                    <div className="flex flex-col">
                                        {chartLoading ? (
                                            <div className="animate-pulse space-y-4">
                                                <div className="h-12 w-48 bg-slate-800 rounded-lg"></div>
                                                <div className="h-6 w-32 bg-slate-800 rounded-lg"></div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="text-5xl font-bold text-white tracking-tighter tabular-nums flex items-center">
                                                    $<AnimatedPrice value={displayData.price || 0} />
                                                </div>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <div className={`flex items-center gap-2 text-xl font-medium ${displayData.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {displayData.isPositive ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
                                                        {/* Price Change */}
                                                        <span className="flex items-center">
                                                            {displayData.isPositive ? '+' : ''}<AnimatedPrice value={displayData.change || 0} />
                                                        </span>
                                                        {/* Percent Change */}
                                                        <span className="flex items-center">
                                                            (<AnimatedPrice value={displayData.percent || 0} />%)
                                                        </span>
                                                    </div>
                                                    <span className="text-slate-500 text-base font-normal">
                                                        {displayData.label}
                                                    </span>
                                                </div>
                                                {/* Secondary Info (e.g. Regular Close when showing After Hours) */}
                                                {/* Secondary Info (e.g. Regular Close when showing After Hours) */}
                                                {afterHoursData && (
                                                    <div className={`flex items-center gap-2 mt-1 text-sm font-medium text-slate-400`}>
                                                        <span className="text-slate-500 font-normal">Market Close:</span>
                                                        ${(afterHoursData.regularClosePrice || 0).toFixed(2)}
                                                        <span className={(stockData.changePercent || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                                            ({(stockData.changePercent || 0) >= 0 ? '+' : ''}{(stockData.changePercent || 0).toFixed(2)}%)
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <div className="flex bg-slate-800/50 rounded-lg p-1 ring-1 ring-white/5">
                                        {Object.keys(TIME_RANGES).map((range) => (
                                            <button
                                                key={range}
                                                onClick={() => updateStockState({ timeRange: range })}
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
                                    {isMounted ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart
                                                data={activeComparables.length > 0 ? getRelativeData() : chartData}
                                                margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
                                                onMouseLeave={() => {
                                                    setHoveredData(null);
                                                }}
                                                onMouseMove={(e) => {
                                                    if (activeComparables.length === 0 && e.activePayload && e.activePayload.length > 0) {
                                                        setHoveredData(e.activePayload[0].payload);
                                                    }
                                                }}
                                            >
                                                <defs>
                                                    {/* Dynamic Color Gradient for Fill */}
                                                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={activeComparables.length > 0 ? '#3b82f6' : (displayData.isPositive ? '#34d399' : '#f43f5e')} stopOpacity={0.1} />
                                                        <stop offset="95%" stopColor={activeComparables.length > 0 ? '#3b82f6' : (displayData.isPositive ? '#34d399' : '#f43f5e')} stopOpacity={0} />
                                                    </linearGradient>

                                                    {/* Multi-Segment Gradient for Stroke (1D View) */}
                                                    {timeRange === '1D' && (preMarketData || afterHoursData) ? (
                                                        <linearGradient id="splitColor" x1="0" y1="0" x2="1" y2="0">
                                                            {preMarketData && !afterHoursData && (
                                                                <>
                                                                    <stop offset={0} stopColor="#94a3b8" />
                                                                    <stop offset={preMarketData.splitOffset} stopColor="#94a3b8" />
                                                                </>
                                                            )}
                                                            <stop offset={afterHoursData ? 0 : (preMarketData ? preMarketData.splitOffset : 0)} stopColor={stockData.changePercent >= 0 ? '#34d399' : '#f43f5e'} />
                                                            <stop offset={afterHoursData ? visibleSplitOffset : (afterHoursData ? afterHoursData.splitOffset : 1)} stopColor={stockData.changePercent >= 0 ? '#34d399' : '#f43f5e'} />
                                                            {afterHoursData && (
                                                                <>
                                                                    <stop offset={visibleSplitOffset} stopColor="#94a3b8" />
                                                                    <stop offset={1} stopColor="#94a3b8" />
                                                                </>
                                                            )}
                                                        </linearGradient>
                                                    ) : (
                                                        <linearGradient id="standardColor" x1="0" y1="0" x2="1" y2="0">
                                                            <stop offset="0%" stopColor={displayData.isPositive ? '#34d399' : '#f43f5e'} />
                                                            <stop offset="100%" stopColor={displayData.isPositive ? '#34d399' : '#f43f5e'} />
                                                        </linearGradient>
                                                    )}

                                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={activeComparables.length > 0 ? '#3b82f6' : (stockData.change >= 0 ? '#10b981' : '#f43f5e')} stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor={activeComparables.length > 0 ? '#3b82f6' : (stockData.change >= 0 ? '#10b981' : '#f43f5e')} stopOpacity={0} />
                                                    </linearGradient>

                                                    {/* Glow Filter */}
                                                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                                                        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                                                        <feMerge>
                                                            <feMergeNode in="coloredBlur" />
                                                            <feMergeNode in="SourceGraphic" />
                                                        </feMerge>
                                                    </filter>
                                                </defs>

                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                                                <XAxis
                                                    dataKey="date"
                                                    stroke="#94a3b8"
                                                    fontSize={12}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    minTickGap={30}
                                                    tickFormatter={(str) => {
                                                        const date = new Date(str);
                                                        if (timeRange === '1D') return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                                                        if (timeRange === '1W' || timeRange === '1M') return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                                                        return date.toLocaleDateString([], { month: 'short', year: '2-digit' });
                                                    }}
                                                />
                                                <YAxis
                                                    domain={['auto', 'auto']}
                                                    stroke="#94a3b8"
                                                    fontSize={12}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    tickFormatter={(val) => activeComparables.length > 0 ? `${val.toFixed(2)}%` : `$${val.toFixed(2)}`}
                                                    width={60}
                                                />
                                                {activeComparables.length > 0 && (
                                                    <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" opacity={0.5} />
                                                )}
                                                {/* Legend for quick identification */}
                                                {activeComparables.length > 0 && (
                                                    <Legend
                                                        verticalAlign="top"
                                                        height={36}
                                                        iconType="circle"
                                                        formatter={(value) => <span className="text-slate-300 text-xs font-bold ml-1">{value === 'value' ? stockData.symbol : value}</span>}
                                                    />
                                                )}
                                                {activeComparables.length > 0 ? (
                                                    <Tooltip
                                                        content={({ active, payload, label }) => {
                                                            if (active && payload && payload.length) {
                                                                return (
                                                                    <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 p-3 rounded-xl shadow-xl min-w-[200px]">
                                                                        <p className="text-slate-400 text-xs font-bold mb-3 border-b border-white/5 pb-2">
                                                                            {new Date(label).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                            {timeRange === '1D' && ` ${new Date(label).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
                                                                        </p>
                                                                        <div className="space-y-2">
                                                                            {payload.map((entry, index) => (
                                                                                <div key={index} className="flex items-center justify-between gap-4 text-sm">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <div
                                                                                            className="w-2.5 h-2.5 rounded-full"
                                                                                            style={{ backgroundColor: entry.color }}
                                                                                        />
                                                                                        <span className={`${entry.name === stockData.symbol ? 'text-white font-bold' : 'text-slate-300'}`}>
                                                                                            {entry.name === 'value' ? stockData.symbol : entry.name}
                                                                                        </span>
                                                                                    </div>
                                                                                    <span className={`font-mono ${entry.value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                                        {entry.value > 0 ? '+' : ''}{parseFloat(entry.value).toFixed(2)}%
                                                                                    </span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        }}
                                                    />
                                                ) : (
                                                    <Tooltip
                                                        content={<CustomTooltip />}
                                                        cursor={{ stroke: '#fff', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.5 }}
                                                    />
                                                )}
                                                <Area
                                                    type="monotone"
                                                    dataKey={activeComparables.length > 0 ? stockData.symbol : "price"}
                                                    name={activeComparables.length > 0 ? stockData.symbol : "value"}
                                                    stroke={activeComparables.length > 0 ? '#3b82f6' : ((timeRange === '1D' && (preMarketData || afterHoursData)) ? "url(#splitColor)" : "url(#standardColor)")}
                                                    strokeWidth={activeComparables.length > 0 ? 4 : 2}
                                                    fillOpacity={1}
                                                    fill="url(#colorPrice)"
                                                    connectNulls={true}
                                                />

                                                {/* Competitor Lines */}
                                                {activeComparables.map((ticker, idx) => {
                                                    const colors = ['#f472b6', '#60a5fa', '#a78bfa', '#fbbf24'];
                                                    const color = colors[idx % colors.length];
                                                    return (
                                                        <Line
                                                            key={ticker}
                                                            type="monotone"
                                                            dataKey={ticker}
                                                            stroke={color}
                                                            strokeWidth={2}
                                                            dot={false}
                                                            activeDot={{ r: 6, strokeWidth: 0 }}
                                                            isAnimationActive={true}
                                                            connectNulls={true}
                                                        />
                                                    );
                                                })}

                                                {/* Reference Dots for live price (only in price mode) */}
                                                {activeComparables.length === 0 && stockData.price && chartData.length > 0 && (
                                                    <ReferenceDot
                                                        x={chartData[chartData.length - 1]?.date}
                                                        y={stockData.price}
                                                        r={6}
                                                        fill={displayData.isPositive ? '#34d399' : '#f43f5e'}
                                                        stroke="#fff"
                                                        strokeWidth={2}
                                                        isFront={true}
                                                        shape={(props) => {
                                                            const { cx, cy } = props;
                                                            const color = displayData.isPositive ? '#34d399' : '#f43f5e';
                                                            return (
                                                                <g>
                                                                    {/* Outer glow ring */}
                                                                    <circle cx={cx} cy={cy} r={12} fill={color} opacity={0.2}>
                                                                        <animate attributeName="r" values="10;14;10" dur="1.5s" repeatCount="indefinite" />
                                                                        <animate attributeName="opacity" values="0.3;0.1;0.3" dur="1.5s" repeatCount="indefinite" />
                                                                    </circle>
                                                                    {/* Inner dot */}
                                                                    <circle cx={cx} cy={cy} r={5} fill={color} stroke="#fff" strokeWidth={2} />
                                                                </g>
                                                            );
                                                        }}
                                                    />
                                                )}
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-slate-500">
                                            Loading Chart...
                                        </div>
                                    )}
                                </div>

                                {/* Disclaimer moved above comparable bar */}
                                <div className="px-6 pb-2 pt-2 flex justify-end">
                                    <p className="text-xs text-slate-500 font-medium">
                                        * Prices may be delayed
                                    </p>
                                </div>

                            </div>

                            {/* Comparable Securities Control Bar - Separated for clean layout */}
                            <div className="glass-panel rounded-2xl p-4 border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${loadingComparables ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}>
                                        {loadingComparables ? <Loader2 className="w-5 h-5 animate-spin" /> : <TrendingUp className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-300 uppercase tracking-wider">Comparable Analysis</p>
                                        <p className="text-xs text-slate-500 font-medium">
                                            {loadingComparables ? "AI identifying comparable securities..." : comparables.length > 0 ? "Toggle to compare" : "No comparables found"}
                                        </p>
                                    </div>
                                    {/* Color Legend (Only visible when active) */}
                                    {activeComparables.length > 0 && (
                                        <div className="hidden md:flex items-center gap-3 ml-4 pl-4 border-l border-white/10">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-2 h-2 rounded-full bg-[#22c55e]"></div>
                                                <span className="text-[10px] text-slate-400 font-mono">{stockData.symbol}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {comparables.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {comparables.map((comp, idx) => {
                                            const isActive = activeComparables.includes(comp);
                                            // Unique colors for competitors
                                            const colors = ['#f472b6', '#60a5fa', '#a78bfa', '#fbbf24'];
                                            const color = colors[idx % colors.length];

                                            return (
                                                <button
                                                    key={comp}
                                                    onClick={() => {
                                                        setActiveComparables(prev =>
                                                            prev.includes(comp)
                                                                ? prev.filter(c => c !== comp)
                                                                : [...prev, comp]
                                                        );
                                                    }}
                                                    className={`
                                                        px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 border
                                                        ${isActive
                                                            ? `bg-[${color}]/10 border-[${color}]/50 text-white shadow-[0_0_10px_-2px_${color}]`
                                                            : 'bg-slate-800/50 border-white/5 text-slate-400 hover:bg-white/5 hover:border-white/10'
                                                        }
                                                    `}
                                                    style={isActive ? { borderColor: color, color: '#fff', backgroundColor: `${color}20` } : {}}
                                                >
                                                    {isActive ? '✓ ' : '+ '}{comp}
                                                    {isActive && (
                                                        <span className="ml-2 w-1.5 h-1.5 inline-block rounded-full" style={{ backgroundColor: color }}></span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
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
                                {stockInfo && (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/5">
                                        <div className="bg-slate-800/40 p-5 rounded-2xl border border-white/5 hover:bg-white/5 transition-colors">
                                            <p className="text-xs text-slate-500 mb-1 font-bold uppercase tracking-wider">Mkt Cap</p>
                                            <p className="text-xl font-bold text-white tracking-tight">
                                                {formatLargeNumber(stockInfo.marketCap)}
                                            </p>
                                        </div>
                                        <div className="bg-slate-800/40 p-5 rounded-2xl border border-white/5 hover:bg-white/5 transition-colors">
                                            <p className="text-xs text-slate-500 mb-1 font-bold uppercase tracking-wider">P/E Ratio</p>
                                            <p className="text-xl font-bold text-white tracking-tight">
                                                {stockInfo.trailingPE ? stockInfo.trailingPE.toFixed(2) : '-'}
                                            </p>
                                        </div>
                                        <div className="bg-slate-800/40 p-5 rounded-2xl border border-white/5 hover:bg-white/5 transition-colors">
                                            <p className="text-xs text-slate-500 mb-1 font-bold uppercase tracking-wider">52-Wk High</p>
                                            <p className="text-xl font-bold text-white tracking-tight">
                                                {stockInfo.fiftyTwoWeekHigh ? `$${stockInfo.fiftyTwoWeekHigh.toFixed(2)}` : '-'}
                                            </p>
                                        </div>
                                        <div className="bg-slate-800/40 p-5 rounded-2xl border border-white/5 hover:bg-white/5 transition-colors">
                                            <p className="text-xs text-slate-500 mb-1 font-bold uppercase tracking-wider">52-Wk Low</p>
                                            <p className="text-xl font-bold text-white tracking-tight">
                                                {stockInfo.fiftyTwoWeekLow ? `$${stockInfo.fiftyTwoWeekLow.toFixed(2)}` : '-'}
                                            </p>
                                        </div>
                                        <div className="bg-slate-800/40 p-5 rounded-2xl border border-white/5 hover:bg-white/5 transition-colors">
                                            <p className="text-xs text-slate-500 mb-1 font-bold uppercase tracking-wider">Div Yield</p>
                                            <p className="text-xl font-bold text-white tracking-tight">
                                                {stockInfo.dividendYield ? `${stockInfo.dividendYield.toFixed(2)}%` : '-'}
                                            </p>
                                        </div>
                                        <div className="bg-slate-800/40 p-5 rounded-2xl border border-white/5 hover:bg-white/5 transition-colors">
                                            <p className="text-xs text-slate-500 mb-1 font-bold uppercase tracking-wider">Qtrly Div</p>
                                            <p className="text-xl font-bold text-white tracking-tight">
                                                {stockInfo.lastDividendValue ? `$${stockInfo.lastDividendValue.toFixed(2)}` : '-'}
                                            </p>
                                        </div>
                                        <div className="bg-slate-800/40 p-5 rounded-2xl border border-white/5 hover:bg-white/5 transition-colors">
                                            <p className="text-xs text-slate-500 mb-1 font-bold uppercase tracking-wider">EPS (TTM)</p>
                                            <p className="text-xl font-bold text-white tracking-tight">
                                                {stockInfo.trailingEps ? stockInfo.trailingEps.toFixed(2) : '-'}
                                            </p>
                                        </div>
                                        <div className="bg-slate-800/40 p-5 rounded-2xl border border-white/5 hover:bg-white/5 transition-colors">
                                            <p className="text-xs text-slate-500 mb-1 font-bold uppercase tracking-wider">Volume</p>
                                            <p className="text-xl font-bold text-white tracking-tight">
                                                {formatLargeNumber(stockInfo.volume)}
                                            </p>
                                        </div>
                                        <div className="bg-slate-800/40 p-5 rounded-2xl border border-white/5 hover:bg-white/5 transition-colors">
                                            <p className="text-xs text-slate-500 mb-1 font-bold uppercase tracking-wider">Beta</p>
                                            <p className="text-xl font-bold text-white tracking-tight">
                                                {stockInfo.beta ? stockInfo.beta.toFixed(2) : '-'}
                                            </p>
                                        </div>

                                    </div>
                                )}
                            </div>

                            {/* Debug Info - Temporary */}


                            {/* Performance Comparison Cards */}
                            {stockInfo?.returns && (
                                <FadeInSection delay={100}>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                        {['ytd', '1y', '3y', '5y'].map((period) => {
                                            const data = stockInfo.returns[period];
                                            if (!data) return null;

                                            const labels = { ytd: 'YTD Return', '1y': '1-Year Return', '3y': '3-Year Return', '5y': '5-Year Return' };
                                            const label = labels[period];

                                            return (
                                                <div key={period} className="bg-slate-900/40 rounded-xl p-4 border border-white/5">
                                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">{label}</p>
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-sm font-bold text-white">{stockData.symbol}</span>
                                                            <span className={`text-sm font-bold ${data.ticker >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                {data.ticker >= 0 ? '+' : ''}{data.ticker?.toFixed(2)}%
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-xs font-medium text-slate-500">S&P 500</span>
                                                            <span className={`text-xs font-medium ${data.spy >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                {data.spy >= 0 ? '+' : ''}{data.spy?.toFixed(2)}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </FadeInSection>
                            )}

                            {/* Earnings Trends Section */}
                            {stockInfo?.earningsHistory && stockInfo.earningsHistory.length > 0 && (
                                <FadeInSection delay={200}>
                                    <div className="glass-panel rounded-3xl p-8 border border-white/5 col-span-1 lg:col-span-2">
                                        <div className="flex justify-between items-center mb-8">
                                            <h3 className="text-xl font-bold text-white">Earnings Trends: {stockData.symbol}</h3>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {/* EPS Chart */}
                                            <div className="bg-slate-900/40 rounded-2xl p-6 border border-white/5">
                                                <div className="flex justify-between items-center mb-6">
                                                    <h4 className="text-sm font-bold text-slate-300">Earnings Per Share</h4>
                                                    <div className="flex gap-4 text-xs font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                                                            <span className="text-slate-400">Estimate</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                                            <span className="text-slate-400">Actual</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="h-[300px] w-full">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <ComposedChart data={stockInfo.earningsHistory} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                            <XAxis
                                                                dataKey="quarter"
                                                                stroke="#475569"
                                                                tick={{ fill: '#64748b', fontSize: 11 }}
                                                                tickLine={false}
                                                                axisLine={false}
                                                                dy={10}
                                                            />
                                                            <YAxis
                                                                stroke="#475569"
                                                                tick={{ fill: '#64748b', fontSize: 11 }}
                                                                tickLine={false}
                                                                axisLine={false}
                                                                tickFormatter={(val) => val.toFixed(2)}
                                                            />
                                                            <Tooltip
                                                                content={({ active, payload }) => {
                                                                    if (active && payload && payload.length) {
                                                                        const data = payload[0].payload;
                                                                        const surprise = data.epsReported - data.epsEstimate;
                                                                        const isBeat = surprise >= 0;
                                                                        return (
                                                                            <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 p-3 rounded-xl shadow-xl text-xs">
                                                                                <p className="text-slate-400 mb-1 font-bold">{data.quarter}</p>
                                                                                <div className="space-y-1">
                                                                                    <p className="text-slate-300">Est: <span className="text-white font-medium">{data.epsEstimate?.toFixed(2)}</span></p>
                                                                                    <p className="text-slate-300">Act: <span className={`font-medium ${isBeat ? 'text-emerald-400' : 'text-rose-400'}`}>{data.epsReported?.toFixed(2)}</span></p>
                                                                                    <p className={`font-bold ${isBeat ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                                        {isBeat ? 'Beat' : 'Missed'} by {Math.abs(surprise).toFixed(2)}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return null;
                                                                }}
                                                                cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                                                            />
                                                            {/* Estimate Dots (Grey) */}
                                                            <Scatter name="Estimate" dataKey="epsEstimate" fill="#64748b" shape="circle" />

                                                            {/* Actual Dots (Colored) */}
                                                            <Scatter name="Actual" dataKey="epsReported" shape="circle">
                                                                {stockInfo.earningsHistory.map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={entry.epsReported >= entry.epsEstimate ? '#34d399' : '#f43f5e'} />
                                                                ))}
                                                            </Scatter>
                                                        </ComposedChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>

                                            {/* Revenue vs Earnings Chart */}
                                            <div className="bg-slate-900/40 rounded-2xl p-6 border border-white/5">
                                                <div className="flex justify-between items-center mb-6">
                                                    <h4 className="text-sm font-bold text-slate-300">Revenue vs. Earnings</h4>
                                                    <div className="flex gap-4 text-xs font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-sm bg-blue-500"></span>
                                                            <span className="text-slate-400">Revenue</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-sm bg-amber-400"></span>
                                                            <span className="text-slate-400">Earnings</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="h-[300px] w-full">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={stockInfo.earningsHistory} margin={{ top: 20, right: 20, bottom: 20, left: 0 }} barGap={2}>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                            <XAxis
                                                                dataKey="quarter"
                                                                stroke="#475569"
                                                                tick={{ fill: '#64748b', fontSize: 11 }}
                                                                tickLine={false}
                                                                axisLine={false}
                                                                dy={10}
                                                            />
                                                            <YAxis
                                                                stroke="#475569"
                                                                tick={{ fill: '#64748b', fontSize: 11 }}
                                                                tickLine={false}
                                                                axisLine={false}
                                                                tickFormatter={(val) => formatLargeNumber(val)}
                                                                width={45}
                                                            />
                                                            <Tooltip
                                                                content={({ active, payload }) => {
                                                                    if (active && payload && payload.length) {
                                                                        const data = payload[0].payload;
                                                                        return (
                                                                            <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 p-3 rounded-xl shadow-xl text-xs">
                                                                                <p className="text-slate-400 mb-1 font-bold">{data.quarter}</p>
                                                                                <div className="space-y-1">
                                                                                    <p className="text-slate-300">Rev: <span className="text-blue-400 font-medium">{formatLargeNumber(data.revenue)}</span></p>
                                                                                    <p className="text-slate-300">Earn: <span className="text-amber-400 font-medium">{formatLargeNumber(data.earnings)}</span></p>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return null;
                                                                }}
                                                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                            />
                                                            <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                                            <Bar dataKey="earnings" fill="#fbbf24" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </FadeInSection>
                            )}
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
                                {aiSummary && (
                                    <p className="text-xs text-slate-500 mt-4">AI-powered, not financial advice.</p>
                                )}
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
                                                        {item.source || new URL(item.url).hostname.replace('www.', '')}
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

                            {/* Analyst Ratings (Mobile/Right Col placement or generally here?) */}
                            {/* Actually I'll place it in the Main Column below Stats for better width? */}
                            {/* No, let's put it in the Main Column (Left, col-span-2) at the bottom */}
                        </div>
                    </FadeInSection >

                    {/* Analyst Ratings Section - Full Width */}
                    <FadeInSection>
                        <AnalystRatings
                            data={stockViewerState.analystRatings}
                            loading={loadingAnalystRatings}
                        />
                    </FadeInSection>
                </div>
            )
            }
        </div >
    );
}
