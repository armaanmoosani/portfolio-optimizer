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

    const monteCarloPoints = (data.monte_carlo_points || []).map(p => ({
        volatility: p.volatility * 100,
        return: p.return * 100,
        sharpe_ratio: p.sharpe_ratio || 0,
        weights: p.weights || {},
        type: 'Feasible Set'
    }));

    const cmlPoints = (data.cml_points || []).map(p => ({
        volatility: p.volatility * 100,
        return: p.return * 100,
        type: 'Capital Market Line'
    }));

    const assetPoints = (data.individual_assets || []).map(p => ({
        volatility: p.volatility * 100,
        return: p.return * 100,
        name: p.name,
        type: 'Individual Asset'
    }));

    // Find special points directly from frontier data
    let maxSharpePoint = null;
    let minVolPoint = null;

    if (frontierPoints.length > 0) {
        maxSharpePoint = frontierPoints.reduce((prev, current) =>
            (prev.sharpe_ratio > current.sharpe_ratio) ? prev : current
        );
        minVolPoint = frontierPoints.reduce((prev, current) =>
            (prev.volatility < current.volatility) ? prev : current
        );
    }

    // Calculate dynamic axis ranges
    const allPoints = [...frontierPoints, ...assetPoints, ...cmlPoints];
    const minVol = Math.min(...allPoints.map(p => p.volatility), 0);
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
                    .slice(0, 5)
                : [];

            return (
                <div className="bg-slate-900/98 border-2 border-slate-600/50 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden" style={{ minWidth: '260px', maxWidth: '320px' }}>
                    {/* Header */}
                    <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-3 border-b border-slate-600/50">
                        <p className="text-white font-bold text-sm tracking-wide">
                            {point.name || point.type || 'Portfolio'}
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
        <div className="rounded-2xl border border-slate-700/40 overflow-hidden bg-slate-900/40 shadow-lg">
            {/* Header */}
            <div className="bg-slate-800/40 px-6 py-5 border-b border-slate-700/30 backdrop-blur-sm flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-white text-xl tracking-tight">Efficient Frontier Analysis</h3>
                    <p className="text-sm text-slate-400 mt-1.5">
                        Risk-Return profile with Capital Market Line & Feasible Set
                    </p>
                </div>
                <div className="flex gap-4 text-xs font-medium">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-slate-600/30 border border-slate-500"></div>
                        <span className="text-slate-400">Feasible Set</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-0.5 bg-slate-400 border-t border-dashed border-slate-400"></div>
                        <span className="text-slate-400">CML</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-400"></div>
                        <span className="text-slate-400">Assets</span>
                    </div>
                </div>
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
                                value: 'Risk (Annualized Volatility %)',
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
                                value: 'Expected Return (Annualized %)',
                                angle: -90,
                                position: 'left',
                                offset: 40,
                                fill: '#e2e8f0',
                                fontSize: 13,
                                fontWeight: 600
                            }}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#64748b', strokeWidth: 1.5 }} />

                        {/* 1. Feasible Set (Monte Carlo Cloud) */}
                        {monteCarloPoints.length > 0 && (
                            <Scatter
                                name="Feasible Set"
                                data={monteCarloPoints}
                                fill="#64748b"
                                opacity={0.15}
                                shape="circle"
                                isAnimationActive={false}
                            />
                        )}

                        {/* 2. Capital Market Line */}
                        {cmlPoints.length > 0 && (
                            <Scatter
                                name="Capital Market Line"
                                data={cmlPoints}
                                line={{ stroke: '#94a3b8', strokeWidth: 2, strokeDasharray: '5 5' }}
                                shape={() => null}
                                isAnimationActive={false}
                            />
                        )}

                        {/* 3. Efficient Frontier Curve with colored special points */}
                        <Scatter
                            name="Efficient Frontier"
                            data={frontierPoints}
                            line={{ stroke: '#3b82f6', strokeWidth: 2.5 }}
                            lineType="monotone"
                            isAnimationActive={true}
                            animationDuration={1000}
                            animationEasing="ease-out"
                        >
                            {frontierPoints.map((entry, index) => {
                                // Check if this is max sharpe or min vol point
                                const isMaxSharpe = maxSharpePoint &&
                                    Math.abs(entry.volatility - maxSharpePoint.volatility) < 0.01 &&
                                    Math.abs(entry.return - maxSharpePoint.return) < 0.01;
                                const isMinVol = minVolPoint &&
                                    Math.abs(entry.volatility - minVolPoint.volatility) < 0.01 &&
                                    Math.abs(entry.return - minVolPoint.return) < 0.01;

                                return (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={isMaxSharpe ? '#10b981' : isMinVol ? '#f59e0b' : '#3b82f6'}
                                        stroke={isMaxSharpe || isMinVol ? '#fff' : 'none'}
                                        strokeWidth={isMaxSharpe || isMinVol ? 2 : 0}
                                        r={isMaxSharpe ? 8 : isMinVol ? 7 : 3}
                                    />
                                );
                            })}
                        </Scatter>

                        {/* 4. Individual Assets */}
                        {assetPoints.length > 0 && (
                            <Scatter
                                name="Individual Assets"
                                data={assetPoints}
                                fill="#c084fc"
                                shape="circle"
                            >
                                {assetPoints.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill="#c084fc" stroke="#fff" strokeWidth={1} />
                                ))}
                            </Scatter>
                        )}

                        {/* Labels for special points */}
                        {maxSharpePoint && (
                            <ReferenceDot
                                x={maxSharpePoint.volatility}
                                y={maxSharpePoint.return}
                                r={0}
                                isFront={true}
                            >
                                <Label
                                    value="Max Sharpe"
                                    position="top"
                                    fill="#10b981"
                                    fontSize={12}
                                    fontWeight="bold"
                                    offset={15}
                                />
                            </ReferenceDot>
                        )}

                        {minVolPoint && (
                            <ReferenceDot
                                x={minVolPoint.volatility}
                                y={minVolPoint.return}
                                r={0}
                                isFront={true}
                            >
                                <Label
                                    value="Min Vol"
                                    position="bottom"
                                    fill="#f59e0b"
                                    fontSize={11}
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
                                Hover over any point to see the portfolio allocation, expected return, risk, and Sharpe ratio.
                                The <span className="text-emerald-400 font-semibold">green point</span> marks maximum Sharpe ratio (best risk-adjusted returns).
                                The <span className="text-amber-400 font-semibold">yellow point</span> marks minimum volatility (lowest risk).
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
