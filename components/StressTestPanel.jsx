import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine,
    Cell
} from 'recharts';
import { AlertTriangle, TrendingDown, Shield, Info, Activity } from 'lucide-react';
import MetricTooltip from './MetricTooltip';

const StressTestPanel = ({ results, isLoading }) => {
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-slate-400">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                <p>Running historical stress simulations...</p>
                <p className="text-xs mt-2 text-slate-500">Fetching data for 2008 Crisis, Covid Crash, and more</p>
            </div>
        );
    }

    if (!results || results.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-slate-400">
                <AlertTriangle className="w-12 h-12 mb-4 text-amber-500/50" />
                <p>No stress test results available.</p>
                <p className="text-xs mt-2 text-slate-500">Try optimizing a portfolio first.</p>
            </div>
        );
    }

    // Filter available scenarios
    const availableScenarios = results.filter(r => r.available);
    const unavailableScenarios = results.filter(r => !r.available);

    // Format data for chart
    const chartData = availableScenarios.map(scenario => ({
        name: scenario.name.split(' ')[0], // Short name (e.g., "2008")
        fullName: scenario.name,
        Portfolio: scenario.metrics.portfolio_return * 100,
        Benchmark: scenario.metrics.benchmark_return * 100,
        difference: scenario.metrics.difference * 100
    }));

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 border border-slate-700 p-3 rounded shadow-xl">
                    <p className="text-slate-200 font-bold mb-2">{payload[0].payload.fullName}</p>
                    <div className="space-y-1 text-sm">
                        <p className="text-blue-400">Portfolio: {payload[0].value.toFixed(2)}%</p>
                        <p className="text-slate-400">Benchmark: {payload[1].value.toFixed(2)}%</p>
                        <div className="pt-1 border-t border-slate-800 mt-1">
                            <p className={payload[0].payload.difference >= 0 ? "text-emerald-400" : "text-rose-400"}>
                                {payload[0].payload.difference >= 0 ? "Outperformed" : "Underperformed"}: {Math.abs(payload[0].payload.difference).toFixed(2)}%
                            </p>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-400" />
                        Historical Stress Tests
                    </h3>
                    <p className="text-slate-400 text-sm mt-1">
                        Simulation of portfolio performance during major historical market crises.
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-xs text-slate-500 uppercase tracking-wider">Scenarios Tested</div>
                    <div className="text-2xl font-mono text-white">{availableScenarios.length} <span className="text-slate-600 text-sm">/ {results.length}</span></div>
                </div>
            </div>

            {/* Main Chart */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
                <h4 className="text-sm font-semibold text-slate-300 mb-6">Crisis Performance Comparison (Cumulative Return)</h4>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis
                                dataKey="name"
                                stroke="#64748b"
                                tick={{ fill: '#64748b', fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#64748b"
                                tick={{ fill: '#64748b', fontSize: 12 }}
                                tickFormatter={(val) => `${val}%`}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            <ReferenceLine y={0} stroke="#475569" />
                            <Bar dataKey="Portfolio" name="Your Portfolio" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.Portfolio >= 0 ? '#3b82f6' : '#ef4444'} fillOpacity={0.8} />
                                ))}
                            </Bar>
                            <Bar dataKey="Benchmark" name="S&P 500 (Benchmark)" fill="#64748b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Detailed Scorecard */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {availableScenarios.map((scenario) => (
                    <div key={scenario.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors backdrop-blur-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="font-bold text-slate-200">{scenario.name}</h4>
                                <p className="text-xs text-slate-500 mt-1">{scenario.start_date} — {scenario.end_date}</p>
                            </div>
                            <div className={`px-2 py-1 rounded text-xs font-bold ${scenario.metrics.difference >= 0
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}>
                                {scenario.metrics.difference >= 0 ? '+' : ''}{scenario.metrics.difference.toFixed(2)}% vs SPY
                            </div>
                        </div>

                        <p className="text-xs text-slate-400 mb-4 h-8 line-clamp-2">{scenario.description}</p>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800/50">
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Portfolio Return</div>
                                <div className={`font-mono font-bold ${scenario.metrics.portfolio_return >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {(scenario.metrics.portfolio_return * 100).toFixed(2)}%
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Alpha</div>
                                <div className={`font-mono font-bold ${scenario.metrics.difference >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {(scenario.metrics.difference * 100).toFixed(2)}%
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Max Drawdown</div>
                                <div className="font-mono font-bold text-rose-400">
                                    {(scenario.metrics.max_drawdown * 100).toFixed(2)}%
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                                    Stress Volatility
                                    <MetricTooltip
                                        title="Stress Volatility"
                                        description="Annualized standard deviation of returns specifically during this crisis period. Higher means a bumpier ride."
                                    />
                                </div>
                                <div className="font-mono font-bold text-slate-300">
                                    {(scenario.metrics.stress_volatility * 100).toFixed(2)}%
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                                    Correlation
                                    <MetricTooltip
                                        title="Stress Correlation"
                                        description="Correlation with the benchmark during the crisis. Correlations often converge to 1.0 during market crashes, reducing diversification benefits."
                                    />
                                </div>
                                <div className="font-mono font-bold text-slate-300">
                                    {scenario.metrics.stress_correlation?.toFixed(2) || 'N/A'}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                                    Stress Beta
                                    <MetricTooltip
                                        title="Stress Beta"
                                        description="Portfolio sensitivity to the benchmark specifically during the crisis. A Beta > 1.0 means you crashed harder than the market."
                                    />
                                </div>
                                <div className={`font-mono font-bold ${scenario.metrics.stress_beta > 1 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                    {scenario.metrics.stress_beta?.toFixed(2) || 'N/A'}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                                    Stress VaR (95%)
                                    <MetricTooltip
                                        title="Stress Value at Risk (95%)"
                                        description="The worst daily loss expected with 95% confidence during this crisis period. A measure of extreme tail risk."
                                    />
                                </div>
                                <div className="font-mono font-bold text-rose-400">
                                    {(scenario.metrics.stress_var_95 * 100).toFixed(2)}%
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Hypothetical Scenarios */}
            {results.some(r => r.type === 'hypothetical') && (
                <div className="space-y-4">
                    <h4 className="text-lg font-bold text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-purple-400" />
                        Hypothetical Shocks
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {results.filter(r => r.type === 'hypothetical').map((scenario) => (
                            <div key={scenario.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 backdrop-blur-sm hover:border-purple-500/30 transition-colors">
                                <h5 className="font-bold text-slate-200 text-sm mb-1">{scenario.name}</h5>
                                <p className="text-xs text-slate-500 mb-3">{scenario.description}</p>

                                <div className="flex justify-between items-end">
                                    <div>
                                        <div className="text-xs text-slate-500 mb-1">Projected Return</div>
                                        <div className={`text-lg font-mono font-bold ${scenario.metrics.portfolio_return >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {(scenario.metrics.portfolio_return * 100).toFixed(2)}%
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">Sensitivity</div>
                                        <div className="text-xs font-mono text-slate-400">
                                            {scenario.metrics.beta_used.toFixed(2)} ({scenario.metrics.beta_used > 1 ? 'High' : 'Low'})
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Unavailable Scenarios Warning */}
            {unavailableScenarios.length > 0 && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 flex items-start gap-3 backdrop-blur-sm">
                    <Info className="w-5 h-5 text-amber-500/50 flex-shrink-0 mt-0.5" />
                    <div>
                        <h5 className="text-sm font-medium text-amber-200/80 mb-1">Some scenarios could not be run</h5>
                        <p className="text-xs text-amber-200/50 mb-2">
                            The following scenarios were skipped because one or more assets in your portfolio did not exist during that time period:
                        </p>
                        <ul className="list-disc list-inside text-xs text-amber-200/50 space-y-1">
                            {unavailableScenarios.map(s => (
                                <li key={s.id}>{s.name} ({s.reason})</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StressTestPanel;
