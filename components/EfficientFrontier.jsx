import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, Label, Cell } from 'recharts';

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
        volatility: p.volatility * 100,
        return: p.return * 100,
        sharpe_ratio: p.sharpe_ratio || 0,
        weights: p.weights || {},
        type: 'Efficient Frontier'
    }));

    const optimalPortfolio = data.optimal_portfolio ? {
        volatility: data.optimal_portfolio.volatility * 100,
        return: data.optimal_portfolio.return * 100,
        sharpe_ratio: data.optimal_portfolio.sharpe_ratio || 0,
        weights: data.optimal_portfolio.weights || {},
        name: 'Optimal Portfolio',
        type: 'Optimal Portfolio'
    } : null;

    // Calculate dynamic axis ranges
    const allPoints = optimalPortfolio ? [...frontierPoints, optimalPortfolio] : frontierPoints;
    const minVol = Math.min(...allPoints.map(p => p.volatility));
    const maxVol = Math.max(...allPoints.map(p => p.volatility));
    const minRet = Math.min(...allPoints.map(p => p.return));
    const maxRet = Math.max(...allPoints.map(p => p.return));

    const volPadding = (maxVol - minVol) * 0.15;
    const retPadding = (maxRet - minRet) * 0.15;

    const volDomain = [
        Math.max(0, Math.floor((minVol - volPadding) * 5) / 5),
        Math.ceil((maxVol + volPadding) * 5) / 5
    ];

    const retDomain = [
        Math.floor((minRet - retPadding) / 10) * 10,
        Math.ceil((maxRet + retPadding) / 10) * 10
    ];

    // Enhanced professional tooltip
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length > 0) {
            // Prioritize the Max Sharpe point if it's in the payload (handling overlapping points)
            const maxSharpePoint = payload.find(p => p.name === "Max Sharpe Portfolio");
            const point = maxSharpePoint ? maxSharpePoint.payload : payload[0].payload;

            const hasWeights = point.weights && Object.keys(point.weights).length > 0;
            const topAllocations = hasWeights
                ? Object.entries(point.weights)
                    .filter(([_, weight]) => weight > 0.001)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                : [];

            return (
                <div className="bg-slate-900/98 border-2 border-slate-600/50 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden" style={{ minWidth: '260px', maxWidth: '320px' }}>
                    {/* Header */}
                    <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-3 border-b border-slate-600/50">
                        <p className="text-white font-bold text-sm tracking-wide">
                            {maxSharpePoint ? 'Max Sharpe Portfolio' : (point.name || 'Portfolio')}
                        </p>
                    </div>

                    {/* Metrics */}
                    <div className="p-4 space-y-2.5">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-300 text-xs font-medium">Expected Return</span>
                            <span className="text-emerald-400 font-mono font-bold text-sm">{point.return.toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-300 text-xs font-medium">Std. Deviation</span>
                            <span className="text-sky-400 font-mono font-bold text-sm">{point.volatility.toFixed(2)}%</span>
                        </div>
                        {point.sharpe_ratio !== undefined && (
                            <div className="flex justify-between items-center">
                                <span className="text-slate-300 text-xs font-medium">Sharpe Ratio</span>
                                <span className="text-amber-400 font-mono font-bold text-sm">{point.sharpe_ratio.toFixed(3)}</span>
                            </div>
                        )}

                        {/* Allocations */}
                        {topAllocations.length > 0 && (
                            <>
                                <div className="border-t border-slate-700/50 my-3" />
                                <div>
                                    <p className="text-slate-400 font-semibold mb-2.5 text-xs uppercase tracking-wider">Top Allocations</p>
                                    <div className="space-y-2">
                                        {topAllocations.map(([ticker, weight]) => (
                                            <div key={ticker} className="flex items-center gap-2.5">
                                                <span className="text-slate-200 font-semibold text-xs w-12">{ticker}</span>
                                                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                                                        style={{ width: `${(weight * 100).toFixed(1)}%` }}
                                                    />
                                                </div>
                                                <span className="text-blue-400 font-mono text-xs font-bold w-12 text-right">
                                                    {(weight * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    {Object.keys(point.weights).length > 5 && (
                                        <p className="text-slate-500 text-xs mt-2 italic">
                                            +{Object.keys(point.weights).length - 5} more assets
                                        </p>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="rounded-2xl border border-slate-700/40 overflow-hidden bg-gradient-to-br from-slate-900/40 to-slate-800/20 shadow-xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800/80 to-slate-700/60 px-6 py-5 border-b border-slate-600/30 backdrop-blur-sm">
                <h3 className="font-bold text-white text-xl tracking-tight">Efficient Frontier</h3>
                <p className="text-sm text-slate-300 mt-1.5">
                    Portfolio optimization curve with {frontierPoints.length} optimal allocations
                </p>
            </div>

            {/* Chart */}
            <div className="p-8">
                <ResponsiveContainer width="100%" height={500}>
                    <ScatterChart margin={{ top: 10, right: 80, bottom: 60, left: 60 }}>
                        <CartesianGrid strokeDasharray="4 4" stroke="#475569" opacity={0.25} />
                        <XAxis
                            type="number"
                            dataKey="volatility"
                            name="Volatility"
                            unit="%"
                            stroke="#94a3b8"
                            tick={{ fill: '#cbd5e1', fontSize: 11 }}
                            domain={volDomain}
                            tickCount={10}
                            label={{
                                value: 'Standard Deviation (Risk) %',
                                position: 'bottom',
                                offset: 40,
                                fill: '#e2e8f0',
                                fontSize: 13,
                                fontWeight: 600
                            }}
                        />
                        <YAxis
                            type="number"
                            dataKey="return"
                            name="Return"
                            unit="%"
                            stroke="#94a3b8"
                            tick={{ fill: '#cbd5e1', fontSize: 11 }}
                            domain={retDomain}
                            tickCount={8}
                            label={{
                                value: 'Expected Return %',
                                angle: -90,
                                position: 'left',
                                offset: 40,
                                fill: '#e2e8f0',
                                fontSize: 13,
                                fontWeight: 600
                            }}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#64748b', strokeWidth: 1.5 }} />

                        {/* Efficient Frontier Curve & Points */}
                        <Scatter
                            name="Efficient Frontier"
                            data={frontierPoints}
                            line={{ stroke: '#3b82f6', strokeWidth: 2.5 }}
                            lineType="monotone"
                            isAnimationActive={true}
                            animationDuration={1000}
                            animationEasing="ease-out"
                        >
                            {frontierPoints.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.name === 'Max Sharpe Portfolio' ? '#10b981' : '#3b82f6'}
                                    stroke={entry.name === 'Max Sharpe Portfolio' ? '#10b981' : 'none'}
                                />
                            ))}
                        </Scatter>

                        {/* Label for Optimal Portfolio */}
                        {optimalPortfolio && (
                            <ReferenceDot
                                x={optimalPortfolio.volatility}
                                y={optimalPortfolio.return}
                                r={0}
                                isFront={true}
                            >
                                <Label
                                    value="Max Sharpe Ratio"
                                    position="top"
                                    fill="#10b981"
                                    fontSize={12}
                                    fontWeight="bold"
                                    offset={25} // Increased offset to prevent overlap with points
                                />
                            </ReferenceDot>
                        )}
                    </ScatterChart>
                </ResponsiveContainer>

                {/* Info Note */}
                <div className="mt-6 p-4 rounded-xl bg-slate-800/40 border border-slate-700/40">
                    <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div>
                            <p className="font-semibold text-white text-sm">How to Use</p>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                Hover over any point on the curve to see the portfolio allocation, expected return, risk, and Sharpe ratio.
                                The <span className="text-emerald-400 font-semibold">green star</span> marks the portfolio with the maximum Sharpe ratio (optimal risk-adjusted returns).
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
