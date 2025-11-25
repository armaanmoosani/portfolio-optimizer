"use client";

import React, { useState } from 'react';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, ScatterChart, Scatter, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Shield, Target, AlertTriangle, BarChart3, Calendar, Download, FileText, Table as TableIcon, PieChart as PieChartIcon, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import SortableTable from './SortableTable';
import LoadingSkeleton from './LoadingSkeleton';
import { motion, AnimatePresence } from 'framer-motion';
import EfficientFrontier from './EfficientFrontier';
import MetricTooltip from './MetricTooltip';

// Helper to format currency
const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(value);
};

// Helper to format percent
const formatPercent = (value) => {
    return `${(value).toFixed(2)}%`;
};

const TabButton = ({ active, onClick, icon: Icon, label }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${active
            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
    >
        <Icon className="w-4 h-4" />
        {label}
    </button>
);

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl z-50">
                <p className="text-slate-300 text-sm mb-1 font-medium">{label}</p>
                {payload.map((entry, index) => {
                    if (!entry || typeof entry.value === 'undefined') return null;
                    return (
                        <p key={index} className="text-xs flex items-center gap-2" style={{ color: entry.color }}>
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            {entry.name || 'Value'}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
                            {entry.name && (entry.name.toLowerCase().includes('return') || entry.name.toLowerCase().includes('drawdown')) ? '%' : ''}
                        </p>
                    );
                })}
            </div>
        );
    }
    return null;
};

// Sparkline Component
const Sparkline = ({ data, dataKey, color }) => (
    <div className="h-10 w-24">
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
                <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
        </ResponsiveContainer>
    </div>
);

