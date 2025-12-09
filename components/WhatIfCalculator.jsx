"use client";

import { useState, useMemo } from 'react';
import { Calculator, Calendar, DollarSign, TrendingUp, TrendingDown, Clock, Percent, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ALL_PRESETS = [
    { label: '1M', months: 1 },
    { label: '6M', months: 6 },
    { label: '1Y', months: 12 },
    { label: '3Y', months: 36 },
    { label: '5Y', months: 60 },
    { label: '10Y', months: 120 },
];

export default function WhatIfCalculator({ ticker, currentPrice, ipoDate }) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [amount, setAmount] = useState(1000);
    const [selectedPreset, setSelectedPreset] = useState('1Y');
    const [customDate, setCustomDate] = useState('');
    const [useCustomDate, setUseCustomDate] = useState(false);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const getDateFromPreset = (months) => {
        const date = new Date();
        date.setMonth(date.getMonth() - months);
        return date.toISOString().split('T')[0];
    };

    const availablePresets = useMemo(() => {
        if (!ipoDate) return ALL_PRESETS;

        const ipo = new Date(ipoDate);
        const now = new Date();
        const monthsSinceIPO = (now.getFullYear() - ipo.getFullYear()) * 12 + (now.getMonth() - ipo.getMonth());

        return ALL_PRESETS.filter(preset => preset.months <= monthsSinceIPO);
    }, [ipoDate]);

    useMemo(() => {
        if (!useCustomDate && selectedPreset && !availablePresets.find(p => p.label === selectedPreset)) {
            const longest = availablePresets[availablePresets.length - 1];
            if (longest) setSelectedPreset(longest.label);
        }
    }, [availablePresets, selectedPreset, useCustomDate]);

    const activeDate = useMemo(() => {
        if (useCustomDate && customDate) {
            return customDate;
        }
        const preset = ALL_PRESETS.find(p => p.label === selectedPreset);
        return preset ? getDateFromPreset(preset.months) : getDateFromPreset(12);
    }, [useCustomDate, customDate, selectedPreset]);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    };

    const handleCalculate = async () => {
        if (!ticker || !activeDate || amount <= 0) return;

        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/whatif?ticker=${ticker}&date=${activeDate}&amount=${amount}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || 'Calculation failed');
            }

            setResult(data);
        } catch (e) {
            setError(e.message);
            setResult(null);
        } finally {
            setLoading(false);
        }
    };

    const handlePresetClick = (preset) => {
        setSelectedPreset(preset.label);
        setUseCustomDate(false);
        setResult(null);
    };

    const handleCustomDateChange = (e) => {
        setCustomDate(e.target.value);
        setUseCustomDate(true);
        setSelectedPreset(null);
        setResult(null);
    };

    const handleAmountChange = (e) => {
        const value = parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0;
        setAmount(value);
        setResult(null);
    };

    const isPositive = result?.gain >= 0;

    return (
        <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
                        <Calculator className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-lg font-bold text-white">Investment Calculator</h3>
                        <p className="text-xs text-slate-400">What if I had invested?</p>
                    </div>
                </div>
                {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
            </button>
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-6 pb-6 space-y-6">
                            <div className="bg-slate-900/50 rounded-2xl p-5 border border-white/5">
                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="flex-1">
                                        <label className="text-xs font-semibold text-slate-400 mb-2 block">Investment Amount</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                            <input
                                                type="text"
                                                value={amount.toLocaleString()}
                                                onChange={handleAmountChange}
                                                className="w-full bg-slate-800/50 border border-white/10 rounded-xl py-3 pl-9 pr-4 text-white font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                                                placeholder="1,000"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        <label className="text-xs font-semibold text-slate-400 mb-2 block">Custom Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                            <input
                                                type="date"
                                                value={customDate}
                                                onChange={handleCustomDateChange}
                                                max={new Date().toISOString().split('T')[0]}
                                                className="w-full bg-slate-800/50 border border-white/10 rounded-xl py-3 pl-9 pr-4 text-white font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all [color-scheme:dark]"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <label className="text-xs font-semibold text-slate-400 mb-2 block">Quick Select</label>
                                    <div className="flex flex-wrap gap-2">
                                        {availablePresets.map((preset) => (
                                            <button
                                                key={preset.label}
                                                onClick={() => handlePresetClick(preset)}
                                                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${selectedPreset === preset.label && !useCustomDate
                                                    ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/25'
                                                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-white border border-white/5'
                                                    }`}
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={handleCalculate}
                                    disabled={loading || !ticker}
                                    className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold text-sm hover:from-violet-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Calculating...
                                        </>
                                    ) : (
                                        <>
                                            <Calculator className="w-4 h-4" />
                                            Calculate Returns
                                        </>
                                    )}
                                </button>
                            </div>

                            {error && (
                                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4">
                                    <p className="text-rose-400 text-sm font-medium">{error}</p>
                                </div>
                            )}

                            {result && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-4"
                                >
                                    <div className={`rounded-2xl p-6 border ${isPositive ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                                        <div className="text-center">
                                            <p className="text-slate-400 text-sm mb-1">
                                                If you invested {formatCurrency(amount)} on {new Date(result.buyDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </p>
                                            <div className="flex items-center justify-center gap-3 mb-2">
                                                <span className="text-3xl font-bold text-white">{formatCurrency(result.currentValue)}</span>
                                            </div>
                                            <div className={`flex items-center justify-center gap-2 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                                                <span className="font-bold text-lg">
                                                    {isPositive ? '+' : ''}{formatCurrency(result.gain)} ({isPositive ? '+' : ''}{result.gainPercent.toFixed(2)}%)
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5">
                                            <p className="text-xs text-slate-400 mb-1">Shares</p>
                                            <p className="text-lg font-bold text-white">{result.shares.toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
                                            <p className="text-xs text-slate-500">@ ${result.buyPrice}</p>
                                        </div>
                                        <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5">
                                            <p className="text-xs text-slate-400 mb-1">Current Price</p>
                                            <p className="text-lg font-bold text-white">${result.currentPrice}</p>
                                        </div>
                                        <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5">
                                            <div className="flex items-center gap-1 mb-1">
                                                <Clock className="w-3 h-3 text-slate-400" />
                                                <p className="text-xs text-slate-400">Holding</p>
                                            </div>
                                            <p className="text-lg font-bold text-white">{result.holdingPeriod}</p>
                                        </div>
                                        <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5">
                                            <div className="flex items-center gap-1 mb-1">
                                                <Percent className="w-3 h-3 text-slate-400" />
                                                <p className="text-xs text-slate-400">CAGR</p>
                                            </div>
                                            <p className={`text-lg font-bold ${result.annualizedReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {result.annualizedReturn >= 0 ? '+' : ''}{result.annualizedReturn.toFixed(2)}%
                                            </p>
                                        </div>
                                    </div>

                                    <p className="text-xs text-slate-500 text-center">
                                        Uses split-adjusted prices. Dividends not included.
                                    </p>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
