"use client";

import { useState } from "react";
import { Search, X, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PortfolioBuilder() {
    const [ticker, setTicker] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [assets, setAssets] = useState([]);

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

    const handleAddAsset = (symbol, description) => {
        if (!assets.find(asset => asset.symbol === symbol)) {
            setAssets([...assets, { symbol, description, weight: 0 }]);
        }
        setTicker("");
        setSuggestions([]);
        setShowSuggestions(false);
        setSelectedIndex(-1);
    };

    const handleRemoveAsset = (symbol) => {
        setAssets(assets.filter(asset => asset.symbol !== symbol));
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                handleAddAsset(suggestions[selectedIndex].symbol, suggestions[selectedIndex].description);
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Build Your Portfolio</h2>
                <p className="text-slate-400">Add assets by searching for ticker symbols</p>
            </div>

            {/* Search Input */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
                <div className="relative">
                    <input
                        type="text"
                        value={ticker}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onFocus={() => ticker && setShowSuggestions(true)}
                        placeholder="Search for a ticker (e.g., AAPL)..."
                        className="w-full px-5 py-3.5 pl-12 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-lg backdrop-blur-sm"
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                </div>

                {/* Autocomplete Suggestions */}
                {showSuggestions && suggestions.length > 0 && (
                    <ul className="absolute w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50 max-h-60 overflow-y-auto">
                        {suggestions.slice(0, 6).map((item, index) => (
                            <li
                                key={index}
                                onClick={() => handleAddAsset(item.symbol, item.description)}
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

                <AnimatePresence mode="popLayout">
                    {assets.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="p-8 rounded-xl border border-dashed border-slate-700 text-center"
                        >
                            <Plus className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-500">No assets added yet</p>
                            <p className="text-sm text-slate-600 mt-1">Search for tickers to build your portfolio</p>
                        </motion.div>
                    ) : (
                        <div className="space-y-2">
                            {assets.map((asset) => (
                                <motion.div
                                    key={asset.symbol}
                                    layout
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -100 }}
                                    className="group flex items-center justify-between p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:border-slate-600 transition-all"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-white">{asset.symbol}</div>
                                        <div className="text-xs text-slate-400 truncate">{asset.description}</div>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveAsset(asset.symbol)}
                                        className="ml-4 p-2 rounded-lg bg-slate-700/50 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
