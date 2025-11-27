import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const formatPercent = (value) => `${(value * 100).toFixed(2)}%`;
const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

export default function PortfolioReport({ data }) {
    if (!data) return null;

    const COLORS = ['#1e293b', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0', '#f1f5f9'];
    const ACCENT_COLOR = '#0f172a';

    const PageHeader = () => (
        <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-8 text-xs text-slate-400 uppercase tracking-widest">
            <span>Portfolio Analytics Report</span>
            <span>{new Date().toLocaleDateString()}</span>
        </div>
    );

    const PageFooter = ({ pageNum }) => (
        <div className="mt-auto pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
            <span>Confidential & Proprietary</span>
            <span>Page {pageNum}</span>
        </div>
    );

    return (
        <div className="hidden print:block bg-white text-slate-900 font-serif">

            {/* COVER PAGE */}
            <div className="w-[210mm] h-[297mm] mx-auto p-12 flex flex-col relative page-break-after-always">
                <div className="flex-1 flex flex-col justify-center items-center text-center">
                    <div className="w-24 h-24 bg-slate-900 text-white flex items-center justify-center rounded-full mb-8">
                        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <h1 className="text-5xl font-bold text-slate-900 mb-4 tracking-tight">Portfolio Optimization</h1>
                    <h2 className="text-2xl text-slate-500 font-light mb-12">Comprehensive Analysis Report</h2>

                    <div className="w-24 h-1 bg-slate-900 mb-12"></div>

                    <div className="text-left space-y-4 text-sm border p-8 rounded-lg border-slate-200 min-w-[300px]">
                        <div className="flex justify-between">
                            <span className="text-slate-500 uppercase tracking-wider text-xs font-sans">Date Generated</span>
                            <span className="font-semibold font-sans">{new Date().toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500 uppercase tracking-wider text-xs font-sans">Strategy</span>
                            <span className="font-semibold font-sans">Max Sharpe Ratio</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500 uppercase tracking-wider text-xs font-sans">Assets</span>
                            <span className="font-semibold font-sans">{data.assets.length} Securities</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500 uppercase tracking-wider text-xs font-sans">Period</span>
                            <span className="font-semibold font-sans">{data.performance[0]?.date.slice(0, 4)} - {data.performance[data.performance.length - 1]?.date.slice(0, 4)}</span>
                        </div>
                    </div>
                </div>
                <div className="text-center text-xs text-slate-400 uppercase tracking-widest mb-8">
                    Institutional Grade Analytics
                </div>
            </div>

            {/* PAGE 1: EXECUTIVE SUMMARY */}
            <div className="w-[210mm] h-[297mm] mx-auto p-12 flex flex-col relative page-break-after-always">
                <PageHeader />

                <h2 className="text-2xl font-bold text-slate-900 mb-6 font-sans border-l-4 border-slate-900 pl-4">Executive Summary</h2>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-4 gap-6 mb-12">
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-sans mb-1">Annual Return</div>
                        <div className="text-2xl font-bold text-slate-900 font-sans">{formatPercent(data.metrics.expectedReturn)}</div>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-sans mb-1">Volatility</div>
                        <div className="text-2xl font-bold text-slate-900 font-sans">{formatPercent(data.metrics.volatility)}</div>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-sans mb-1">Sharpe Ratio</div>
                        <div className="text-2xl font-bold text-slate-900 font-sans">{data.metrics.sharpeRatio.toFixed(2)}</div>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-sans mb-1">Max Drawdown</div>
                        <div className="text-2xl font-bold text-rose-700 font-sans">{formatPercent(data.metrics.maxDrawdown)}</div>
                    </div>
                </div>

                {/* Performance Chart */}
                <div className="mb-12">
                    <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider font-sans">Cumulative Performance</h3>
                    <div className="h-[300px] border border-slate-100 rounded p-4 bg-slate-50/50">
                        <LineChart width={700} height={280} data={data.performance}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 10, fontFamily: 'sans-serif' }}
                                tickFormatter={(val) => val.slice(0, 4)}
                                axisLine={false}
                                tickLine={false}
                                dy={10}
                            />
                            <YAxis
                                tick={{ fontSize: 10, fontFamily: 'sans-serif' }}
                                domain={['auto', 'auto']}
                                tickFormatter={(val) => `$${val / 1000}k`}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Line type="monotone" dataKey="value" stroke="#0f172a" strokeWidth={2} dot={false} />
                        </LineChart>
                    </div>
                </div>

                {/* Asset Allocation */}
                <div className="grid grid-cols-2 gap-12">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider font-sans">Asset Allocation</h3>
                        <table className="w-full text-sm border-collapse font-sans">
                            <thead className="border-b border-slate-200">
                                <tr>
                                    <th className="text-left py-2 text-xs text-slate-500 font-medium">Asset</th>
                                    <th className="text-right py-2 text-xs text-slate-500 font-medium">Weight</th>
                                    <th className="text-right py-2 text-xs text-slate-500 font-medium">Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.assets.map((asset, i) => (
                                    <tr key={i} className="border-b border-slate-100">
                                        <td className="py-2 font-medium text-slate-700">{asset}</td>
                                        <td className="py-2 text-right">{formatPercent(data.weights[asset])}</td>
                                        <td className="py-2 text-right text-slate-500">{formatCurrency(data.metrics.endBalance * data.weights[asset])}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex items-center justify-center">
                        <PieChart width={250} height={250}>
                            <Pie
                                data={data.assets.map((asset, i) => ({ name: asset, value: data.weights[asset] }))}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {data.assets.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                ))}
                            </Pie>
                        </PieChart>
                    </div>
                </div>

                <PageFooter pageNum={1} />
            </div>

            {/* PAGE 2: RISK ANALYSIS */}
            <div className="w-[210mm] h-[297mm] mx-auto p-12 flex flex-col relative page-break-after-always">
                <PageHeader />

                <h2 className="text-2xl font-bold text-slate-900 mb-6 font-sans border-l-4 border-slate-900 pl-4">Risk Analysis</h2>

                <div className="mb-12">
                    <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider font-sans">Risk Contribution</h3>
                    <table className="w-full text-sm text-left border-collapse font-sans">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-[10px]">
                            <tr>
                                <th className="px-4 py-3 border-b border-slate-200 font-medium">Asset</th>
                                <th className="px-4 py-3 border-b border-slate-200 text-right font-medium">Weight</th>
                                <th className="px-4 py-3 border-b border-slate-200 text-right font-medium">Marginal Risk</th>
                                <th className="px-4 py-3 border-b border-slate-200 text-right font-medium">Total Risk Contrib</th>
                                <th className="px-4 py-3 border-b border-slate-200 text-right font-medium">% of Risk</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(data.risk_contributions || {}).sort((a, b) => (b[1]?.PCR || 0) - (a[1]?.PCR || 0)).map(([ticker, metrics], i) => {
                                if (!metrics) return null;
                                return (
                                    <tr key={i} className="border-b border-slate-100">
                                        <td className="px-4 py-2 font-semibold text-slate-700">{ticker}</td>
                                        <td className="px-4 py-2 text-right text-slate-600">{formatPercent(metrics.Weight || 0)}</td>
                                        <td className="px-4 py-2 text-right text-slate-600">{typeof metrics.MCR === 'number' ? metrics.MCR.toFixed(4) : '0.0000'}</td>
                                        <td className="px-4 py-2 text-right text-slate-600">{typeof metrics.TRC === 'number' ? metrics.TRC.toFixed(4) : '0.0000'}</td>
                                        <td className="px-4 py-2 text-right font-bold text-slate-800">{formatPercent(metrics.PCR || 0)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="grid grid-cols-2 gap-12 mb-12">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider font-sans">Advanced Risk Metrics</h3>
                        <table className="w-full text-sm border-collapse font-sans">
                            <tbody>
                                <tr className="border-b border-slate-100"><td className="py-2 text-slate-500">VaR (95% Daily)</td><td className="py-2 text-right font-mono text-slate-700">{formatPercent(data.metrics.var_95_daily || 0)}</td></tr>
                                <tr className="border-b border-slate-100"><td className="py-2 text-slate-500">CVaR (95% Daily)</td><td className="py-2 text-right font-mono text-slate-700">{formatPercent(data.metrics.cvar_95_daily || 0)}</td></tr>
                                <tr className="border-b border-slate-100"><td className="py-2 text-slate-500">Skewness</td><td className="py-2 text-right font-mono text-slate-700">{typeof data.metrics.skewness === 'number' ? data.metrics.skewness.toFixed(2) : '-'}</td></tr>
                                <tr className="border-b border-slate-100"><td className="py-2 text-slate-500">Kurtosis</td><td className="py-2 text-right font-mono text-slate-700">{typeof data.metrics.kurtosis === 'number' ? data.metrics.kurtosis.toFixed(2) : '-'}</td></tr>
                                <tr className="border-b border-slate-100"><td className="py-2 text-slate-500">Calmar Ratio</td><td className="py-2 text-right font-mono text-slate-700">{typeof data.metrics.calmar_ratio === 'number' ? data.metrics.calmar_ratio.toFixed(2) : '-'}</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider font-sans">Benchmark Comparison</h3>
                        <table className="w-full text-sm border-collapse font-sans">
                            <tbody>
                                <tr className="border-b border-slate-100"><td className="py-2 text-slate-500">Beta</td><td className="py-2 text-right font-mono text-slate-700">{typeof data.metrics.beta === 'number' ? data.metrics.beta.toFixed(2) : '-'}</td></tr>
                                <tr className="border-b border-slate-100"><td className="py-2 text-slate-500">Alpha</td><td className="py-2 text-right font-mono text-slate-700">{formatPercent(data.metrics.alpha || 0)}</td></tr>
                                <tr className="border-b border-slate-100"><td className="py-2 text-slate-500">Tracking Error</td><td className="py-2 text-right font-mono text-slate-700">{formatPercent(data.metrics.tracking_error || 0)}</td></tr>
                                <tr className="border-b border-slate-100"><td className="py-2 text-slate-500">Information Ratio</td><td className="py-2 text-right font-mono text-slate-700">{typeof data.metrics.information_ratio === 'number' ? data.metrics.information_ratio.toFixed(2) : '-'}</td></tr>
                                <tr className="border-b border-slate-100"><td className="py-2 text-slate-500">R-Squared</td><td className="py-2 text-right font-mono text-slate-700">{typeof data.metrics.r_squared === 'number' ? data.metrics.r_squared.toFixed(2) : '-'}</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mt-auto">
                    <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider font-sans">Top 5 Drawdowns</h3>
                    <table className="w-full text-xs text-left border-collapse font-sans">
                        <thead className="bg-slate-50 text-slate-500 uppercase">
                            <tr>
                                <th className="px-2 py-2 border-b border-slate-200">Depth</th>
                                <th className="px-2 py-2 border-b border-slate-200">Start</th>
                                <th className="px-2 py-2 border-b border-slate-200">Trough</th>
                                <th className="px-2 py-2 border-b border-slate-200">End</th>
                                <th className="px-2 py-2 border-b border-slate-200">Recovery</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.drawdowns.slice(0, 5).map((dd, i) => (
                                <tr key={i} className="border-b border-slate-100">
                                    <td className="px-2 py-2 font-bold text-rose-700">{formatPercent(dd.depth)}</td>
                                    <td className="px-2 py-2 text-slate-600">{dd.start}</td>
                                    <td className="px-2 py-2 text-slate-600">{dd.trough}</td>
                                    <td className="px-2 py-2 text-slate-600">{dd.end}</td>
                                    <td className="px-2 py-2 text-slate-600">{dd.recovery_days} days</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <PageFooter pageNum={2} />
            </div>

            {/* DISCLAIMER PAGE */}
            <div className="w-[210mm] h-[297mm] mx-auto p-12 flex flex-col relative">
                <PageHeader />
                <div className="flex-1 flex flex-col justify-end pb-20">
                    <h4 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider font-sans">Important Disclaimer</h4>
                    <p className="text-xs text-slate-500 leading-relaxed text-justify">
                        This report is generated for informational purposes only and does not constitute financial advice, an offer to sell, or a solicitation of an offer to buy any securities. The performance data quoted represents past performance and is no guarantee of future results. Investment return and principal value of an investment will fluctuate so that an investor's shares, when redeemed, may be worth more or less than their original cost. Current performance may be lower or higher than the performance data quoted. All investments involve risk, including the loss of principal. The analysis provided herein is based on data believed to be reliable, but no representation or warranty is made as to its accuracy or completeness.
                    </p>
                </div>
                <PageFooter pageNum={3} />
            </div>

        </div>
    );
}
