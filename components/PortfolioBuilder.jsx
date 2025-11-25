"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, PlusCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PortfolioBuilder({ assets, onAddAsset, onRemoveAsset }) {
    const [ticker, setTicker] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const searchContainerRef = useRef(null);
    const inputRef = useRef(null);

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
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Build Your Portfolio</h2>
                <p className="text-slate-400">Add assets by searching for ticker symbols</p>
            </div>

            {/* Search Input */}
            <div className="relative" ref={searchContainerRef} onClick={(e) => e.stopPropagation()}>
                <div className="relative flex gap-2">
                    <div className="relative flex-1">

                        <input
                            ref={inputRef}
                            type="text"
                            value={ticker}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            onFocus={() => ticker && setShowSuggestions(true)}
                            placeholder="Search for a ticker (e.g., AAPL)..."
                            autoComplete="off"
                            className="w-full pl-12 pr-4 py-4 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        {ticker && (
                            <button
                                onClick={() => {
                                    setTicker("");
                                    setSuggestions([]);
                                    setShowSuggestions(false);
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-slate-700/50 transition-colors text-slate-400 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={handleAddClick}
                        disabled={!ticker.trim()}
                        className="px-6 py-4 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-medium transition-all disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                        title="Add ticker to portfolio"
                    >
                        <PlusCircle className="w-5 h-5" />
                        Add
                    </button>
                </div>

                {/* Autocomplete Suggestions */}
                {showSuggestions && suggestions.length > 0 && (
                    <ul className="absolute w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50 max-h-60 overflow-y-auto">
                        {suggestions.slice(0, 6).map((item, index) => (
                            <li
                                key={index}
                                onClick={() => handleAdd(item.symbol, item.description)}
                                className={`px-4 py-3 cursor-pointer transition-colors border-b border-slate-700/50 last:border-none ${index === selectedIndex ? 'bg-slate-700' : 'hover:bg-slate-700'
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
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                        Portfolio Assets ({assets.length})
                    </h3>
                </div>

                {/* Empty State or Assets */}
                {assets.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-12 px-6"
                    >
                        <div className="inline-flex p-6 rounded-full bg-blue-500/10 mb-6">
                            <PlusCircle className="w-12 h-12 text-blue-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">Build Your Portfolio</h3>
                        <p className="text-slate-400 mb-6 max-w-md mx-auto leading-relaxed">
                            Start by searching for stocks above. Add at least 2 assets to begin optimization.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto text-left">
                            <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/30">
                                <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5" />
                                    <div>
                                        <p className="text-sm font-medium text-white">Search by ticker</p>
                                        <p className="text-xs text-slate-500 mt-1">Type AAPL, GOOGL, MSFT...</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/30">
                                <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5" />
                                    <div>
                                        <p className="text-sm font-medium text-white">Use autocomplete</p>
                                        <p className="text-xs text-slate-500 mt-1">Select from suggestions</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {assets.map((asset) => (
                            <motion.div
                                key={asset.symbol}
                                layout
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -100 }}
                                transition={{ duration: 0.2 }}
                                className="group flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/30 hover:border-slate-600 transition-all"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                                            <span className="text-white font-bold text-sm">{asset.symbol.charAt(0)}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-white">{asset.symbol}</div>
                                            <div className="text-sm text-slate-400 truncate">{asset.description}</div>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onRemoveAsset(asset.symbol)}
                                    className="ml-4 p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                                    aria-label={`Remove ${asset.symbol}`}
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}
