import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, Label } from 'recharts';

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

    // Sort frontier points by return for correct line rendering (bottom to top)
    const sortedFrontierPoints = [...frontierPoints].sort((a, b) => a.return - b.return);

    // Enhanced professional tooltip
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length > 0) {
            // 1. Try to find the explicit "Max Sharpe" point or "Hit Area"
            let point = payload.find(p => p.name === "Max Sharpe Portfolio" || p.name === "Max Sharpe Hit Area")?.payload;

            // 2. If not found, check if the first payload point is "close enough" to optimal (fuzzy match)
            // This handles cases where Recharts snaps to a nearby frontier point
            if (!point && optimalPortfolio && payload[0]) {
                const p = payload[0].payload;
                // Fuzzy match: if return is within 0.5% and volatility within 0.5%
                const isClose = Math.abs(p.return - optimalPortfolio.return) < 0.5 &&
                    Math.abs(p.volatility - optimalPortfolio.volatility) < 0.5;
                if (isClose) {
                    point = optimalPortfolio;
                } else {
                    point = p;
                }
            } else if (!point) {
                point = payload[0].payload;
            }

            const hasWeights = point.weights && Object.keys(point.weights).length > 0;
            const topAllocations = hasWeights
                ? Object.entries(point.weights)
                    .filter(([_, weight]) => weight > 0.001)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                : [];

            // Determine title
            const isMaxSharpe = point === optimalPortfolio || (optimalPortfolio && point.return === optimalPortfolio.return && point.volatility === optimalPortfolio.volatility);

            return (
                <div className="bg-slate-900/98 border-2 border-slate-600/50 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden" style={{ minWidth: '260px', maxWidth: '320px' }}>
                    {/* Header */}
                    <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-3 border-b border-slate-600/50">
                        <p className="text-white font-bold text-sm tracking-wide">
                            {isMaxSharpe ? 'Max Sharpe Portfolio' : (point.name || 'Portfolio')}
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
        <div className="w-full h-full flex flex-col bg-slate-900/50 rounded-xl border border-slate-800 p-6 shadow-xl backdrop-blur-sm">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        Efficient Frontier
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            {frontierPoints.length} Portfolios
                        </span>
                    </h3>
                    <p className="text-slate-400 text-sm mt-1">Risk vs. Return Optimization</p>
                </div>
            </div>

            <div className="flex-1 w-full min-h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                        <XAxis
                            type="number"
                            dataKey="volatility"
                            name="Volatility"
                            unit="%"
                            stroke="#94a3b8"
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            tickFormatter={(value) => value.toFixed(1)}
                            label={{ value: 'Volatility (Risk)', position: 'bottom', offset: 0, fill: '#94a3b8', fontSize: 12 }}
                            domain={['auto', 'auto']}
                        />
                        <YAxis
                            type="number"
                            dataKey="return"
                            name="Return"
                            unit="%"
                            stroke="#94a3b8"
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            tickFormatter={(value) => value.toFixed(1)}
                            label={{ value: 'Expected Return', angle: -90, position: 'left', offset: 0, fill: '#94a3b8', fontSize: 12 }}
                            domain={['auto', 'auto']}
                        />
                        <ZAxis
                            type="number"
                            dataKey="sharpe_ratio"
                            range={[50, 400]}
                            name="Sharpe Ratio"
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#64748b', strokeWidth: 1.5 }} />

                        {/* Efficient Frontier Curve */}
                        <Scatter
                            name="Efficient Frontier"
                            data={sortedFrontierPoints}
                            fill="#3b82f6"
                            line={{ stroke: '#3b82f6', strokeWidth: 2.5 }}
                            lineType="monotone"
                            isAnimationActive={true}
                            animationDuration={1000}
                            animationEasing="ease-out"
                        />

                        {/* Optimal Portfolio Point - Visual Star */}
                        {optimalPortfolio && (
                            <Scatter
                                name="Max Sharpe Portfolio"
                                data={[optimalPortfolio]}
                                fill="#10b981"
                                shape="star"
                                isAnimationActive={true}
                                animationDuration={1000}
                            />
                        )}

                        {/* Optimal Portfolio Hit Area - Invisible but captures hover */}
                        {optimalPortfolio && (
                            <Scatter
                                name="Max Sharpe Hit Area"
                                data={[optimalPortfolio]}
                                fill="red"
                                opacity={0.01} // Almost invisible but definitely captures events
                                legendType="none"
                                shape={(props) => (
                                    <circle cx={props.cx} cy={props.cy} r={30} fill="red" fillOpacity={0.01} cursor="pointer" />
                                )}
                            />
                        )}

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
                                    offset={15}
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