export default function PortfolioResults({ data }) {
    const [activeTab, setActiveTab] = useState('assets');
    const [showAdvanced, setShowAdvanced] = useState(true);
    const [showBenchmark, setShowBenchmark] = useState(true);
    const [showRebalancing, setShowRebalancing] = useState(true);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    // Export CSV handler
    const exportCSV = () => {
        const headers = Object.keys(data.metrics);
        const rows = [headers.join(','), headers.map(k => data.metrics[k]).join(',')];
        const csv = rows.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'portfolio_metrics.csv');
        link.click();
    };

    // Keyboard shortcut for Optimize (Ctrl+Enter)
    React.useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                const btn = document.getElementById('optimize-button');
                if (btn) btn.click();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    if (!data) return null;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700" data-internal-navigation>
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Portfolio Analysis</h2>
                    {data.performance && data.performance.length > 0 && (
                        <p className="text-slate-400 text-sm mt-1">
                            {data.performance[0]?.date} - {data.performance[data.performance.length - 1]?.date}
                        </p>
                    )}
                </div>
                <div className="flex gap-2">
                    <button className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" title="Export PDF">
                        <FileText className="w-4 h-4" />
                    </button>
                    <button onClick={exportCSV} className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" title="Export CSV">
                        <TableIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 p-1 bg-slate-900/50 rounded-xl border border-slate-800 backdrop-blur-sm">
                <TabButton active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} icon={Activity} label="Summary" />
                <TabButton active={activeTab === 'charts'} onClick={() => setActiveTab('charts')} icon={BarChart3} label="Charts" />
                <TabButton active={activeTab === 'metrics'} onClick={() => setActiveTab('metrics')} icon={TableIcon} label="Metrics" />
                <TabButton active={activeTab === 'assets'} onClick={() => setActiveTab('assets')} icon={PieChartIcon} label="Assets" />
            </div>

            {/* Content Area */}
            <div className="min-h-[500px]">
                <AnimatePresence mode="wait">
                    {activeTab === 'summary' && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            {/* Key Metrics Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/50">
                                    <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Start Balance</div>
                                    <div className="text-xl font-bold text-white">{formatCurrency(data.metrics.startBalance)}</div>
                                </div>
                                <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex justify-between items-end">
                                    <div>
                                        <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">End Balance</div>
                                        <div className="text-xl font-bold text-emerald-400">{formatCurrency(data.metrics.endBalance)}</div>
                                    </div>
                                    <Sparkline data={data.performance} dataKey="value" color="#34d399" />
                                </div>
                                <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/50">
                                    <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">CAGR</div>
                                    <div className="text-xl font-bold text-blue-400">{formatPercent(data.metrics.expectedReturn)}</div>
                                </div>
                                <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex justify-between items-end">
                                    <div>
                                        <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Max Drawdown</div>
                                        <div className="text-xl font-bold text-rose-400">{formatPercent(data.metrics.maxDrawdown)}</div>
                                    </div>
                                    <Sparkline data={data.drawdown} dataKey="drawdown" color="#f43f5e" />
                                </div>
                            </div>

                            {/* Performance Summary Table */}
                            <div className="rounded-xl border border-slate-700/50 overflow-hidden">
                                <div className="bg-slate-800/60 px-6 py-4 border-b border-slate-700/50">
                                    <h3 className="font-semibold text-white">Performance Summary</h3>
                                </div>
                                <div className="bg-slate-900/40 p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                                        <div className="space-y-3">
                                            <div className="flex justify-between py-2 border-b border-slate-800">
                                                <span className="text-slate-400">Annualized Return (CAGR)</span>
                                                <span className="font-mono text-white">{formatPercent(data.metrics.expectedReturn)}</span>
                                            </div>
                                            <div className="flex justify-between py-2 border-b border-slate-800">
                                                <span className="text-slate-400">Standard Deviation</span>
                                                <span className="font-mono text-white">{formatPercent(data.metrics.volatility)}</span>
                                            </div>
                                            <div className="flex justify-between py-2 border-b border-slate-800">
                                                <span className="text-slate-400">Best Year</span>
                                                <span className="font-mono text-emerald-400">{formatPercent(data.metrics.bestYear)}</span>
                                            </div>
                                            <div className="flex justify-between py-2 border-b border-slate-800">
                                                <span className="text-slate-400">Worst Year</span>
                                                <span className="font-mono text-rose-400">{formatPercent(data.metrics.worstYear)}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex justify-between py-2 border-b border-slate-800">
                                                <span className="text-slate-400 flex items-center">
                                                    Sharpe Ratio
                                                    <MetricTooltip
                                                        title="Sharpe Ratio"
                                                        description="Measures risk-adjusted return by showing how much excess return you receive for the extra volatility endured. Higher is better. >1 is good, >2 is very good, >3 is excellent."
                                                        formula="(Return -Risk-Free Rate) / Standard Deviation"
                                                    />
                                                </span>
                                                <span className="font-mono text-white">{data.metrics.sharpeRatio.toFixed(2)} {data.metrics.sharpeRatio >= 0 ? <ArrowUp className="w-4 h-4 inline text-emerald-400" /> : <ArrowDown className="w-4 h-4 inline text-rose-400" />}</span>
                                            </div>
                                            <div className="flex justify-between py-2 border-b border-slate-800">
                                                <span className="text-slate-400 flex items-center">
                                                    Sortino Ratio
                                                    <MetricTooltip
                                                        title="Sortino Ratio"
                                                        description="Similar to Sharpe but only penalizes downside volatility. Preferred by investors who care more about losses than upside volatility. Higher is better."
                                                        formula="(Return - MAR) / Downside Deviation"
                                                    />
                                                </span>
                                                <span className="font-mono text-white">{data.metrics.sortinoRatio.toFixed(2)} {data.metrics.sortinoRatio >= 0 ? <ArrowUp className="w-4 h-4 inline text-emerald-400" /> : <ArrowDown className="w-4 h-4 inline text-rose-400" />}</span>
                                            </div>
                                            <div className="flex justify-between py-2 border-b border-slate-800">
                                                <span className="text-slate-400 flex items-center">
                                                    Alpha
                                                    <MetricTooltip
                                                        title="Alpha (Jensen's)"
                                                        description="Excess return above what the CAPM model predicts. Positive alpha indicates outperformance vs. the benchmark after adjusting for risk (beta)."
                                                        formula="Portfolio Return - [Risk-Free + Beta × (Benchmark Return - Risk-Free)]"
                                                    />
                                                </span>
                                                <span className="font-mono text-white">{formatPercent(data.metrics.alpha)} {parseFloat(data.metrics.alpha) >= 0 ? <ArrowUp className="w-4 h-4 inline text-emerald-400" /> : <ArrowDown className="w-4 h-4 inline text-rose-400" />}</span>
                                            </div>
                                            <div className="flex justify-between py-2 border-b border-slate-800">
                                                <span className="text-slate-400 flex items-center">
                                                    Beta
                                                    <MetricTooltip
                                                        title="Beta"
                                                        description="Measures systematic risk relative to the benchmark. Beta of 1 = moves with market, >1 = more volatile, <1 = less volatile."
                                                        formula="Covariance(Portfolio, Benchmark) / Variance(Benchmark)"
                                                    />
                                                </span>
                                                <span className="font-mono text-white">{data.metrics.beta.toFixed(2)} {data.metrics.beta >= 0 ? <ArrowUp className="w-4 h-4 inline text-emerald-400" /> : <ArrowDown className="w-4 h-4 inline text-rose-400" />}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Professional Risk Metrics */}
                                    {data.metrics.calmar_ratio !== undefined && (
                                        <>
                                            <div className="flex items-center justify-between mt-6 mb-2">
                                                <h3 className="font-semibold text-white">Advanced Risk Metrics</h3>
                                                <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-slate-400 hover:text-white">{showAdvanced ? '▾' : '▸'}</button>
                                            </div>
                                            {showAdvanced && (
                                                <div className="rounded-xl border border-slate-700/50 overflow-hidden shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30 transition-shadow duration-300">
                                                    <div className="bg-slate-800/60 px-6 py-4 border-b border-slate-700/50">
                                                        <h3 className="font-semibold text-white">Advanced Risk Metrics</h3>
                                                    </div>
                                                    <div className="bg-slate-900/40 p-6">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                                                            <div className="space-y-3">
                                                                <div className="flex justify-between py-2 border-b border-slate-800">
                                                                    <span className="text-slate-400 flex items-center">
                                                                        Calmar Ratio
                                                                        <MetricTooltip
                                                                            title="Calmar Ratio"
                                                                            description="Return divided by maximum drawdown. Preferred by hedge funds as it shows return per unit of worst loss. Higher is better."
                                                                            formula="Annualized Return / |Max Drawdown|"
                                                                        />
                                                                    </span>
                                                                    <span className="font-mono text-white">{data.metrics.calmar_ratio.toFixed(2)} {data.metrics.calmar_ratio >= 0 ? <ArrowUp className="w-4 h-4 inline text-emerald-400" /> : <ArrowDown className="w-4 h-4 inline text-rose-400" />}</span>
                                                                </div>
                                                                <div className="flex justify-between py-2 border-b border-slate-800">
                                                                    <span className="text-slate-400 flex items-center">
                                                                        VaR (95%, Daily)
                                                                        <MetricTooltip
                                                                            title="Value at Risk (95%)"
                                                                            description="With 95% confidence, daily loss won't exceed this amount. Uses historical simulation method (5th percentile of returns)."
                                                                            formula="5th Percentile of Daily Returns"
                                                                        />
                                                                    </span>
                                                                    <span className="font-mono text-rose-400">{formatPercent(data.metrics.var_95_daily * 100)} {data.metrics.var_95_daily >= 0 ? <ArrowUp className="w-4 h-4 inline text-emerald-400" /> : <ArrowDown className="w-4 h-4 inline text-rose-400" />}</span>
                                                                </div>
                                                                <div className="flex justify-between py-2 border-b border-slate-800">
                                                                    <span className="text-slate-400">VaR (99%, Daily)</span>
                                                                    <span className="font-mono text-rose-500">{formatPercent(data.metrics.var_99_daily * 100)} {data.metrics.var_99_daily >= 0 ? <ArrowUp className="w-4 h-4 inline text-emerald-400" /> : <ArrowDown className="w-4 h-4 inline text-rose-400" />}</span>
                                                                </div>
                                                                <div className="flex justify-between py-2 border-b border-slate-800">
                                                                    <span className="text-slate-400 flex items-center">
                                                                        CVaR (95%, Daily)
                                                                        <MetricTooltip
                                                                            title="Conditional Value at Risk"
                                                                            description="Expected loss when losses exceed VaR. Also called Expected Shortfall. Used in Basel III banking regulations for tail risk."
                                                                            formula="Mean of returns below VaR threshold"
                                                                        />
                                                                    </span>
                                                                    <span className="font-mono text-rose-400">{formatPercent(data.metrics.cvar_95_daily * 100)} {data.metrics.cvar_95_daily >= 0 ? <ArrowUp className="w-4 h-4 inline text-emerald-400" /> : <ArrowDown className="w-4 h-4 inline text-rose-400" />}</span>
                                                                </div>
                                                                <div className="flex justify-between py-2 border-b border-slate-800">
                                                                    <span className="text-slate-400">CVaR (99%, Daily)</span>
                                                                    <span className="font-mono text-rose-500">{formatPercent(data.metrics.cvar_99_daily * 100)} {data.metrics.cvar_99_daily >= 0 ? <ArrowUp className="w-4 h-4 inline text-emerald-400" /> : <ArrowDown className="w-4 h-4 inline text-rose-400" />}</span>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-3">
                                                                <div className="flex justify-between py-2 border-b border-slate-800">
                                                                    <span className="text-slate-400 flex items-center">
                                                                        Skewness
                                                                        <MetricTooltip
                                                                            title="Skewness"
                                                                            description="Measures asymmetry of returns. Negative = left tail (crash risk), Positive = right tail (large gains more likely). Normal distribution = 0."
                                                                            formula="Sample Skewness = E[(X - μ)³] / σ³"
                                                                        />
                                                                    </span>
                                                                    <span className={`font-mono ${data.metrics.skewness < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                                        {data.metrics.skewness.toFixed(3)} {data.metrics.skewness >= 0 ? <ArrowUp className="w-4 h-4 inline text-emerald-400" /> : <ArrowDown className="w-4 h-4 inline text-rose-400" />}
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between py-2 border-b border-slate-800">
                                                                    <span className="text-slate-400 flex items-center">
                                                                        Kurtosis
                                                                        <MetricTooltip
                                                                            title="Kurtosis"
                                                                            description="Measures tail heaviness. >3 = fat tails (higher crash risk), =3 = normal distribution, <3 = thin tails. High kurtosis indicates extreme events are more likely."
                                                                            formula="Sample Kurtosis = E[(X - μ)⁴] / σ⁴"
                                                                        />
                                                                    </span>
                                                                    <span className={`font-mono ${data.metrics.kurtosis > 3 ? 'text-amber-400' : 'text-slate-300'}`}>
                                                                        {data.metrics.kurtosis.toFixed(3)} {data.metrics.kurtosis >= 3 ? <ArrowUp className="w-4 h-4 inline text-emerald-400" /> : <ArrowDown className="w-4 h-4 inline text-rose-400" />}
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between py-2 border-b border-slate-800">
                                                                    <span className="text-slate-400">VaR (95%, Annual)</span>
                                                                    <span className="font-mono text-rose-400">{formatPercent(data.metrics.var_95_annual * 100)}</span>
                                                                </div>
                                                                <div className="flex justify-between py-2 border-b border-slate-800">
                                                                    <span className="text-slate-400">VaR (99%, Annual)</span>
                                                                    <span className="font-mono text-rose-500">{formatPercent(data.metrics.var_99_annual * 100)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Benchmark Comparison */}
                                    {data.metrics.tracking_error !== undefined && data.metrics.tracking_error > 0 && (
                                        <>
                                            <div className="flex items-center justify-between mt-6 mb-2">
                                                <h3 className="font-semibold text-white">Benchmark Comparison</h3>
                                                <button onClick={() => setShowBenchmark(!showBenchmark)} className="text-slate-400 hover:text-white">{showBenchmark ? '▾' : '▸'}</button>
                                            </div>
                                            {showBenchmark && (
                                                <div className="rounded-xl border border-slate-700/50 overflow-hidden shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30 transition-shadow duration-300">
                                                    <div className="bg-slate-800/60 px-6 py-4 border-b border-slate-700/50">
                                                        <h3 className="font-semibold text-white">Benchmark Comparison</h3>
                                                    </div>
                                                    <div className="bg-slate-900/40 p-6">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                                                            <div className="space-y-3">
                                                                <div className="flex justify-between py-2 border-b border-slate-800">
                                                                    <span className="text-slate-400">Tracking Error</span>
                                                                    <span className="font-mono text-white">{formatPercent(data.metrics.tracking_error)}</span>
                                                                </div>
                                                                <div className="flex justify-between py-2 border-b border-slate-800">
                                                                    <span className="text-slate-400">Information Ratio</span>
                                                                    <span className={`font-mono ${data.metrics.information_ratio > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                        {data.metrics.information_ratio.toFixed(2)}
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between py-2 border-b border-slate-800">
                                                                    <span className="text-slate-400">Up Capture</span>
                                                                    <span className={`font-mono ${data.metrics.up_capture > 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                                        {data.metrics.up_capture.toFixed(1)}%
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-3">
                                                                <div className="flex justify-between py-2 border-b border-slate-800">
                                                                    <span className="text-slate-400">R-Squared</span>
                                                                    <span className="font-mono text-white">{(data.metrics.r_squared * 100).toFixed(1)}%</span>
                                                                </div>
                                                                <div className="flex justify-between py-2 border-b border-slate-800">
                                                                    <span className="text-slate-400">Benchmark Correlation</span>
                                                                    <span className="font-mono text-white">{data.metrics.benchmark_correlation.toFixed(3)}</span>
                                                                </div>
                                                                <div className="flex justify-between py-2 border-b border-slate-800">
                                                                    <span className="text-slate-400">Down Capture</span>
                                                                    <span className={`font-mono ${data.metrics.down_capture < 100 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                        {data.metrics.down_capture.toFixed(1)}%
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Rebalancing Analysis */}
                                    {data.rebalancing && (
                                        <>
                                            <div className="flex items-center justify-between mt-6 mb-2">
                                                <h3 className="font-semibold text-white">Rebalancing Analysis</h3>
                                                <button onClick={() => setShowRebalancing(!showRebalancing)} className="text-slate-400 hover:text-white">{showRebalancing ? '▾' : '▸'}</button>
                                            </div>
                                            {showRebalancing && (
                                                <div className="rounded-xl border border-slate-700/50 overflow-hidden shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30 transition-shadow duration-300">
                                                    <div className="bg-slate-800/60 px-6 py-4 border-b border-slate-700/50">
                                                        <h3 className="font-semibold text-white">Rebalancing Analysis</h3>
                                                        <p className="text-xs text-slate-400 mt-1">
                                                            {data.rebalancing.frequency === 'monthly' && 'Monthly'}
                                                            {data.rebalancing.frequency === 'quarterly' && 'Quarterly'}
                                                            {data.rebalancing.frequency === 'annual' && 'Annual'}
                                                            {' '}Rebalancing vs. Buy-and-Hold
                                                        </p>
                                                    </div>
                                                    <div className="bg-slate-900/40 p-6">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                            <div className="space-y-3">
                                                                <div className="p-4 rounded-lg bg-slate-800/40">
                                                                    <p className="text-xs text-slate-400 mb-1">Buy & Hold Final Value</p>
                                                                    <p className="text-2xl font-bold text-white">
                                                                        {formatCurrency(data.rebalancing.buy_and_hold_final)}
                                                                    </p>
                                                                </div>
                                                                <div className="p-4 rounded-lg bg-slate-800/40">
                                                                    <p className="text-xs text-slate-400 mb-1">Rebalanced Final Value</p>
                                                                    <p className="text-2xl font-bold text-emerald-400">
                                                                        {formatCurrency(data.rebalancing.rebalanced_final)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-3">
                                                                <div className="flex justify-between py-2 border-b border-slate-800">
                                                                    <span className="text-slate-400">Difference</span>
                                                                    <span className={`font-mono font-semibold ${data.rebalancing.difference > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                        {data.rebalancing.difference > 0 ? '+' : ''}{formatCurrency(data.rebalancing.difference)}
                                                                        {' '}({data.rebalancing.difference_pct > 0 ? '+' : ''}{data.rebalancing.difference_pct.toFixed(2)}%)
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between py-2 border-b border-slate-800">
                                                                    <span className="text-slate-400">Transaction Costs</span>
                                                                    <span className="font-mono text-rose-400">
                                                                        {formatCurrency(data.rebalancing.transaction_costs)}
                                                                        {' '}({data.rebalancing.transaction_cost_pct.toFixed(2)}%)
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between py-2 border-b border-slate-800">
                                                                    <span className="text-slate-400">Number of Rebalances</span>
                                                                    <span className="font-mono text-white">{data.rebalancing.num_rebalances}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Comprehensive Professional Metrics */}
                                    <div className="rounded-xl border border-slate-700/50 overflow-hidden">
                                        <div className="bg-slate-800/60 px-6 py-4 border-b border-slate-700/50">
                                            <h3 className="font-semibold text-white">Comprehensive Statistics</h3>
                                        </div>
                                        <div className="p-6">
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between py-2 border-b border-slate-800">
                                                    <span className="text-slate-400">Arithmetic Mean (Monthly)</span>
                                                    <span className="font-mono text-white">{formatPercent(data.metrics.arithmetic_mean_monthly * 100)}</span>
                                                </div>
                                                <div className="flex justify-between py-2 border-b border-slate-800">
                                                    <span className="text-slate-400">Arithmetic Mean (Annualized)</span>
                                                    <span className="font-mono text-white">{formatPercent(data.metrics.arithmetic_mean_annualized)}</span>
                                                </div>
                                                <div className="flex justify-between py-2 border-b border-slate-800">
                                                    <span className="text-slate-400">Geometric Mean (Monthly)</span>
                                                    <span className="font-mono text-white">{formatPercent(data.metrics.geometric_mean_monthly * 100)}</span>
                                                </div>
                                                <div className="flex justify-between py-2 border-b border-slate-800">
                                                    <span className="text-slate-400">Geometric Mean (Annualized)</span>
                                                    <span className="font-mono text-white">{formatPercent(data.metrics.geometric_mean_annualized)}</span>
                                                </div>
                                                <div className="flex justify-between py-2 border-b border-slate-800">
                                                    <span className="text-slate-400">Std Deviation (Monthly)</span>
                                                    <span className="font-mono text-white">{formatPercent(data.metrics.std_dev_monthly * 100)}</span>
                                                </div>
                                                <div className="flex justify-between py-2 border-b border-slate-800">
                                                    <span className="text-slate-400">Std Deviation (Annualized)</span>
                                                    <span className="font-mono text-white">{formatPercent(data.metrics.std_dev_annualized)}</span>
                                                </div>
                                                <div className="flex justify-between py-2 border-b border-slate-800">
                                                    <span className="text-slate-400">Downside Deviation (Monthly)</span>
                                                    <span className="font-mono text-white">{formatPercent(data.metrics.downside_dev_monthly * 100)}</span>
                                                </div>
                                                <div className="flex justify-between py-2 border-b border-slate-800">
                                                    <span className="text-slate-400">Benchmark Correlation</span>
                                                    <span className="font-mono text-white">{data.metrics.benchmark_correlation.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between py-2">
                                                    <span className="text-slate-400">Treynor Ratio</span>
                                                    <span className="font-mono text-white">{data.metrics.treynor_ratio.toFixed(3)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Trailing Returns */}
                                    <div className="rounded-xl border border-slate-700/50 overflow-hidden">
                                        <div className="bg-slate-800/60 px-6 py-4 border-b border-slate-700/50">
                                            <h3 className="font-semibold text-white">Trailing Returns</h3>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs text-slate-400 uppercase bg-slate-800/40">
                                                    <tr>
                                                        <th className="px-6 py-3">Metric</th>
                                                        <th className="px-6 py-3 text-right">3 Month</th>
                                                        <th className="px-6 py-3 text-right">YTD</th>
                                                        <th className="px-6 py-3 text-right">1 Year</th>
                                                        <th className="px-6 py-3 text-right">3 Year</th>
                                                        <th className="px-6 py-3 text-right">5 Year</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-800">
                                                    <tr className="bg-slate-900/20">
                                                        <td className="px-6 py-4 font-medium text-white">Portfolio Return</td>
                                                        <td className={`px-6 py-4 text-right font-mono ${data.trailingReturns["3M"] !== null && data.trailingReturns["3M"] >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                            {data.trailingReturns["3M"] !== null ? formatPercent(data.trailingReturns["3M"] * 100) : '-'}
                                                        </td>
                                                        <td className={`px-6 py-4 text-right font-mono ${data.trailingReturns["YTD"] >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                            {formatPercent(data.trailingReturns["YTD"] * 100)}
                                                        </td>
                                                        <td className={`px-6 py-4 text-right font-mono ${data.trailingReturns["1Y"] !== null && data.trailingReturns["1Y"] >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                            {data.trailingReturns["1Y"] !== null ? formatPercent(data.trailingReturns["1Y"] * 100) : '-'}
                                                        </td>
                                                        <td className={`px-6 py-4 text-right font-mono ${data.trailingReturns["3Y"] !== null && data.trailingReturns["3Y"] >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                            {data.trailingReturns["3Y"] !== null ? formatPercent(data.trailingReturns["3Y"] * 100) : '-'}
                                                        </td>
                                                        <td className={`px-6 py-4 text-right font-mono ${data.trailingReturns["5Y"] !== null && data.trailingReturns["5Y"] >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                            {data.trailingReturns["5Y"] !== null ? formatPercent(data.trailingReturns["5Y"] * 100) : '-'}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'charts' && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            {/* Efficient Frontier */}
                            {data.efficientFrontier && (
                                <EfficientFrontier data={data.efficientFrontier} />
                            )}

                            {/* Growth Chart */}
                            <div className="p-6 rounded-xl bg-slate-800/40 border border-slate-700/50">
                                <h3 className="text-lg font-bold text-white mb-6">Portfolio Growth</h3>
                                <div className="h-[400px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={data.performance}>
                                            <defs>
                                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                            <XAxis
                                                dataKey="date"
                                                stroke="#94a3b8"
                                                tick={{ fill: '#94a3b8', fontSize: 12 }}
                                                minTickGap={50}
                                            />
                                            <YAxis
                                                stroke="#94a3b8"
                                                tick={{ fill: '#94a3b8', fontSize: 12 }}
                                                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                                            />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Area
                                                type="monotone"
                                                dataKey="value"
                                                name="Portfolio Value"
                                                stroke="#3b82f6"
                                                fillOpacity={1}
                                                fill="url(#colorValue)"
                                                strokeWidth={2}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Drawdown Chart */}
                            <div className="p-6 rounded-xl bg-slate-800/40 border border-slate-700/50">
                                <h3 className="text-lg font-bold text-white mb-6">Drawdown</h3>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={data.drawdown}>
                                            <defs>
                                                <linearGradient id="colorDD" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                            <XAxis
                                                dataKey="date"
                                                stroke="#94a3b8"
                                                tick={{ fill: '#94a3b8', fontSize: 12 }}
                                                minTickGap={50}
                                            />
                                            <YAxis
                                                stroke="#94a3b8"
                                                tick={{ fill: '#94a3b8', fontSize: 12 }}
                                                tickFormatter={(value) => `${value.toFixed(0)}%`}
                                            />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Area
                                                type="monotone"
                                                dataKey="drawdown"
                                                name="Drawdown"
                                                stroke="#ef4444"
                                                fillOpacity={1}
                                                fill="url(#colorDD)"
                                                strokeWidth={2}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'metrics' && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            {/* Monthly Returns Heatmap */}
                            <div className="rounded-xl border border-slate-700/50 overflow-hidden">
                                <div className="bg-slate-800/60 px-6 py-4 border-b border-slate-700/50">
                                    <h3 className="font-semibold text-white">Monthly Returns</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-center">
                                        <thead className="text-xs text-slate-400 uppercase bg-slate-800/40">
                                            <tr>
                                                <th className="px-4 py-3 text-left">Year</th>
                                                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
                                                    <th key={m} className="px-2 py-3">{m}</th>
                                                ))}
                                                <th className="px-4 py-3 font-bold text-white">Year</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {Object.keys(data.monthlyReturns || {}).sort((a, b) => b - a).map(year => {
                                                const yearReturns = data.monthlyReturns[year];
                                                const annualReturn = Object.values(yearReturns).reduce((acc, val) => (1 + acc) * (1 + val) - 1, 0);

                                                // Calculate max absolute value for heatmap scaling (across all years)
                                                const allValues = Object.values(data.monthlyReturns).flatMap(y => Object.values(y));
                                                const maxAbsVal = Math.max(...allValues.map(Math.abs)) || 0.1; // Default to 0.1 to avoid div by zero

                                                return (
                                                    <tr key={year} className="bg-slate-900/20 hover:bg-slate-800/30 transition-colors">
                                                        <td className="px-4 py-3 text-left font-medium text-slate-300">{year}</td>
                                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                                                            const val = yearReturns[month];
                                                            if (val === undefined) return <td key={month} className="px-2 py-3 text-slate-600">-</td>;

                                                            const opacity = Math.min(Math.abs(val) / maxAbsVal, 1) * 0.4; // Max opacity 0.4
                                                            const colorClass = val >= 0 ? 'text-emerald-400' : 'text-rose-400';
                                                            const bgStyle = {
                                                                backgroundColor: val >= 0
                                                                    ? `rgba(16, 185, 129, ${opacity})`
                                                                    : `rgba(244, 63, 94, ${opacity})`
                                                            };

                                                            return (
                                                                <td key={month} className={`px-2 py-3 font-mono text-xs ${colorClass}`} style={bgStyle}>
                                                                    {val >= 0 ? '+' : ''}{(val * 100).toFixed(1)}%
                                                                </td>
                                                            );
                                                        })}
                                                        <td className={`px-4 py-3 font-bold font-mono ${annualReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                            {annualReturn >= 0 ? '+' : ''}{(annualReturn * 100).toFixed(1)}%
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Drawdowns Table */}
                            <div className="rounded-xl border border-slate-700/50 overflow-hidden">
                                <div className="bg-slate-800/60 px-6 py-4 border-b border-slate-700/50">
                                    <h3 className="font-semibold text-white">Worst Drawdowns</h3>
                                </div>
                                <SortableTable
                                    columns={[
                                        { key: 'rank', label: 'Rank' },
                                        { key: 'start', label: 'Start Date' },
                                        { key: 'end', label: 'End Date' },
                                        {
                                            key: 'depth',
                                            label: 'Max Drawdown',
                                            numeric: true,
                                            render: (val) => <span className="font-bold text-rose-400 font-mono">{(val * 100).toFixed(2)}%</span>
                                        },
                                        {
                                            key: 'recovery_days',
                                            label: 'Recovery Time',
                                            numeric: true,
                                            render: (val) => <span className="text-slate-300">{val} days</span>
                                        }
                                    ]}
                                    data={data.drawdowns.map((dd, i) => ({ ...dd, rank: `#${i + 1}` }))}
                                />
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'assets' && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            {/* Grid for Asset Allocation and Correlation Matrix */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Asset Allocation - Pie Chart */}
                                <div className="rounded-xl border border-slate-700/50 overflow-hidden shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30 transition-shadow duration-300">
                                    <div className="bg-slate-800/60 px-6 py-4 border-b border-slate-700/50">
                                        <h3 className="font-semibold text-white">Asset Allocation</h3>
                                    </div>
                                    <div className="p-6">
                                        {/* Pie Chart */}
                                        <div className="h-[300px] flex items-center justify-center mb-4">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <defs>
                                                        {data.weights.map((item, index) => (
                                                            <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="0%" stopColor={item.color} stopOpacity={1} />
                                                                <stop offset="100%" stopColor={item.color} stopOpacity={0.7} />
                                                            </linearGradient>
                                                        ))}
                                                    </defs>
                                                    <Pie
                                                        data={data.weights}
                                                        cx="50%"
                                                        cy="50%"
                                                        labelLine={{
                                                            stroke: '#64748b',
                                                            strokeWidth: 1
                                                        }}
                                                        label={({ asset, weight }) => `${asset} (${weight.toFixed(1)}%)`}
                                                        outerRadius={100}
                                                        innerRadius={50}
                                                        paddingAngle={2}
                                                        dataKey="weight"
                                                        animationBegin={0}
                                                        animationDuration={800}
                                                    >
                                                        {data.weights.map((entry, index) => (
                                                            <Cell
                                                                key={`cell-${index}`}
                                                                fill={`url(#gradient-${index})`}
                                                                stroke="#1e293b"
                                                                strokeWidth={2}
                                                                className="transition-all hover:opacity-80 cursor-pointer"
                                                            />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        content={({ active, payload }) => {
                                                            if (active && payload && payload.length) {
                                                                const data = payload[0].payload;
                                                                return (
                                                                    <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
                                                                            <p className="text-white font-semibold">{data.asset}</p>
                                                                        </div>
                                                                        <p className="text-blue-400 font-mono text-lg">{data.weight.toFixed(2)}%</p>
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>

                                        {/* Legend/List */}
                                        <div className="space-y-2">
                                            {data.weights.map((item, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/30 hover:bg-slate-800/50 transition-all group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-4 h-4 rounded-full ring-2 ring-slate-700 group-hover:ring-slate-500 transition-all"
                                                            style={{ backgroundColor: item.color }}
                                                        />
                                                        <span className="font-medium text-white">{item.asset}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full transition-all duration-500"
                                                                style={{
                                                                    width: `${item.weight}%`,
                                                                    backgroundColor: item.color
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="font-mono font-bold text-blue-400 w-16 text-right">
                                                            {item.weight.toFixed(2)}%
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Correlation Matrix */}
                                <div className="rounded-xl border border-slate-700/50 overflow-hidden">
                                    <div className="bg-slate-800/60 px-6 py-4 border-b border-slate-700/50">
                                        <h3 className="font-semibold text-white">Correlation Matrix</h3>
                                    </div>
                                    <div className="p-6 overflow-x-auto">
                                        <div className="inline-grid gap-2" style={{ gridTemplateColumns: `auto repeat(${data.assets.length}, 1fr)` }}>
                                            <div></div>
                                            {data.assets.map((asset, i) => (
                                                <div key={i} className="p-2 text-center text-xs font-bold text-slate-400">{asset}</div>
                                            ))}
                                            {data.assets.map((rowAsset, i) => (
                                                <React.Fragment key={i}>
                                                    <div className="p-2 text-xs font-bold text-slate-400 flex items-center">{rowAsset}</div>
                                                    {data.assets.map((colAsset, j) => {
                                                        const val = data.correlations?.[rowAsset]?.[colAsset] || 0;
                                                        const hue = val >= 0 ? 142 : 0;
                                                        const saturation = Math.abs(val) * 100;
                                                        const lightness = 15 + (Math.abs(val) * 10);
                                                        return (
                                                            <div
                                                                key={j}
                                                                className="w-16 h-16 flex items-center justify-center rounded text-xs font-mono font-semibold transition-all hover:scale-110 cursor-default"
                                                                style={{
                                                                    backgroundColor: `hsla(${hue}, ${saturation}%, ${lightness}%, 0.4)`,
                                                                    color: Math.abs(val) > 0.5 ? '#fff' : '#94a3b8',
                                                                    border: `1px solid hsla(${hue}, ${saturation}%, ${lightness + 20}%, 0.6)`
                                                                }}
                                                                title={`${rowAsset} vs ${colAsset}: ${val.toFixed(2)}`}
                                                            >
                                                                {val.toFixed(2)}
                                                            </div>
                                                        );
                                                    })}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Individual Asset Metrics */}
                            <div className="rounded-xl border border-slate-700/50 overflow-hidden">
                                <div className="bg-slate-800/60 px-6 py-4 border-b border-slate-700/50">
                                    <h3 className="font-semibold text-white">Asset Statistics</h3>
                                </div>
                                <SortableTable
                                    columns={[
                                        { key: 'asset', label: 'Asset', render: (val) => <span className="font-medium text-white">{val}</span> },
                                        {
                                            key: 'annualized_return',
                                            label: 'Annualized Return',
                                            numeric: true,
                                            render: (val) => <span className={`font-mono ${val >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{val ? formatPercent(val * 100) : '-'}</span>
                                        },
                                        {
                                            key: 'annualized_volatility',
                                            label: 'Volatility',
                                            numeric: true,
                                            render: (val) => <span className="font-mono text-slate-300">{val ? formatPercent(val * 100) : '-'}</span>
                                        },
                                        {
                                            key: 'max_drawdown',
                                            label: 'Max Drawdown',
                                            numeric: true,
                                            render: (val) => <span className="font-mono text-rose-400">{val ? formatPercent(val * 100) : '-'}</span>
                                        }
                                    ]}
                                    data={data.assets.map(asset => ({
                                        asset,
                                        ...data.assetMetrics?.[asset]
                                    }))}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div >
    );
}
