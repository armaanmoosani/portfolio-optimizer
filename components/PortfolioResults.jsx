"use client";

import React, { useState } from 'react';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, ScatterChart, Scatter, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Shield, Target, AlertTriangle, BarChart3, Calendar, Download, FileText, Table as TableIcon, PieChart as PieChartIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
                {payload.map((entry, index) => (
                    <p key={index} className="text-xs flex items-center gap-2" style={{ color: entry.color }}>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
                        {entry.name.toLowerCase().includes('return') || entry.name.toLowerCase().includes('drawdown') ? '%' : ''}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function PortfolioResults({ data }) {
    const [activeTab, setActiveTab] = useState('assets');

    if (!data) return null;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700" data-internal-navigation>
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Portfolio Analysis</h2>
                    <p className="text-slate-400 text-sm mt-1">
                        {data.performance[0]?.date} - {data.performance[data.performance.length - 1]?.date}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" title="Export PDF">
                        <FileText className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" title="Export CSV">
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
                                <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/50">
                                    <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">End Balance</div>
                                    <div className="text-xl font-bold text-emerald-400">{formatCurrency(data.metrics.endBalance)}</div>
                                </div>
                                <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/50">
                                    <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">CAGR</div>
                                    <div className="text-xl font-bold text-blue-400">{formatPercent(data.metrics.expectedReturn)}</div>
                                </div>
                                <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/50">
                                    <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Max Drawdown</div>
                                    <div className="text-xl font-bold text-rose-400">{formatPercent(data.metrics.maxDrawdown)}</div>
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
                                                <span className="text-slate-400">Sharpe Ratio</span>
                                                <span className="font-mono text-white">{data.metrics.sharpeRatio.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between py-2 border-b border-slate-800">
                                                <span className="text-slate-400">Sortino Ratio</span>
                                                <span className="font-mono text-white">{data.metrics.sortinoRatio.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between py-2 border-b border-slate-800">
                                                <span className="text-slate-400">Alpha</span>
                                                <span className="font-mono text-white">{formatPercent(data.metrics.alpha)}</span>
                                            </div>
                                            <div className="flex justify-between py-2 border-b border-slate-800">
                                                <span className="text-slate-400">Beta</span>
                                                <span className="font-mono text-white">{data.metrics.beta.toFixed(2)}</span>
                                            </div>
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
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-slate-400 uppercase bg-slate-800/40">
                                            <tr>
                                                <th className="px-6 py-3">Rank</th>
                                                <th className="px-6 py-3">Start Date</th>
                                                <th className="px-6 py-3">End Date</th>
                                                <th className="px-6 py-3">Max Drawdown</th>
                                                <th className="px-6 py-3">Recovery Time</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {data.drawdowns && data.drawdowns.map((dd, index) => (
                                                <tr key={index} className="bg-slate-900/20">
                                                    <td className="px-6 py-4 font-medium text-slate-400">#{index + 1}</td>
                                                    <td className="px-6 py-4 text-slate-300">{dd.start}</td>
                                                    <td className="px-6 py-4 text-slate-300">{dd.end}</td>
                                                    <td className="px-6 py-4 font-bold text-rose-400 font-mono">
                                                        {(dd.depth * 100).toFixed(2)}%
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-300">{dd.recovery_days} days</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
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
                                <div className="rounded-xl border border-slate-700/50 overflow-hidden">
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
                                        <div className="inline-grid gap-1" style={{ gridTemplateColumns: `auto repeat(${data.assets.length}, 1fr)` }}>
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
                                                        const lightness = 15 + (Math.abs(val) * 10); // Darker background
                                                        return (
                                                            <div
                                                                key={j}
                                                                className="w-10 h-10 flex items-center justify-center rounded text-[10px] font-mono transition-all hover:scale-110 cursor-default"
                                                                style={{
                                                                    backgroundColor: `hsla(${hue}, ${saturation}%, ${lightness}%, 0.3)`,
                                                                    color: Math.abs(val) > 0.5 ? '#fff' : '#94a3b8',
                                                                    border: `1px solid hsla(${hue}, ${saturation}%, ${lightness + 20}%, 0.5)`
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
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-slate-400 uppercase bg-slate-800/40">
                                            <tr>
                                                <th className="px-6 py-3">Asset</th>
                                                <th className="px-6 py-3 text-right">Annualized Return</th>
                                                <th className="px-6 py-3 text-right">Volatility</th>
                                                <th className="px-6 py-3 text-right">Max Drawdown</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {data.assets.map((asset, index) => {
                                                const metrics = data.assetMetrics?.[asset] || {};
                                                return (
                                                    <tr key={index} className="bg-slate-900/20">
                                                        <td className="px-6 py-4 font-medium text-white">{asset}</td>
                                                        <td className={`px-6 py-4 text-right font-mono ${metrics.annualized_return >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                            {metrics.annualized_return ? formatPercent(metrics.annualized_return * 100) : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-mono text-slate-300">
                                                            {metrics.annualized_volatility ? formatPercent(metrics.annualized_volatility * 100) : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-mono text-rose-400">
                                                            {metrics.max_drawdown ? formatPercent(metrics.max_drawdown * 100) : '-'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div >
    );
}
