import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ReferenceDot, Label } from 'recharts';

export default function EfficientFrontier({ data }) {
    if (!data || !data.frontier_points || data.frontier_points.length === 0) {
        return (
            <div className="flex items-center justify-center h-96 text-slate-400">
                No efficient frontier data available
            </div>
        );
    }

    // Format data for display
    const frontierPoints = data.frontier_points.map(p => ({
        volatility: p.volatility * 100, // Convert to percentage
        return: p.return * 100,
        type: 'Efficient Frontier'
    }));

    const individualAssets = data.individual_assets.map(a => ({
        volatility: a.volatility * 100,
        return: a.return * 100,
        name: a.name,
        type: 'Individual Asset'
    }));

    const optimalPortfolio = data.optimal_portfolio ? [{
        volatility: data.optimal_portfolio.volatility * 100,
        return: data.optimal_portfolio.return * 100,
        name: 'Optimal Portfolio',
        type: 'Optimal Portfolio'
    }] : [];

    // Custom tooltip
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length > 0) {
            const data = payload[0].payload;
            return (
                <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg shadow-xl">
                    <p className="text-white font-semibold mb-2">
                        {data.name || data.type}
                    </p>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between gap-4">
                            <span className="text-slate-400">Return:</span>
                            <span className="text-emerald-400 font-mono">{data.return.toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-slate-400">Risk:</span>
                            <span className="text-blue-400 font-mono">{data.volatility.toFixed(2)}%</span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    // Custom label for assets
    const CustomLabel = (props) => {
        const { x, y, payload } = props;
        if (payload && payload.name) {
            return (
                <text
                    x={x}
                    y={y - 10}
                    fill="#94a3b8"
                    fontSize={11}
                    fontWeight="600"
                    textAnchor="middle"
                >
                    {payload.name}
                </text>
            );
        }
        return null;
    };

    return (
        <div className="rounded-xl border border-slate-700/50 overflow-hidden bg-slate-900/20">
            <div className="bg-slate-800/60 px-6 py-4 border-b border-slate-700/50">
                <h3 className="font-semibold text-white">Efficient Frontier</h3>
                <p className="text-xs text-slate-400 mt-1">
                    Risk-return tradeoff visualization with optimal portfolios
                </p>
            </div>
            <div className="p-6">
                <ResponsiveContainer width="100%" height={500}>
                    <ScatterChart margin={{ top: 20, right: 80, bottom: 60, left: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis
                            type="number"
                            dataKey="volatility"
                            name="Risk (Volatility)"
                            unit="%"
                            stroke="#94a3b8"
                            tick={{ fill: '#94a3b8' }}
                            label={{
                                value: 'Volatility (Risk) %',
                                position: 'bottom',
                                offset: 40,
                                fill: '#cbd5e1'
                            }}
                        />
                        <YAxis
                            type="number"
                            dataKey="return"
                            name="Expected Return"
                            unit="%"
                            stroke="#94a3b8"
                            tick={{ fill: '#94a3b8' }}
                            label={{
                                value: 'Expected Return %',
                                angle: -90,
                                position: 'left',
                                offset: 40,
                                fill: '#cbd5e1'
                            }}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                        <Legend
                            wrapperStyle={{ paddingTop: '20px' }}
                            iconType="circle"
                        />

                        {/* Efficient Frontier Curve */}
                        <Scatter
                            name="Efficient Frontier"
                            data={frontierPoints}
                            fill="#3b82f6"
                            line={{ stroke: '#3b82f6', strokeWidth: 2.5 }}
                            lineType="monotone"
                            isAnimationActive={true}
                        />

                        {/* Individual Assets */}
                        <Scatter
                            name="Individual Assets"
                            data={individualAssets}
                            fill="#ec4899"
                            shape="diamond"
                            label={<CustomLabel />}
                            isAnimationActive={true}
                        />

                        {/* Optimal Portfolio */}
                        {optimalPortfolio.length > 0 && (
                            <Scatter
                                name="Optimal Portfolio (Max Sharpe)"
                                data={optimalPortfolio}
                                fill="#10b981"
                                shape="star"
                                isAnimationActive={true}
                            />
                        )}
                    </ScatterChart>
                </ResponsiveContainer>

                {/* Legend Explanation */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/30">
                        <div className="w-3 h-3 rounded-full bg-blue-500 mt-1" />
                        <div>
                            <p className="font-semibold text-white">Efficient Frontier</p>
                            <p className="text-xs text-slate-400">Optimal risk-return combinations</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/30">
                        <div className="w-3 h-3 rotate-45 bg-pink-500 mt-1" />
                        <div>
                            <p className="font-semibold text-white">Individual Assets</p>
                            <p className="text-xs text-slate-400">Risk-return of each asset</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/30">
                        <svg className="w-3 h-3 mt-1" viewBox="0 0 24 24" fill="#10b981">
                            <path d="M12 2L15 9L22 10L17 15L18 22L12 18L6 22L7 15L2 10L9 9L12 2Z" />
                        </svg>
                        <div>
                            <p className="font-semibold text-white">Optimal Portfolio</p>
                            <p className="text-xs text-slate-400">Maximum Sharpe ratio point</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
