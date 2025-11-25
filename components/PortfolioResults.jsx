"use client";

import React, { useState, useEffect } from 'react';
import {
    AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, LineChart, Line
} from 'recharts';
import {
    TrendingUp, TrendingDown, Activity, Target, Calendar, Download, Share2,
    DollarSign, Percent, ArrowUp, ArrowDown, FileText, Table as TableIcon,
    Info, AlertTriangle, CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MetricTooltip from './MetricTooltip';

// Helper functions
const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(value);
};

const formatPercent = (value) => {
    if (value === undefined || value === null) return '-';
    return `${(value).toFixed(2)}%`;
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function PortfolioResults({ data, config = { startYear: '2018', endYear: '2023' } }) {
    const [activeTab, setActiveTab] = useState('performance');

    // Keyboard shortcut for Optimize (Ctrl+Enter) - kept from original
    useEffect(() => {
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

    const handleExportPDF = () => {
        window.print();
    };

    // Prepare allocation data (handle both weights and allocation keys if necessary)
    const allocationData = data.weights || data.allocation || [];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Optimization Results</h2>
                    <p className="text-slate-400 text-lg">
                        Analysis based on historical data
                        {data.performance && data.performance.length > 0 && (
                            <> from <span className="text-white font-mono">{data.performance[0].date}</span> to <span className="text-white font-mono">{data.performance[data.performance.length - 1].date}</span></>
                        )}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleExportPDF}
                        className="px-6 py-3 bg-slate-800/50 hover:bg-slate-800 text-white rounded-xl font-medium transition-all border border-slate-700/50 hover:border-slate-600 flex items-center gap-2 shadow-lg backdrop-blur-sm"
                    >
                        <Download className="w-5 h-5" />
                        Export Report
                    </button>
                    <button className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2">
                        <Share2 className="w-5 h-5" />
                        Share
                    </button>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Start Balance */}
                <div className="p-6 rounded-2xl bg-slate-800/40 border border-white/5 shadow-xl backdrop-blur-sm relative overflow-hidden group hover:bg-slate-800/50 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <DollarSign className="w-24 h-24 text-slate-400" />
                    </div>
                    <div className="relative z-10">
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Start Balance</div>
                        <div className="text-3xl font-bold text-white tracking-tight">{formatCurrency(data.metrics.startBalance)}</div>
                        <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                            <Calendar className="w-4 h-4" />
                            <span>Initial Investment</span>
                        </div>
                    </div>
                </div>

                {/* End Balance */}
                <div className="p-6 rounded-2xl bg-slate-800/40 border border-white/5 shadow-xl backdrop-blur-sm relative overflow-hidden group hover:bg-slate-800/50 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp className="w-24 h-24 text-emerald-400" />
                    </div>
                    <div className="relative z-10">
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">End Balance</div>
                        <div className="text-3xl font-bold text-emerald-400 tracking-tight">{formatCurrency(data.metrics.endBalance)}</div>
                        <div className="mt-4 h-10 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.performance}>
                                    <defs>
                                        <linearGradient id="miniGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey="value" stroke="#34d399" strokeWidth={2} fill="url(#miniGradient)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* CAGR */}
                <div className="p-6 rounded-2xl bg-slate-800/40 border border-white/5 shadow-xl backdrop-blur-sm relative overflow-hidden group hover:bg-slate-800/50 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Percent className="w-24 h-24 text-blue-400" />
                    </div>
                    <div className="relative z-10">
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">CAGR</div>
                        <div className="text-3xl font-bold text-blue-400 tracking-tight">{formatPercent(data.metrics.expectedReturn)}</div>
                        <div className="mt-4 flex items-center gap-2 text-sm text-blue-300/80 bg-blue-500/10 px-3 py-1 rounded-full w-fit">
                            <TrendingUp className="w-4 h-4" />
                            <span>Annual Growth</span>
                        </div>
                    </div>
                </div>

                {/* Max Drawdown */}
                <div className="p-6 rounded-2xl bg-slate-800/40 border border-white/5 shadow-xl backdrop-blur-sm relative overflow-hidden group hover:bg-slate-800/50 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Activity className="w-24 h-24 text-rose-400" />
                    </div>
                    <div className="relative z-10">
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Max Drawdown</div>
                        <div className="text-3xl font-bold text-rose-400 tracking-tight">{formatPercent(data.metrics.maxDrawdown)}</div>
                        <div className="mt-4 h-10 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.drawdown}>
                                    <defs>
                                        <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey="drawdown" stroke="#f43f5e" strokeWidth={2} fill="url(#drawdownGradient)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Tabs */}
            <div className="space-y-6">
                <div className="flex p-1 bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 w-fit">
                    {['performance', 'allocation', 'risk', 'monthly'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === tab
                                ? 'bg-slate-800 text-white shadow-lg shadow-black/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                <div className="min-h-[500px]">
                    <AnimatePresence mode="wait">
                        {activeTab === 'performance' && (
                            <motion.div
                                key="performance"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-6"
                            >
                                {/* Growth Chart */}
                                <div className="p-8 rounded-3xl bg-slate-800/40 border border-white/5 shadow-xl backdrop-blur-sm">
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h3 className="text-xl font-bold text-white mb-1">Portfolio Growth</h3>
                                            <p className="text-slate-400 text-sm">Cumulative performance over time</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                                <span className="text-sm text-slate-300">Portfolio</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="h-[400px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={data.performance} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.5} />
                                                <XAxis
                                                    dataKey="date"
                                                    stroke="#94a3b8"
                                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    dy={10}
                                                    minTickGap={50}
                                                />
                                                <YAxis
                                                    stroke="#94a3b8"
                                                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    dx={-10}
                                                />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                                                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                                                    formatter={(value) => formatCurrency(value)}
                                                    labelStyle={{ color: '#94a3b8', marginBottom: '0.5rem' }}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="value"
                                                    stroke="#10b981"
                                                    strokeWidth={3}
                                                    fillOpacity={1}
                                                    fill="url(#colorValue)"
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Drawdown Chart */}
                                <div className="p-8 rounded-3xl bg-slate-800/40 border border-white/5 shadow-xl backdrop-blur-sm">
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h3 className="text-xl font-bold text-white mb-1">Drawdown Analysis</h3>
                                            <p className="text-slate-400 text-sm">Historical decline from peak</p>
                                        </div>
                                    </div>
                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={data.drawdown} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorDrawdown" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.5} />
                                                <XAxis
                                                    dataKey="date"
                                                    stroke="#94a3b8"
                                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    dy={10}
                                                    minTickGap={50}
                                                />
                                                <YAxis
                                                    stroke="#94a3b8"
                                                    tickFormatter={(value) => `${value.toFixed(0)}%`}
                                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    dx={-10}
                                                />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                                                    itemStyle={{ color: '#f43f5e', fontWeight: 'bold' }}
                                                    formatter={(value) => `${value.toFixed(2)}%`}
                                                    labelStyle={{ color: '#94a3b8', marginBottom: '0.5rem' }}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="drawdown"
                                                    stroke="#f43f5e"
                                                    strokeWidth={2}
                                                    fillOpacity={1}
                                                    fill="url(#colorDrawdown)"
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'allocation' && (
                            <motion.div
                                key="allocation"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3 }}
                                className="grid grid-cols-1 md:grid-cols-2 gap-8"
                            >
                                {/* Allocation Pie Chart */}
                                <div className="p-8 rounded-3xl bg-slate-800/40 border border-white/5 shadow-xl backdrop-blur-sm flex flex-col items-center justify-center min-h-[400px]">
                                    <h3 className="text-xl font-bold text-white mb-8 self-start w-full">Optimal Allocation</h3>
                                    <div className="h-[300px] w-full relative">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={allocationData}
                                                    innerRadius={80}
                                                    outerRadius={120}
                                                    paddingAngle={4}
                                                    dataKey="weight"
                                                    nameKey="asset"
                                                    stroke="none"
                                                    cornerRadius={6}
                                                >
                                                    {allocationData.map((entry, index) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={entry.color || COLORS[index % COLORS.length]}
                                                            className="hover:opacity-80 transition-opacity cursor-pointer"
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', padding: '12px' }}
                                                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                                                    formatter={(value) => `${(value).toFixed(2)}%`}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-4xl font-bold text-white tracking-tighter">100%</span>
                                            <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold mt-1">Total</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Allocation Table */}
                                <div className="p-8 rounded-3xl bg-slate-800/40 border border-white/5 shadow-xl backdrop-blur-sm">
                                    <h3 className="text-xl font-bold text-white mb-6">Asset Breakdown</h3>
                                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                        {allocationData.map((asset, index) => (
                                            <div key={asset.asset || index} className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                                                <div className="flex items-center gap-4">
                                                    <div
                                                        className="w-10 h-10 rounded-lg shadow-lg flex items-center justify-center font-bold text-white"
                                                        style={{ backgroundColor: asset.color || COLORS[index % COLORS.length] }}
                                                    >
                                                        {(asset.asset || '?').charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-white text-lg">{asset.asset}</div>
                                                        <div className="text-xs text-slate-400 font-medium">Weight</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xl font-bold text-white font-mono">{(asset.weight).toFixed(2)}%</div>
                                                    <div className="text-xs text-slate-500">
                                                        {formatCurrency(data.metrics.endBalance * (asset.weight / 100))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'risk' && (
                            <motion.div
                                key="risk"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="grid grid-cols-1 lg:grid-cols-2 gap-8"
                            >
                                {/* Risk Metrics Table */}
                                <div className="p-8 rounded-3xl bg-slate-800/40 border border-white/5 shadow-xl backdrop-blur-sm">
                                    <h3 className="text-xl font-bold text-white mb-6">Risk Analysis</h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between py-3 border-b border-slate-700/50 hover:bg-white/5 px-2 rounded-lg transition-colors">
                                            <span className="text-slate-400 flex items-center gap-2 font-medium">
                                                Sharpe Ratio
                                                <MetricTooltip
                                                    title="Sharpe Ratio"
                                                    description="Measures risk-adjusted return by showing how much excess return you receive for the extra volatility endured. Higher is better. >1 is good, >2 is very good, >3 is excellent."
                                                    formula="(Return - Risk-Free Rate) / Standard Deviation"
                                                />
                                            </span>
                                            <span className="font-mono text-white font-bold text-lg">{data.metrics.sharpeRatio?.toFixed(2)} {data.metrics.sharpeRatio >= 0 ? <ArrowUp className="w-4 h-4 inline text-emerald-400" /> : <ArrowDown className="w-4 h-4 inline text-rose-400" />}</span>
                                        </div>
                                        <div className="flex justify-between py-3 border-b border-slate-700/50 hover:bg-white/5 px-2 rounded-lg transition-colors">
                                            <span className="text-slate-400 flex items-center gap-2 font-medium">
                                                Sortino Ratio
                                                <MetricTooltip
                                                    title="Sortino Ratio"
                                                    description="Similar to Sharpe, but only penalizes downside volatility. Better for strategies with high upside volatility. Higher is better."
                                                    formula="(Return - MAR) / Downside Deviation"
                                                />
                                            </span>
                                            <span className="font-mono text-white font-bold text-lg">{data.metrics.sortinoRatio?.toFixed(2)} {data.metrics.sortinoRatio >= 0 ? <ArrowUp className="w-4 h-4 inline text-emerald-400" /> : <ArrowDown className="w-4 h-4 inline text-rose-400" />}</span>
                                        </div>
                                        <div className="flex justify-between py-3 border-b border-slate-700/50 hover:bg-white/5 px-2 rounded-lg transition-colors">
                                            <span className="text-slate-400 flex items-center gap-2 font-medium">
                                                Beta
                                                <MetricTooltip
                                                    title="Beta"
                                                    description="Measure of volatility relative to the market. 1 = moves with market, >1 = more volatile, <1 = less volatile."
                                                    formula="Covariance(Asset, Market) / Variance(Market)"
                                                />
                                            </span>
                                            <span className="font-mono text-white font-bold text-lg">{data.metrics.beta?.toFixed(2) || "N/A"}</span>
                                        </div>
                                        <div className="flex justify-between py-3 border-b border-slate-700/50 hover:bg-white/5 px-2 rounded-lg transition-colors">
                                            <span className="text-slate-400 flex items-center gap-2 font-medium">
                                                Alpha
                                                <MetricTooltip
                                                    title="Alpha"
                                                    description="Excess return of an investment relative to the return of a benchmark index. Positive alpha indicates outperformance."
                                                    formula="Return - (Risk-Free Rate + Beta * (Market Return - Risk-Free Rate))"
                                                />
                                            </span>
                                            <span className={`font-mono font-bold text-lg ${data.metrics.alpha > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{data.metrics.alpha ? formatPercent(data.metrics.alpha * 100) : "N/A"}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Advanced Risk Metrics */}
                                <div className="p-8 rounded-3xl bg-slate-800/40 border border-white/5 shadow-xl backdrop-blur-sm">
                                    <h3 className="text-xl font-bold text-white mb-6">Advanced Metrics</h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="flex justify-between py-3 border-b border-slate-700/50 hover:bg-white/5 px-2 rounded-lg transition-colors">
                                            <span className="text-slate-400 flex items-center gap-2 font-medium">
                                                Calmar Ratio
                                                <MetricTooltip
                                                    title="Calmar Ratio"
                                                    description="Return divided by maximum drawdown. Preferred by hedge funds as it shows return per unit of worst loss. Higher is better."
                                                    formula="Annualized Return / |Max Drawdown|"
                                                />
                                            </span>
                                            <span className="font-mono text-white font-bold text-lg">{data.metrics.calmar_ratio?.toFixed(2)} {data.metrics.calmar_ratio >= 0 ? <ArrowUp className="w-4 h-4 inline text-emerald-400" /> : <ArrowDown className="w-4 h-4 inline text-rose-400" />}</span>
                                        </div>
                                        <div className="flex justify-between py-3 border-b border-slate-700/50 hover:bg-white/5 px-2 rounded-lg transition-colors">
                                            <span className="text-slate-400 flex items-center gap-2 font-medium">
                                                Value at Risk (95%)
                                                <MetricTooltip
                                                    title="Value at Risk (VaR)"
                                                    description="Maximum potential loss over a specific time frame at a given confidence level (95%)."
                                                    formula="Statistical measure of worst-case loss"
                                                />
                                            </span>
                                            <span className="font-mono text-rose-400 font-bold text-lg">{data.metrics.var_95 ? formatPercent(data.metrics.var_95 * 100) : "N/A"}</span>
                                        </div>
                                        <div className="flex justify-between py-3 border-b border-slate-700/50 hover:bg-white/5 px-2 rounded-lg transition-colors">
                                            <span className="text-slate-400 flex items-center gap-2 font-medium">
                                                Conditional VaR (95%)
                                                <MetricTooltip
                                                    title="Conditional VaR (CVaR)"
                                                    description="Expected loss if the VaR threshold is breached. Also known as Expected Shortfall. More conservative than VaR."
                                                    formula="Average of losses exceeding VaR"
                                                />
                                            </span>
                                            <span className="font-mono text-rose-400 font-bold text-lg">{data.metrics.cvar_95 ? formatPercent(data.metrics.cvar_95 * 100) : "N/A"}</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'monthly' && (
                            <motion.div
                                key="monthly"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3 }}
                                className="p-8 rounded-3xl bg-slate-800/40 border border-white/5 shadow-xl backdrop-blur-sm overflow-x-auto"
                            >
                                <h3 className="text-xl font-bold text-white mb-6">Monthly Returns Heatmap</h3>
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr>
                                            <th className="p-3 text-left font-bold text-slate-400">Year</th>
                                            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
                                                <th key={m} className="p-3 text-center font-bold text-slate-400">{m}</th>
                                            ))}
                                            <th className="p-3 text-right font-bold text-white">Yearly</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(data.monthlyReturns || {}).sort((a, b) => b[0] - a[0]).map(([year, months]) => {
                                            const yearlyTotal = Object.values(months).reduce((a, b) => (1 + a) * (1 + b) - 1, 0);
                                            return (
                                                <tr key={year} className="border-b border-slate-700/30 hover:bg-white/5 transition-colors">
                                                    <td className="p-3 font-bold text-slate-300">{year}</td>
                                                    {Array.from({ length: 12 }).map((_, i) => {
                                                        const val = months[i + 1];
                                                        return (
                                                            <td key={i} className="p-2 text-center">
                                                                {val !== undefined ? (
                                                                    <div className={`w-full h-full py-2 rounded-lg font-mono text-xs font-medium ${val > 0 ? 'bg-emerald-500/20 text-emerald-400' : val < 0 ? 'bg-rose-500/20 text-rose-400' : 'text-slate-500'}`}>
                                                                        {(val * 100).toFixed(1)}%
                                                                    </div>
                                                                ) : <span className="text-slate-700">-</span>}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className={`p-3 text-right font-bold font-mono ${yearlyTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {(yearlyTotal * 100).toFixed(1)}%
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
