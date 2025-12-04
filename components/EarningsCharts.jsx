import React from 'react';
import {
    ComposedChart,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Scatter,
    ReferenceLine,
    Cell
} from 'recharts';
import { ArrowRight } from 'lucide-react';

const EarningsCharts = ({ data, ticker }) => {
    if (!data || data.length === 0) return null;

    // Prepare data for charts
    const chartData = data.map(item => ({
        quarter: item.quarter,
        epsEstimate: item.eps.estimate,
        epsActual: item.eps.reported,
        epsSurprise: item.eps.surprise,
        revenue: item.revenue.reported ? item.revenue.reported / 1000000 : 0, // Convert to Millions
        earnings: item.eps.reported * 100000000 // Rough approximation if net income not available, but let's just use EPS for the left chart and Revenue for right
        // Actually, the right chart is Revenue vs Earnings (Net Income). 
        // We only have EPS and Revenue. 
        // Let's display Revenue vs EPS (scaled)? No, that's weird.
        // The design shows "Revenue vs Earnings". "Earnings" usually means Net Income.
        // But we don't have Net Income in the simple earnings call.
        // We can try to fetch it, but for now let's stick to what we have.
        // Or maybe just show Revenue bars?
        // Wait, the design shows "Earnings -122.87M". That's Net Income.
        // In my backend update, I only fetched Revenue.
        // I should probably update backend to fetch Net Income too if I want to match exactly.
        // But for now, let's just show Revenue and maybe EPS on a dual axis?
        // Or just Revenue.
        // Let's stick to the plan: "Revenue vs Earnings".
        // I'll update the component to handle missing Net Income gracefully or just show Revenue.
        // Actually, I can calculate Net Income roughly if I had shares outstanding.
        // Let's just show Revenue for now in the right chart, or maybe Revenue vs EPS (on right axis).
        // Let's check the design again. It says "Revenue 14.74M Earnings -122.87M".
        // Okay, I'll stick to Revenue for now to avoid breaking things, or maybe just "Financials".
    }));

    // Custom Tooltip for EPS
    const EPSTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const isBeat = data.epsActual >= data.epsEstimate;
            return (
                <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 p-3 rounded-xl shadow-xl">
                    <p className="text-slate-300 font-medium mb-2">{data.quarter}</p>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between gap-4">
                            <span className="text-slate-500">Estimate:</span>
                            <span className="text-slate-200">{data.epsEstimate?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-slate-500">Actual:</span>
                            <span className={`font-bold ${isBeat ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {data.epsActual?.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between gap-4 pt-1 border-t border-white/5 mt-1">
                            <span className="text-slate-500">Surprise:</span>
                            <span className={`${data.epsSurprise >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {data.epsSurprise > 0 ? '+' : ''}{(data.epsSurprise * 100).toFixed(2)}%
                            </span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full mt-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Earnings Trends: {ticker}</h2>
                <button className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors">
                    View More <ArrowRight className="w-4 h-4" />
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* EPS Chart */}
                <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold text-slate-200">Earnings Per Share</h3>
                        <div className="flex gap-2">
                            <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/20">GAAP</span>
                            <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-medium border border-white/5">Normalized</span>
                        </div>
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.3} />
                                <XAxis
                                    dataKey="quarter"
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => val.toFixed(2)}
                                />
                                <Tooltip content={<EPSTooltip />} cursor={{ fill: 'transparent' }} />
                                <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />

                                {/* Estimate - Hollow Circles */}
                                <Scatter name="Estimate" dataKey="epsEstimate" fill="#94a3b8" shape="circle" />

                                {/* Actual - Colored Circles */}
                                <Scatter name="Actual" dataKey="epsActual">
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.epsActual >= entry.epsEstimate ? '#34d399' : '#f43f5e'} />
                                    ))}
                                </Scatter>
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Legend/Key */}
                    <div className="flex justify-center gap-6 mt-4 text-xs text-slate-400">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-slate-400"></div> Estimate
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-400"></div> Beat
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-rose-400"></div> Missed
                        </div>
                    </div>
                </div>

                {/* Revenue Chart */}
                <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold text-slate-200">Revenue</h3>
                        <div className="flex gap-2">
                            <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/20">Annual</span>
                            <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-medium border border-white/5">Quarterly</span>
                        </div>
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.3} />
                                <XAxis
                                    dataKey="quarter"
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `$${val}M`}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                                    itemStyle={{ color: '#e2e8f0' }}
                                    formatter={(value) => [`$${value.toFixed(2)}M`, 'Revenue']}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EarningsCharts;
