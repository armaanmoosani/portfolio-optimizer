"use client";

import React, { useMemo } from 'react';
import { Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const AnalystRatings = ({ data, loading }) => {
    if (loading) {
        return (
            <div className="glass-panel rounded-3xl p-8 border border-white/5 animate-pulse min-h-[200px] mt-4">
                <div className="h-6 w-48 bg-slate-800 rounded mb-8"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="h-32 bg-slate-800 rounded-xl"></div>
                    <div className="h-32 bg-slate-800 rounded-xl"></div>
                </div>
            </div>
        );
    }

    if (!data || !data.recommendation || !data.priceTargets) return null;

    const { recommendation, priceTargets } = data;
    const { mean: recMean, consensus } = recommendation;
    const { current, low, high, mean: targetMean, median } = priceTargets;

    // Recommendation Logic (1 = Strong Buy, 5 = Sell)
    const getRecLabel = (val) => {
        if (!val) return 'Unknown';
        if (val <= 1.5) return 'Strong Buy';
        if (val <= 2.5) return 'Buy';
        if (val <= 3.5) return 'Hold';
        if (val <= 4.5) return 'Sell';
        return 'Strong Sell';
    };

    const recLabel = consensus ? consensus.replace('_', ' ').toUpperCase() : getRecLabel(recMean);

    // Determine color based on consensus
    const getRecColor = (label) => {
        const l = label.toLowerCase();
        if (l.includes('buy')) return 'text-emerald-400';
        if (l.includes('sell')) return 'text-rose-400';
        return 'text-amber-400';
    };

    // Calculate upside/downside
    const upside = targetMean && current ? ((targetMean - current) / current) * 100 : 0;
    const isUpside = upside >= 0;

    // Price Target Bar positioning
    const renderPriceTargetBar = () => {
        if (!low || !high || !current) return null;

        // Add 5% padding to range
        const minVal = Math.min(low, current) * 0.90;
        const maxVal = Math.max(high, current) * 1.10;
        const range = maxVal - minVal;

        // Helper
        const getPercent = (val) => Math.max(0, Math.min(100, ((val - minVal) / range) * 100));

        return (
            <div className="relative h-14 w-full mt-6 select-none">
                {/* Track Line */}
                <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-800 rounded-full"></div>

                {/* Range Bar (Low to High) */}
                <div
                    className="absolute top-1/2 h-1 bg-gradient-to-r from-slate-700 to-slate-600 rounded-full"
                    style={{
                        left: `${getPercent(low)}%`,
                        width: `${getPercent(high) - getPercent(low)}%`,
                        transform: 'translateY(-50%)'
                    }}
                ></div>

                {/* Low Checkpoint */}
                <div className="absolute top-1/2 flex flex-col items-center gap-1 group"
                    style={{ left: `${getPercent(low)}%`, transform: 'translateX(-50%) translateY(-50%)' }}>
                    <div className="w-0.5 h-3 bg-slate-500"></div>
                    <span className="text-[10px] text-slate-500 font-mono mt-4 opacity-70 group-hover:opacity-100 transition-opacity">${low.toFixed(0)}</span>
                </div>

                {/* High Checkpoint */}
                <div className="absolute top-1/2 flex flex-col items-center gap-1 group"
                    style={{ left: `${getPercent(high)}%`, transform: 'translateX(-50%) translateY(-50%)' }}>
                    <div className="w-0.5 h-3 bg-slate-500"></div>
                    <span className="text-[10px] text-slate-500 font-mono mt-4 opacity-70 group-hover:opacity-100 transition-opacity">${high.toFixed(0)}</span>
                </div>

                {/* Average Target (Target) */}
                <div className="absolute top-1/2 flex flex-col items-center z-10"
                    style={{ left: `${getPercent(targetMean)}%`, transform: 'translateX(-50%) translateY(-50%)' }}>
                    <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-slate-900 shadow-[0_0_10px_rgba(59,130,246,0.5)] mb-1"></div>
                    <span className="text-xs font-bold text-blue-400 bg-slate-900/90 px-1.5 py-0.5 rounded border border-blue-500/30 -mt-10 mb-4 whitespace-nowrap">
                        Avg ${targetMean.toFixed(2)}
                    </span>
                </div>

                {/* Current Price (Pulse) */}
                <div className="absolute top-1/2 flex flex-col items-center z-20 group"
                    style={{ left: `${getPercent(current)}%`, transform: 'translateX(-50%) translateY(-50%)' }}>
                    <div className="w-4 h-4 rounded-full bg-white border-2 border-slate-900 shadow-[0_0_15px_white] mb-1 animate-pulse"></div>
                    <span className="text-[10px] font-bold text-white absolute top-6 mt-2">Now</span>
                </div>
            </div>
        );
    };

    // Gauge Chart Logic
    // 1 (Strong Buy) -> 5 (Sell). Invert for "Goodness".
    // 1 -> 100%, 3 -> 50%, 5 -> 0%
    const scoreVal = recMean || (consensus === 'buy' ? 2 : consensus === 'sell' ? 4 : 3);
    const scorePercent = Math.max(0, Math.min(100, ((5 - scoreVal) / 4) * 100));

    return (
        <div className="glass-panel rounded-3xl p-6 md:p-8 border border-white/5 mt-4">
            <h3 className="text-lg md:text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-400" />
                Analyst Ratings
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">

                {/* GAUGE SECTION */}
                <div className="flex flex-col items-center justify-center p-6 bg-slate-800/20 rounded-2xl border border-white/5 relative overflow-hidden">
                    <span className="text-sm text-slate-400 font-medium mb-2 uppercase tracking-wider z-10">Consensus</span>
                    <div className={`text-3xl font-black ${getRecColor(recLabel)} mb-2 tracking-tight z-10`}>
                        {recLabel}
                    </div>

                    {/* Meter Bar */}
                    <div className="w-full h-3 bg-slate-700/50 rounded-full mt-4 overflow-hidden relative z-10">
                        {/* Gradient Background: Red -> Yellow -> Green */}
                        <div className="absolute inset-0 opacity-30 bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500"></div>

                        {/* Indicator */}
                        <div
                            className="absolute top-0 bottom-0 w-2 bg-white shadow-[0_0_15px_white] transition-all duration-1000 ease-out rounded-full"
                            style={{ left: `${scorePercent}%`, transform: 'translateX(-50%)' }}
                        ></div>
                    </div>

                    <div className="w-full flex justify-between text-[10px] text-slate-500 font-bold mt-2 font-mono uppercase z-10">
                        <span>Sell</span>
                        <span>Hold</span>
                        <span>Buy</span>
                    </div>

                    {priceTargets && priceTargets.numberOfAnalysts > 0 && (
                        <p className="text-xs text-slate-500 mt-6 z-10">
                            Based on {priceTargets.numberOfAnalysts} analyst ratings
                        </p>
                    )}
                </div>

                {/* PRICE TARGET SECTION */}
                <div className="flex flex-col justify-center">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-sm text-slate-400 font-medium uppercase tracking-wider">Price Target</span>
                        <div className={`flex items-center gap-1 text-sm font-bold ${isUpside ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isUpside ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            {Math.abs(upside).toFixed(1)}% {isUpside ? 'Upside' : 'Downside'}
                        </div>
                    </div>

                    {renderPriceTargetBar()}

                    <div className="grid grid-cols-3 gap-4 mt-8 md:mt-12 text-center">
                        <div className="p-2 rounded bg-slate-800/30 border border-white/5">
                            <p className="text-[10px] text-slate-500 uppercase">Low</p>
                            <p className="text-sm font-bold text-slate-300">${low?.toFixed(2)}</p>
                        </div>
                        <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
                            <p className="text-[10px] text-blue-400 uppercase font-bold">Average</p>
                            <p className="text-lg font-bold text-white">${targetMean?.toFixed(2)}</p>
                        </div>
                        <div className="p-2 rounded bg-slate-800/30 border border-white/5">
                            <p className="text-[10px] text-slate-500 uppercase">High</p>
                            <p className="text-sm font-bold text-slate-300">${high?.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalystRatings;
