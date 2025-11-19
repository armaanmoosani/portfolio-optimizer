"use client";

import React from 'react';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Shield, Target, AlertTriangle, BarChart3 } from 'lucide-react';

// Mock data for demonstration
const mockData = {
    weights: [
        { asset: 'AAPL', weight: 28.5, color: '#3b82f6' },
        { asset: 'GOOGL', weight: 22.3, color: '#8b5cf6' },
        { asset: 'MSFT', weight: 19.7, color: '#06b6d4' },
        { asset: 'AMZN', weight: 15.8, color: '#10b981' },
        { asset: 'NVDA', weight: 13.7, color: '#f59e0b' }
    ],
    metrics: {
        expectedReturn: 14.2,
        volatility: 18.5,
        sharpeRatio: 0.87,
        sortinoRatio: 1.12,
        beta: 1.05,
        alpha: 2.3,
        maxDrawdown: -15.7
    },
    performance: Array.from({ length: 252 }, (_, i) => ({
        date: `Day ${i + 1}`,
        value: 10000 * Math.exp((0.12 / 252) * i + (Math.random() - 0.5) * 0.02)
    })),
    drawdown: Array.from({ length: 252 }, (_, i) => ({
        date: `Day ${i + 1}`,
        drawdown: -Math.abs(Math.sin(i / 30) * 15 + (Math.random() - 0.5) * 5)
    })),
    rollingMetrics: Array.from({ length: 222 }, (_, i) => ({
        date: `Day ${i + 30}`,
        volatility: 0.15 + Math.sin(i / 20) * 0.05,
        sharpe: 0.8 + Math.cos(i / 25) * 0.3
    })),
    efficientFrontier: Array.from({ length: 50 }, (_, i) => ({
        risk: 0.05 + i * 0.005,
        return: 0.03 + Math.sqrt(i * 0.005) * 0.3 - (i * 0.00001)
    })),
    correlation: [
        [1.00, 0.75, 0.68, 0.42, 0.55],
        [0.75, 1.00, 0.82, 0.51, 0.63],
        [0.68, 0.82, 1.00, 0.47, 0.71],
        [0.42, 0.51, 0.47, 1.00, 0.38],
        [0.55, 0.63, 0.71, 0.38, 1.00]
    ],
    assets: ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'NVDA']
};

