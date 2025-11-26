"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, PlusCircle, PieChart as PieIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useToast } from "./Toast";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

export default function PortfolioBuilder({ assets, onAddAsset, onRemoveAsset }) {
    const [ticker, setTicker] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const searchContainerRef = useRef(null);
    const inputRef = useRef(null);
    const toast = useToast();

    // Calculate equal weights for preview
    const allocationData = assets.map((asset, index) => ({
        name: asset.symbol,
        value: 100 / assets.length,
        color: COLORS[index % COLORS.length]
    }));

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
                // Prevent race condition: only update if input still matches the query
                if (inputRef.current && inputRef.current.value.toUpperCase() !== value) return;

                const data = await res.json();
                setSuggestions(data.result || []);
                setShowSuggestions(true);
            }
        } catch (err) {
            console.error("Autocomplete error:", err);
        }
    };

    const handleAdd = (symbol, description) => {
        onAddAsset(symbol, description);
        setTicker("");
        if (inputRef.current) inputRef.current.value = "";
        setSuggestions([]);
        setShowSuggestions(false);
        setSelectedIndex(-1);
    };

    const [isValidating, setIsValidating] = useState(false);

    const validateAndAdd = async (tickerSymbol) => {
        if (isValidating) return;
        setIsValidating(true);

        try {
            // Strict validation: Check against API
            const res = await fetch(`/api/proxy?service=finnhubAutocomplete&query=${encodeURIComponent(tickerSymbol)}`);
            if (res.ok) {
                const data = await res.json();
                const results = data.result || [];

                // Check for exact match
                const match = results.find(s => s.symbol.toUpperCase() === tickerSymbol);

                if (match) {
                    handleAdd(match.symbol, match.description);
                } else {
                    toast.error(`Invalid ticker "${tickerSymbol}". Please select a valid stock.`);
                }
            } else {
                toast.error("Validation failed. Please try again.");
            }
        } catch (err) {
            console.error("Validation error:", err);
            toast.error("Validation error. Please check your connection.");
        } finally {
            setIsValidating(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                // Add from selected suggestion
                handleAdd(suggestions[selectedIndex].symbol, suggestions[selectedIndex].description);
            } else if (ticker.trim()) {
                const tickerSymbol = ticker.trim().toUpperCase();
                const matchingSuggestion = suggestions.find(s => s.symbol.toUpperCase() === tickerSymbol);

                if (matchingSuggestion) {
                    // Valid ticker found in suggestions
                    handleAdd(matchingSuggestion.symbol, matchingSuggestion.description);
                } else {
                    // Fast typing case: Validate asynchronously
                    validateAndAdd(tickerSymbol);
                }
            }
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            if (showSuggestions && suggestions.length > 6) {
                setSelectedIndex(prev => (prev + 1) % Math.min(suggestions.length, 6));
            }
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (showSuggestions && suggestions.length > 0) {
                setSelectedIndex(prev => (prev - 1 + Math.min(suggestions.length, 6)) % Math.min(suggestions.length, 6));
            }
        }
    };

    const handleAddClick = () => {
        if (ticker.trim()) {
            const tickerSymbol = ticker.trim().toUpperCase();
            // Only add if ticker exists in suggestions (valid ticker)
            const matchingSuggestion = suggestions.find(s => s.symbol.toUpperCase() === tickerSymbol);

            if (matchingSuggestion) {
                // Valid ticker found in suggestions
                handleAdd(matchingSuggestion.symbol, matchingSuggestion.description);
            } else {
                // Fast typing case: Validate asynchronously
                validateAndAdd(tickerSymbol);
            }
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[600px]">
            {/* Left Column: Search & List (Span 2) */}
            <div className="lg:col-span-2 space-y-8">
                {/* Header */}
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Build Your Portfolio</h2>
                    <p className="text-slate-400 text-lg">Add assets to analyze risk and optimize allocation.</p>
                </div>

                {/* Search Input */}
                <div className="relative z-20" ref={searchContainerRef} onClick={(e) => e.stopPropagation()}>
                    <div className="relative flex gap-3">
                        <div className="relative flex-1 group">
                            <input
                                ref={inputRef}
                                type="text"
                                value={ticker}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                onFocus={() => ticker && setShowSuggestions(true)}
                                placeholder="Search for a ticker (e.g., AAPL)..."
                                autoComplete="off"
                                className="w-full pl-14 pr-4 py-5 bg-slate-900/60 border border-white/10 rounded-2xl text-white text-lg placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-xl backdrop-blur-xl group-hover:border-white/20"
                            />
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 group-hover:text-blue-400 transition-colors" />
                            {ticker && (
                                <button
                                    onClick={() => {
                                        setTicker("");
                                        setSuggestions([]);
                                        setShowSuggestions(false);
                                    }}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={handleAddClick}
                            disabled={!ticker.trim()}
                            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/20 disabled:shadow-none transition-all disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap transform active:scale-95"
                            title="Add ticker to portfolio"
                        >
                            <PlusCircle className="w-6 h-6" />
                            Add
                        </button>
                    </div>

                    {/* Autocomplete Suggestions */}
                    <AnimatePresence>
                        {showSuggestions && suggestions.length > 0 && (
                            <motion.ul
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                transition={{ duration: 0.2 }}
                                className="absolute w-full mt-3 bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-[320px] overflow-y-auto backdrop-blur-xl custom-scrollbar"
                            >
                                {suggestions.slice(0, 8).map((item, index) => (
                                    <li
                                        key={index}
                                        onClick={() => handleAdd(item.symbol, item.description)}
                                        className={`px-5 py-4 cursor-pointer transition-colors border-b border-white/5 last:border-none flex items-center justify-between group ${index === selectedIndex ? 'bg-blue-500/10' : 'hover:bg-white/5'
                                            }`}
                                    >
                                        <div>
                                            <div className={`font-bold text-lg ${index === selectedIndex ? 'text-blue-400' : 'text-white group-hover:text-blue-400 transition-colors'}`}>{item.symbol}</div>
                                            <div className="text-sm text-slate-400 truncate max-w-[300px]">{item.description}</div>
                                        </div>
                                        <PlusCircle className={`w-5 h-5 ${index === selectedIndex ? 'text-blue-400' : 'text-slate-600 group-hover:text-blue-400'} transition-colors`} />
                                    </li>
                                ))}
                            </motion.ul>
                        )}
                    </AnimatePresence>
                </div>

                {/* Asset List */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <PieIcon className="w-4 h-4" />
                            Current Assets <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full text-xs">{assets.length}</span>
                        </h3>
                    </div>

                    <AnimatePresence mode="popLayout">
                        {assets.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.02]"
                            >
                                <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                                    <Search className="w-10 h-10 text-slate-600" />
                                </div>
                                <h4 className="text-xl font-semibold text-white mb-2">Your portfolio is empty</h4>
                                <p className="text-slate-500 text-center max-w-xs">Search for stocks or ETFs above to start building your portfolio.</p>
                            </motion.div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {assets.map((asset, index) => (
                                    <motion.div
                                        key={asset.symbol}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="group relative flex items-center justify-between p-5 rounded-2xl bg-slate-800/40 border border-white/5 hover:bg-slate-800/60 hover:border-white/10 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 pr-12"
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div
                                                className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-lg shadow-inner flex-shrink-0"
                                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                            >
                                                {asset.symbol.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-bold text-white text-xl tracking-tight truncate">{asset.symbol}</div>
                                                <div className="text-xs text-slate-400 font-medium truncate max-w-[140px]">{asset.description}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => onRemoveAsset(asset.symbol)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                            title="Remove asset"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Right Column: Live Allocation Preview (Span 1) */}
            <div className="lg:col-span-1">
                <div className="glass-panel rounded-3xl p-8 border border-white/5 shadow-2xl bg-slate-900/40 backdrop-blur-md h-full">
                    <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                            <PieIcon className="w-6 h-6" />
                        </div>
                        Target Allocation
                    </h3>

                    {assets.length > 0 ? (
                        <div className="relative">
                            <div className="h-[320px] w-full relative z-10">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={allocationData}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={4}
                                            dataKey="value"
                                            stroke="none"
                                            cornerRadius={6}
                                        >
                                            {allocationData.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={entry.color}
                                                    className="hover:opacity-80 transition-opacity cursor-pointer"
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', padding: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                                            itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                                            formatter={(value) => `${value.toFixed(1)}%`}
                                            cursor={false}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                {/* Center Text */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-4xl font-bold text-white tracking-tighter">{assets.length}</span>
                                    <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold mt-1">Assets</span>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="mt-8 space-y-3 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                                {allocationData.map((entry, index) => (
                                    <div key={entry.name} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-white/5 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
                                            <span className="text-slate-200 font-bold">{entry.name}</span>
                                        </div>
                                        <span className="text-slate-400 font-mono">{(100 / assets.length).toFixed(1)}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="h-[300px] flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
                            <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                                <PieIcon className="w-8 h-8 text-slate-600" />
                            </div>
                            <p className="text-slate-400 text-sm font-medium">Add assets to visualize<br />your target allocation</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
