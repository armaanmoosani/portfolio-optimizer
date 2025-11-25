import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const formatPercent = (value) => `${(value * 100).toFixed(2)}%`;
const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

export default function PortfolioReport({ data }) {
    if (!data) return null;

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

    return (
        <div className="hidden print:block bg-white text-slate-900 p-8 max-w-[210mm] mx-auto">
            {/* Page 1: Executive Summary */}
            <div className="min-h-[297mm] relative flex flex-col">
                <div className="border-b-4 border-slate-900 pb-6 mb-8">
                    <h1 className="text-4xl font-bold text-slate-900">Portfolio Analytics Report</h1>
                    <p className="text-slate-500 mt-2 text-lg">Generated on {new Date().toLocaleDateString()}</p>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-12">
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-slate-800 border-b border-slate-200 pb-2">Performance Summary</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-slate-500">Annualized Return</p>
                                <p className="text-2xl font-bold text-slate-900">{formatPercent(data.metrics.expectedReturn)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Volatility</p>
                                <p className="text-2xl font-bold text-slate-900">{formatPercent(data.metrics.volatility)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Sharpe Ratio</p>
                                <p className="text-2xl font-bold text-slate-900">{data.metrics.sharpeRatio.toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Max Drawdown</p>
                                <p className="text-2xl font-bold text-rose-600">{formatPercent(data.metrics.maxDrawdown)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-slate-800 border-b border-slate-200 pb-2">Portfolio Details</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-slate-500">Start Balance</p>
                                <p className="text-lg font-mono">{formatCurrency(data.metrics.startBalance)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">End Balance</p>
                                <p className="text-lg font-mono">{formatCurrency(data.metrics.endBalance)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Start Date</p>
                                <p className="text-sm">{data.performance[0]?.date}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">End Date</p>
                                <p className="text-sm">{data.performance[data.performance.length - 1]?.date}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mb-12">
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Cumulative Performance</h2>
                    <div className="h-[300px] border border-slate-200 rounded p-4">
                        {/* Fixed dimensions for print */}
                        <LineChart width={700} height={280} data={data.performance}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(val) => val.slice(0, 4)} />
                            <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} tickFormatter={(val) => `$${val / 1000}k`} />
                            <Line type="monotone" dataKey="value" stroke="#0f172a" strokeWidth={2} dot={false} />
                        </LineChart>
                    </div>
                </div>

                <div className="mt-auto pt-8 border-t border-slate-200 text-center text-xs text-slate-400">
                    <p>Professional Portfolio Analytics • Confidential • Page 1</p>
                </div>
            </div>

            <div className="break-before-page"></div>

            {/* Page 2: Risk Analysis */}
            <div className="min-h-[297mm] relative flex flex-col pt-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-8 border-b border-slate-200 pb-4">Risk Analysis</h2>

                <div className="mb-8">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Risk Contribution (PCR)</h3>
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                            <tr>
                                <th className="px-4 py-2 border border-slate-200">Asset</th>
                                <th className="px-4 py-2 border border-slate-200 text-right">Weight</th>
                                <th className="px-4 py-2 border border-slate-200 text-right">MCR</th>
                                <th className="px-4 py-2 border border-slate-200 text-right">PCR</th>
                                <th className="px-4 py-2 border border-slate-200 text-right">VaR Contrib</th>
                                <th className="px-4 py-2 border border-slate-200 text-right">CVaR Contrib</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(data.risk_contributions || {}).map(([ticker, metrics]) => ({ Ticker: ticker, ...metrics })).sort((a, b) => b.PCR - a.PCR).map((asset, i) => (
                                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                    <td className="px-4 py-2 border border-slate-200 font-medium">{asset.Ticker}</td>
                                    <td className="px-4 py-2 border border-slate-200 text-right">{formatPercent(asset.Weight)}</td>
                                    <td className="px-4 py-2 border border-slate-200 text-right">{asset.MCR.toFixed(4)}</td>
                                    <td className={`px-4 py-2 border border-slate-200 text-right font-bold ${asset.PCR > asset.Weight ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        {formatPercent(asset.PCR)}
                                    </td>
                                    <td className="px-4 py-2 border border-slate-200 text-right">{formatPercent(asset.Parametric_VaR_Contrib)}</td>
                                    <td className="px-4 py-2 border border-slate-200 text-right">{formatPercent(asset.CVaR_Contrib)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Advanced Risk Metrics</h3>
                        <table className="w-full text-sm border-collapse">
                            <tbody>
                                <tr className="border-b border-slate-200"><td className="py-2 text-slate-600">VaR (95% Daily)</td><td className="py-2 text-right font-mono">{formatPercent(data.metrics.var_95_daily * 100)}</td></tr>
                                <tr className="border-b border-slate-200"><td className="py-2 text-slate-600">CVaR (95% Daily)</td><td className="py-2 text-right font-mono">{formatPercent(data.metrics.cvar_95_daily * 100)}</td></tr>
                                <tr className="border-b border-slate-200"><td className="py-2 text-slate-600">Skewness</td><td className="py-2 text-right font-mono">{data.metrics.skewness.toFixed(2)}</td></tr>
                                <tr className="border-b border-slate-200"><td className="py-2 text-slate-600">Kurtosis</td><td className="py-2 text-right font-mono">{data.metrics.kurtosis.toFixed(2)}</td></tr>
                                <tr className="border-b border-slate-200"><td className="py-2 text-slate-600">Calmar Ratio</td><td className="py-2 text-right font-mono">{data.metrics.calmar_ratio.toFixed(2)}</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Benchmark Comparison</h3>
                        <table className="w-full text-sm border-collapse">
                            <tbody>
                                <tr className="border-b border-slate-200"><td className="py-2 text-slate-600">Beta</td><td className="py-2 text-right font-mono">{data.metrics.beta.toFixed(2)}</td></tr>
                                <tr className="border-b border-slate-200"><td className="py-2 text-slate-600">Alpha</td><td className="py-2 text-right font-mono">{formatPercent(data.metrics.alpha)}</td></tr>
                                <tr className="border-b border-slate-200"><td className="py-2 text-slate-600">Tracking Error</td><td className="py-2 text-right font-mono">{formatPercent(data.metrics.tracking_error * 100)}</td></tr>
                                <tr className="border-b border-slate-200"><td className="py-2 text-slate-600">Information Ratio</td><td className="py-2 text-right font-mono">{data.metrics.information_ratio.toFixed(2)}</td></tr>
                                <tr className="border-b border-slate-200"><td className="py-2 text-slate-600">R-Squared</td><td className="py-2 text-right font-mono">{data.metrics.r_squared ? data.metrics.r_squared.toFixed(2) : '-'}</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mt-auto pt-8 border-t border-slate-200 text-center text-xs text-slate-400">
                    <p>Professional Portfolio Analytics • Confidential • Page 2</p>
                </div>
            </div>

            <div className="break-before-page"></div>

            {/* Page 3: Drawdowns & Allocation */}
            <div className="min-h-[297mm] relative flex flex-col pt-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-8 border-b border-slate-200 pb-4">Drawdowns & Allocation</h2>

                <div className="mb-12">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Top 5 Drawdowns</h3>
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                            <tr>
                                <th className="px-4 py-2 border border-slate-200">Depth</th>
                                <th className="px-4 py-2 border border-slate-200">Start</th>
                                <th className="px-4 py-2 border border-slate-200">Trough</th>
                                <th className="px-4 py-2 border border-slate-200">End</th>
                                <th className="px-4 py-2 border border-slate-200">Recovery</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.drawdowns.map((dd, i) => (
                                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                    <td className="px-4 py-2 border border-slate-200 font-bold text-rose-600">{formatPercent(dd.depth * 100)}</td>
                                    <td className="px-4 py-2 border border-slate-200">{dd.start}</td>
                                    <td className="px-4 py-2 border border-slate-200">{dd.trough}</td>
                                    <td className="px-4 py-2 border border-slate-200">{dd.end}</td>
                                    <td className="px-4 py-2 border border-slate-200">{dd.recovery_days} days</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Asset Allocation</h3>
                        <table className="w-full text-sm border-collapse">
                            <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-2 border border-slate-200 text-left">Asset</th>
                                    <th className="px-4 py-2 border border-slate-200 text-right">Weight</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.assets.map((asset, i) => (
                                    <tr key={i} className="border-b border-slate-200">
                                        <td className="px-4 py-2 font-medium">{asset}</td>
                                        <td className="px-4 py-2 text-right font-mono">{formatPercent(data.weights[asset])}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex items-center justify-center">
                        <PieChart width={300} height={300}>
                            <Pie
                                data={data.assets.map((asset, i) => ({ name: asset, value: data.weights[asset] }))}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                fill="#8884d8"
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {data.assets.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Legend layout="vertical" verticalAlign="middle" align="right" />
                        </PieChart>
                    </div>
                </div>

                <div className="mt-auto pt-8 border-t border-slate-200 text-center text-xs text-slate-400">
                    <p>Professional Portfolio Analytics • Confidential • Page 3</p>
                    <p className="mt-2 italic">Disclaimer: Past performance is not indicative of future results. This report is for informational purposes only.</p>
                </div>
            </div>
        </div>
    );
}
