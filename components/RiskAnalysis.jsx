import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AlertTriangle, Info, HelpCircle } from 'lucide-react';
import MetricTooltip from './MetricTooltip';

const formatPercent = (value) => `${(value * 100).toFixed(2)}%`;
const formatNumber = (value) => value.toFixed(4);

export default function RiskAnalysis({ data }) {
    if (!data) return null;

    // Convert data object to array and sort by PCR descending
    const riskData = Object.values(data).sort((a, b) => b.PCR - a.PCR);
    const topRiskDriver = riskData[0];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Summary Section */}
            <div className="p-6 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-start gap-4">
                <div className="p-3 rounded-full bg-rose-500/10 text-rose-400">
                    <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Risk Contribution Analysis</h3>
                    <p className="text-slate-300">
                        Top risk driver: <span className="font-bold text-white">{topRiskDriver.Ticker}</span> contributes{' '}
                        <span className="font-bold text-rose-400">{formatPercent(topRiskDriver.PCR)}</span> of total portfolio risk.
                    </p>
                    <p className="text-sm text-slate-400 mt-2">
                        {topRiskDriver.PCR > topRiskDriver.Weight
                            ? `This asset contributes more to risk (${formatPercent(topRiskDriver.PCR)}) than its weight allocation (${formatPercent(topRiskDriver.Weight)}), indicating high volatility or correlation with other assets.`
                            : `This asset contributes less to risk (${formatPercent(topRiskDriver.PCR)}) than its weight allocation (${formatPercent(topRiskDriver.Weight)}), providing diversification benefits.`}
                    </p>
                </div>
            </div>

            {/* Risk Contribution Chart */}
            <div className="p-6 rounded-xl bg-slate-800/40 border border-slate-700/50">
                <h3 className="text-lg font-bold text-white mb-6">Risk Contribution by Asset (PCR)</h3>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={riskData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                            <XAxis type="number" tickFormatter={(val) => `${(val * 100).toFixed(0)}%`} stroke="#94a3b8" />
                            <YAxis dataKey="Ticker" type="category" stroke="#94a3b8" width={60} />
                            <Tooltip
                                cursor={{ fill: '#334155', opacity: 0.2 }}
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                                formatter={(value) => formatPercent(value)}
                            />
                            <Bar dataKey="PCR" radius={[0, 4, 4, 0]}>
                                {riskData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.PCR > entry.Weight ? '#f43f5e' : '#34d399'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-4 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-rose-500"></div>
                        <span className="text-slate-400">Aggressive (PCR &gt; Weight)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-emerald-400"></div>
                        <span className="text-slate-400">Diversifier (PCR &lt; Weight)</span>
                    </div>
                </div>
            </div>

            {/* Detailed Risk Table */}
            <div className="rounded-xl border border-slate-700/50 overflow-hidden">
                <div className="bg-slate-800/60 px-6 py-4 border-b border-slate-700/50">
                    <h3 className="font-semibold text-white">Detailed Risk Metrics</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-800/40">
                            <tr>
                                <th className="px-6 py-3">Asset</th>
                                <th className="px-6 py-3 text-right">Weight</th>
                                <th className="px-6 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        MCR
                                        <MetricTooltip
                                            title="Marginal Contribution to Risk"
                                            description="How much portfolio volatility changes if you increase this asset's weight by 1%. High MCR means adding more is risky."
                                            formula="∂σ/∂w"
                                        />
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        Vol Contrib
                                        <MetricTooltip
                                            title="Absolute Volatility Contribution"
                                            description="The amount of total volatility (in absolute terms) coming from this asset."
                                            formula="Weight × MCR"
                                        />
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        PCR
                                        <MetricTooltip
                                            title="Percent Contribution to Risk"
                                            description="Percentage of total portfolio risk explained by this asset. Sums to 100%."
                                            formula="(Weight × MCR) / Portfolio Volatility"
                                        />
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        VaR Contrib (95%)
                                        <MetricTooltip
                                            title="VaR Contribution"
                                            description="Amount of the portfolio's Value at Risk attributable to this asset."
                                            formula="PCR × Portfolio VaR"
                                        />
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {riskData.map((asset) => (
                                <tr key={asset.Ticker} className="bg-slate-900/20 hover:bg-slate-800/40 transition-colors">
                                    <td className="px-6 py-4 font-medium text-white">{asset.Ticker}</td>
                                    <td className="px-6 py-4 text-right font-mono text-slate-300">{formatPercent(asset.Weight)}</td>
                                    <td className="px-6 py-4 text-right font-mono text-slate-300">{formatNumber(asset.MCR)}</td>
                                    <td className="px-6 py-4 text-right font-mono text-slate-300">{formatNumber(asset.Contribution_to_Vol)}</td>
                                    <td className="px-6 py-4 text-right font-mono">
                                        <div className="flex items-center justify-end gap-2 group relative">
                                            <span className={asset.PCR > asset.Weight ? 'text-rose-400' : 'text-emerald-400'}>
                                                {formatPercent(asset.PCR)}
                                            </span>
                                            {asset.PCR > asset.Weight * 1.2 && (
                                                <div className="absolute right-full mr-2 w-48 p-2 bg-slate-900 border border-slate-700 rounded shadow-xl text-xs text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                                    High Risk Contributor: This asset drives a disproportionate amount of risk.
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-slate-300">{formatPercent(asset.Parametric_VaR_Contrib)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