const MetricCard = ({ icon: Icon, label, value, isPositive, suffix = '%', trend }) => (
    <div className="p-6 rounded-xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-md">
        <div className="flex items-start justify-between mb-3">
            <div className={`p-2.5 rounded-lg ${isPositive ? 'bg-emerald-500/10' : 'bg-blue-500/10'}`}>
                <Icon className={`w-5 h-5 ${isPositive ? 'text-emerald-400' : 'text-blue-400'}`} />
            </div>
            {trend && (
                <div className={`text-xs flex items-center gap-1 ${trend > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(trend)}%
                </div>
            )}
        </div>
        <div className="text-sm text-slate-400 mb-1">{label}</div>
        <div className={`text-3xl font-bold ${value > 0 ? 'text-emerald-400' : value < 0 ? 'text-rose-400' : 'text-white'
            }`}>
            {value > 0 && !label.includes('Beta') ? '+' : ''}{value.toFixed(2)}{suffix}
        </div>
    </div>
);

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl">
                <p className="text-slate-300 text-sm mb-1">{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} className="text-xs" style={{ color: entry.color }}>
                        {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function PortfolioResults({ data = mockData }) {
    return (
        <div className="space-y-8">
            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <MetricCard
                    icon={TrendingUp}
                    label="Expected Return"
                    value={data.metrics.expectedReturn}
                    isPositive={true}
                />
                <MetricCard
                    icon={Activity}
                    label="Volatility"
                    value={data.metrics.volatility}
                    isPositive={false}
                />
                <MetricCard
                    icon={Target}
                    label="Sharpe Ratio"
                    value={data.metrics.sharpeRatio}
                    isPositive={true}
                    suffix=""
                />
                <MetricCard
                    icon={Shield}
                    label="Sortino Ratio"
                    value={data.metrics.sortinoRatio}
                    isPositive={true}
                    suffix=""
                />
                <MetricCard
                    icon={BarChart3}
                    label="Beta"
                    value={data.metrics.beta}
                    isPositive={false}
                    suffix=""
                />
                <MetricCard
                    icon={TrendingUp}
                    label="Alpha"
                    value={data.metrics.alpha}
                    isPositive={true}
                />
                <MetricCard
                    icon={AlertTriangle}
                    label="Max Drawdown"
                    value={data.metrics.maxDrawdown}
                    isPositive={false}
                />
            </div>

            {/* Optimal Weights */}
            <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-md">
                <h3 className="text-xl font-bold text-white mb-6">Optimal Portfolio Weights</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Table */}
                    <div className="space-y-2">
                        {data.weights.map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/30">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: item.color }}
                                    />
                                    <span className="font-medium text-white">{item.asset}</span>
                                </div>
                                <span className="text-lg font-bold text-blue-400">{item.weight.toFixed(1)}%</span>
                            </div>
                        ))}
                    </div>
                    {/* Bar Chart */}
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.weights} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis type="number" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                                <YAxis type="category" dataKey="asset" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="weight" radius={[0, 8, 8, 0]}>
                                    {data.weights.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Performance Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Backtest Performance */}
                <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-md">
                    <h3 className="text-xl font-bold text-white mb-6">Backtest Performance</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.performance}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis
                                    dataKey="date"
                                    stroke="#94a3b8"
                                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                                    interval="preserveStartEnd"
                                    minTickGap={50}
                                />
                                <YAxis
                                    stroke="#94a3b8"
                                    tick={{ fill: '#94a3b8' }}
                                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="value"
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
                <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-md">
                    <h3 className="text-xl font-bold text-white mb-6">Drawdown</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.drawdown}>
                                <defs>
                                    <linearGradient id="colorDD" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis
                                    dataKey="date"
                                    stroke="#94a3b8"
                                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                                    interval="preserveStartEnd"
                                    minTickGap={50}
                                />
                                <YAxis
                                    stroke="#94a3b8"
                                    tick={{ fill: '#94a3b8' }}
                                    tickFormatter={(value) => `${value.toFixed(0)}%`}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="drawdown"
                                    stroke="#ef4444"
                                    fillOpacity={1}
                                    fill="url(#colorDD)"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Rolling Metrics - Only show if data exists */}
            {data.rollingMetrics && data.rollingMetrics.length > 0 && (
                <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-md">
                    <h3 className="text-xl font-bold text-white mb-6">Rolling 30-Day Metrics</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.rollingMetrics}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis
                                    dataKey="date"
                                    stroke="#94a3b8"
                                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                                    interval={40}
                                />
                                <YAxis
                                    yAxisId="left"
                                    stroke="#8b5cf6"
                                    tick={{ fill: '#8b5cf6' }}
                                />
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    stroke="#10b981"
                                    tick={{ fill: '#10b981' }}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="volatility"
                                    stroke="#8b5cf6"
                                    strokeWidth={2}
                                    dot={false}
                                    name="Volatility"
                                />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="sharpe"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    dot={false}
                                    name="Sharpe Ratio"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Efficient Frontier - Only show if data exists */}
            {data.efficientFrontier && data.efficientFrontier.length > 0 && (
                <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-900/20 to-slate-900/20 border border-purple-500/20 backdrop-blur-md">
                    <h3 className="text-xl font-bold text-white mb-6">Efficient Frontier</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis
                                    type="number"
                                    dataKey="risk"
                                    name="Risk"
                                    stroke="#94a3b8"
                                    tick={{ fill: '#94a3b8' }}
                                    label={{ value: 'Risk (Volatility)', position: 'bottom', fill: '#94a3b8' }}
                                    tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                                />
                                <YAxis
                                    type="number"
                                    dataKey="return"
                                    name="Return"
                                    stroke="#94a3b8"
                                    tick={{ fill: '#94a3b8' }}
                                    label={{ value: 'Expected Return', angle: -90, position: 'left', fill: '#94a3b8' }}
                                    tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Scatter
                                    data={data.efficientFrontier}
                                    fill="#a855f7"
                                    line={{ stroke: '#a855f7', strokeWidth: 2 }}
                                />
                                <Scatter
                                    data={[{ risk: data.metrics.volatility / 100, return: data.metrics.expectedReturn / 100 }]}
                                    fill="#10b981"
                                    shape="star"
                                    name="Optimal Portfolio"
                                />
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Correlation Heatmap - Only show if data exists */}
            {data.correlation && data.correlation.length > 0 && (
                <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-md">
                    <h3 className="text-xl font-bold text-white mb-6">Asset Correlation Matrix</h3>
                    <div className="overflow-x-auto">
                        <div className="inline-grid gap-1" style={{ gridTemplateColumns: `auto repeat(${data.assets.length}, 1fr)` }}>
                            {/* Header row */}
                            <div></div>
                            {data.assets.map((asset, i) => (
                                <div key={i} className="p-2 text-center text-sm font-medium text-slate-400">
                                    {asset}
                                </div>
                            ))}

                            {/* Data rows */}
                            {data.correlation.map((row, i) => (
                                <React.Fragment key={`row-${i}`}>
                                    <div className="p-2 text-sm font-medium text-slate-400">
                                        {data.assets[i]}
                                    </div>
                                    {row.map((value, j) => {
                                        const hue = value >= 0 ? 142 : 0; // Green for positive, red for negative
                                        const saturation = Math.abs(value) * 100;
                                        const lightness = 50 + (1 - Math.abs(value)) * 20;
                                        return (
                                            <div
                                                key={j}
                                                className="p-4 rounded text-center text-sm font-medium transition-transform hover:scale-110"
                                                style={{
                                                    backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
                                                    color: Math.abs(value) > 0.5 ? '#ffffff' : '#1e293b'
                                                }}
                                            >
                                                {value.toFixed(2)}
                                            </div>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
