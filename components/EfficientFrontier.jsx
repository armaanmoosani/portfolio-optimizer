import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

    const individualAssets = data.individual_assets.map(a => ({
        volatility: a.volatility * 100,
        return: a.return * 100,
        name: a.name,
        type: 'Individual Asset'
    }));

    const optimalPortfolio = data.optimal_portfolio ? [{
        volatility: data.optimal_portfolio.volatility * 100,
        return: data.optimal_portfolio.return * 100,
        sharpe_ratio: data.optimal_portfolio.sharpe_ratio || 0,
        weights: data.optimal_portfolio.weights || {},
        name: 'Optimal Portfolio',
        type: 'Optimal Portfolio'
    }] : [];

    // Calculate dynamic axis ranges
    const allPoints = [...frontierPoints, ...individualAssets, ...optimalPortfolio];
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
            const point = payload[0].payload;
            const hasWeights = point.weights && Object.keys(point.weights).length > 0;
            const topAllocations = hasWeights
                ? Object.entries(point.weights)
                    .filter(([_, weight]) => weight > 0.001)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5) // Show top 5 allocations
                : [];

            return (
                <div className="bg-slate-900/98 border-2 border-slate-600/50 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden" style={{ minWidth: '260px', maxWidth: '320px' }}>
                    {/* Header */}
                    <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-3 border-b border-slate-600/50">
                        <p className="text-white font-bold text-sm tracking-wide">
                            {point.name || point.type}
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

    // Cleaner asset labels
    const CustomLabel = (props) => {
        const { x, y, payload } = props;
        if (payload && payload.name) {
            return (
                <text
                    x={x}
                    y={y - 14}
                    fill="#cbd5e1"
                    fontSize={11}
                    fontWeight="700"
                    textAnchor="middle"
                    style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                >
                    {payload.name}
                </text>
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
                    Portfolio optimization across risk-return spectrum
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
                        <Legend
                            wrapperStyle={{ paddingTop: '14px' }}
                            iconType="circle"
                            iconSize={10}
                        />

                        {/* Efficient Frontier Curve */}
                        <Scatter
                            name="Efficient Frontier"
                            data={frontierPoints}
                            fill="#3b82f6"
                            line={{ stroke: '#3b82f6', strokeWidth: 2.5 }}
                            lineType="monotone"
                            isAnimationActive={true}
                            animationDuration={1000}
                            animationEasing="ease-out"
                        />

                        {/* Individual Assets */}
                        <Scatter
                            name="Individual Assets"
                            data={individualAssets}
                            fill="#ec4899"
                            shape="diamond"
                            label={<CustomLabel />}
                            isAnimationActive={true}
                            animationDuration={1000}
                        />

                        {/* Optimal Portfolio */}
                        {optimalPortfolio.length > 0 && (
                            <Scatter
                                name="Max Sharpe Portfolio"
                                data={optimalPortfolio}
                                fill="#10b981"
                                shape="star"
                                isAnimationActive={true}
                                animationDuration={1000}
                            />
                        )}
                    </ScatterChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-800/40 border border-slate-700/40 hover:bg-slate-800/60 transition-all group">
                        <div className="w-3.5 h-3.5 rounded-full bg-blue-500 mt-0.5 flex-shrink-0 shadow-lg shadow-blue-500/50" />
                        <div className="flex-1">
                            <p className="font-semibold text-white text-sm">Efficient Frontier</p>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">Optimal portfolios at each risk level</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-800/40 border border-slate-700/40 hover:bg-slate-800/60 transition-all group">
                        <div className="w-3.5 h-3.5 rotate-45 bg-pink-500 mt-0.5 flex-shrink-0 shadow-lg shadow-pink-500/50" />
                        <div className="flex-1">
                            <p className="font-semibold text-white text-sm">Individual Assets</p>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">Standalone risk-return profile</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-800/40 border border-slate-700/40 hover:bg-slate-800/60 transition-all group">
                        <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" viewBox="0 0 24 24" fill="#10b981">
                            <path d="M12 2L15 9L22 10L17 15L18 22L12 18L6 22L7 15L2 10L9 9L12 2Z" />
                        </svg>
                        <div className="flex-1">
                            <p className="font-semibold text-white text-sm">Max Sharpe Portfolio</p>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">Optimal risk-adjusted allocation</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
