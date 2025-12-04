import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const PerformanceCard = ({ data, ticker }) => {
    if (!data) return null;

    const periods = [
        { key: 'ytd', label: 'YTD Return' },
        { key: '1y', label: '1-Year Return' },
        { key: '3y', label: '3-Year Return' },
        { key: '5y', label: '5-Year Return' }
    ];

    const formatValue = (val) => {
        if (val === null || val === undefined) return 'N/A';
        return `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;
    };

    const getColor = (val) => {
        if (val === null || val === undefined) return 'text-slate-500';
        return val >= 0 ? 'text-emerald-400' : 'text-rose-400';
    };

    return (
        <div className="w-full bg-slate-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <div className="mb-4">
                <h2 className="text-xl font-semibold text-white">Performance Overview: {ticker}</h2>
                <p className="text-sm text-slate-400 mt-1">
                    Trailing total returns as of {new Date().toLocaleDateString()}, which may include dividends or other distributions. Benchmark is <span className="text-blue-400">S&P 500 (^GSPC)</span>.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {periods.map((period) => {
                    const metric = data[period.key];
                    if (!metric) return null;

                    return (
                        <div key={period.key} className="bg-slate-950/50 rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors">
                            <h3 className="text-sm font-semibold text-slate-200 mb-3">{period.label}</h3>

                            <div className="flex justify-between items-end mb-2">
                                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">{ticker}</span>
                                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">S&P 500 (^GSPC)</span>
                            </div>

                            <div className="flex justify-between items-center">
                                <div className={`text-lg font-bold ${getColor(metric.ticker)}`}>
                                    {formatValue(metric.ticker)}
                                </div>
                                <div className={`text-lg font-bold ${getColor(metric.benchmark)}`}>
                                    {formatValue(metric.benchmark)}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PerformanceCard;
