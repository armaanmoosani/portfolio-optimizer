"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, PlusCircle, PieChart as PieIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

export default function PortfolioBuilder({ assets, onAddAsset, onRemoveAsset }) {
    const [ticker, setTicker] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const searchContainerRef = useRef(null);
    const inputRef = useRef(null);

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

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                // Add from selected suggestion
                handleAdd(suggestions[selectedIndex].symbol, suggestions[selectedIndex].description);
            } else if (ticker.trim()) {
                // Add ticker directly if valid text is entered (uppercase for consistency)
                const tickerSymbol = ticker.trim().toUpperCase();
                // Try to find a matching suggestion for the company name
                const matchingSuggestion = suggestions.find(s => s.symbol.toUpperCase() === tickerSymbol);
                const description = matchingSuggestion ? matchingSuggestion.description : tickerSymbol;
                handleAdd(tickerSymbol, description);
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

    const handleAddClick = () => {
        if (ticker.trim()) {
            const tickerSymbol = ticker.trim().toUpperCase();
            // Try to find a matching suggestion for the company name
            const matchingSuggestion = suggestions.find(s => s.symbol.toUpperCase() === tickerSymbol);
            const description = matchingSuggestion ? matchingSuggestion.description : tickerSymbol;
            handleAdd(tickerSymbol, description);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Search & List (Span 2) */}
            <div className="lg:col-span-2 space-y-8">
                {/* Header */}
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Build Your Portfolio</h2>
                    <p className="text-slate-400 text-lg">Add assets to analyze risk and optimize allocation.</p>
                </div>

                {/* Search Input */}
                <div className="relative z-20" ref={searchContainerRef} onClick={(e) => e.stopPropagation()}>
                    <div className="relative flex gap-2">
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
                                className="w-full pl-12 pr-4 py-4 bg-slate-900/60 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-lg backdrop-blur-xl group-hover:border-white/20"
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                            {ticker && (
                                <button
                                    onClick={() => {
                                        setTicker("");
                                        setSuggestions([]);
                                        setShowSuggestions(false);
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={handleAddClick}
                            disabled={!ticker.trim()}
                            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl font-semibold transition-all disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                            title="Add ticker to portfolio"
                        >
                            <PlusCircle className="w-5 h-5" />
                            Add Asset
                        </button>
                    </div>

                    {/* Autocomplete Suggestions */}
                    {showSuggestions && suggestions.length > 0 && (
                        <ul className="absolute w-full mt-2 bg-slate-900/95 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 max-h-60 overflow-y-auto backdrop-blur-xl">
                            {suggestions.slice(0, 6).map((item, index) => (
                                <li
                                    key={index}
                                    onClick={() => handleAdd(item.symbol, item.description)}
                                    className={`px-4 py-3 cursor-pointer transition-colors border-b border-white/5 last:border-none ${index === selectedIndex ? 'bg-white/10' : 'hover:bg-white/5'
                                        }`}
                                >
                                    <div className="font-bold text-white">{item.symbol}</div>
                                    <div className="text-xs text-slate-400 truncate">{item.description}</div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Asset List */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                            Portfolio Assets ({assets.length})
                        </h3>
                    </div>

                    <AnimatePresence mode="popLayout">
                        {assets.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-12 border-2 border-dashed border-white/5 rounded-2xl"
                            >
                                <p className="text-slate-500">No assets added yet. Start searching above.</p>
                            </motion.div>
                        ) : (
                            assets.map((asset, index) => (
                                <motion.div
                                    key={asset.symbol}
                                    layout
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="group flex items-center justify-between p-4 rounded-xl glass-card hover:bg-white/5 transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-lg"
                                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                        >
                                            {asset.symbol.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-white text-lg">{asset.symbol}</div>
                                            <div className="text-sm text-slate-400">{asset.description}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onRemoveAsset(asset.symbol)}
                                        className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Right Column: Live Allocation Preview (Span 1) */}
            <div className="lg:col-span-1">
                <div className="sticky top-8 glass-panel rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <PieIcon className="w-5 h-5 text-blue-400" />
                        Allocation Preview
                    </h3>

                    {assets.length > 0 ? (
                        <div className="h-[300px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={allocationData}
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {allocationData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                                        itemStyle={{ color: '#fff' }}
                                        formatter={(value) => `${value.toFixed(1)}%`}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Center Text */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-3xl font-bold text-white">{assets.length}</span>
                                <span className="text-xs text-slate-400 uppercase tracking-wider">Assets</span>
                            </div>
                        </div>
                    ) : (
                        <div className="h-[300px] flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-white/5 rounded-xl">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                <PieIcon className="w-8 h-8 text-slate-600" />
                            </div>
                            <p className="text-slate-400 text-sm">Add assets to see your portfolio breakdown</p>
                        </div>
                    )}

                    {/* Legend */}
                    {assets.length > 0 && (
                        <div className="mt-6 space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                            {allocationData.map((entry, index) => (
                                <div key={entry.name} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                                        <span className="text-slate-300 font-medium">{entry.name}</span>
                                    </div>
                                    <span className="text-slate-500">{(100 / assets.length).toFixed(1)}%</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
