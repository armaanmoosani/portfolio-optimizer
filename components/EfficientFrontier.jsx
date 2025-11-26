import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, Label, Cell, Legend, LabelList, ErrorBar } from 'recharts';

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
        name: 'Efficient Frontier',
        type: 'frontier'
    }));

    const monteCarloPoints = (data.monte_carlo_points || []).map(p => ({
        volatility: p.volatility * 100,
        return: p.return * 100,
        sharpe_ratio: p.sharpe_ratio || 0,
        name: 'Feasible Set (Random Portfolios)',
        type: 'monte_carlo'
    }));

    const cmlPoints = (data.cml_points || []).map(p => ({
        volatility: p.volatility * 100,
        return: p.return * 100,
        name: 'Capital Market Line',
        type: 'cml'
    }));

    const assetPoints = (data.individual_assets || []).map(p => ({
        volatility: p.volatility * 100,
        return: p.return * 100,
        name: p.name,
        type: 'asset'
    }));

    // Find special points directly from the frontier data to ensure perfect consistency
    // This guarantees that the colored points are exactly on the line and have the correct data
    let maxSharpePoint = null;
    let minVolPoint = null;

    if (frontierPoints.length > 0) {
        // Find Max Sharpe
        maxSharpePoint = frontierPoints.reduce((prev, current) =>
            (prev.sharpe_ratio > current.sharpe_ratio) ? prev : current
        );

        // Find Min Volatility
        minVolPoint = frontierPoints.reduce((prev, current) =>
            (prev.volatility < current.volatility) ? prev : current
        );

        // Clone and override names/types for the special display
        maxSharpePoint = { ...maxSharpePoint, name: 'Max Sharpe Portfolio', type: 'optimal' };
        minVolPoint = { ...minVolPoint, name: 'Min Variance Portfolio', type: 'min_variance' };
    }

    // Calculate dynamic axis ranges
    const allPoints = [...frontierPoints, ...assetPoints, ...cmlPoints];
    // Don't include all Monte Carlo points in range calculation to avoid outliers skewing the view too much,
    // but include a sample to ensure most are visible

    const minVol = Math.min(...allPoints.map(p => p.volatility), 0); // Always include 0 for CML
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
        Math.floor((minRet - retPadding) / 5) * 5,
        Math.ceil((maxRet + retPadding) / 5) * 5
    ];

    // Enhanced professional tooltip
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length > 0) {
            // Handle multiple points (e.g. overlapping lines)
            const point = payload[0].payload;
            const isAsset = point.type === 'asset';
            const isMonteCarlo = point.type === 'monte_carlo';
            const isCML = point.type === 'cml';

            return (
                <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden" style={{ minWidth: '220px' }}>
                    {/* Header */}
                    <div className="bg-slate-800 px-4 py-2 border-b border-slate-700">
                        <p className="text-white font-bold text-sm tracking-wide">
                            {point.name}
                        </p>
                    </div>

                    {/* Metrics */}
                    <div className="p-4 space-y-2">
                        <div className="flex justify-between items-center gap-4">
                            <span className="text-slate-300 text-xs font-medium">Return</span>
                            <span className="text-emerald-400 font-mono font-bold text-sm">{point.return.toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between items-center gap-4">
                            <span className="text-slate-300 text-xs font-medium">Risk (Vol)</span>
                            <span className="text-sky-400 font-mono font-bold text-sm">{point.volatility.toFixed(2)}%</span>
                        </div>
                        {!isCML && point.sharpe_ratio !== undefined && (
                            <div className="flex justify-between items-center gap-4">
                                <span className="text-slate-300 text-xs font-medium">Sharpe</span>
                                <span className="text-amber-400 font-mono font-bold text-sm">{point.sharpe_ratio.toFixed(2)}</span>
                            </div>
                        )}

                        {/* Show weights if available */}
                        {(point.type === 'optimal' || point.type === 'min_variance' || point.weights) && (
                            <div className="pt-2 mt-2 border-t border-slate-700">
                                <p className="text-xs text-slate-400 mb-1">Top Holdings:</p>
                                {Object.entries(point.weights || {})
                                    .sort((a, b) => b[1] - a[1])
                                    .slice(0, 3)
                                    .map(([ticker, weight]) => (
                                        <div key={ticker} className="flex justify-between text-xs">
                                            <span className="text-slate-300">{ticker}</span>
                                            <span className="text-slate-200 font-mono">{(weight * 100).toFixed(1)}%</span>
                                        </div>
                                    ))
                                }
                            </div>
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
            <div className="p-6">
                <ResponsiveContainer width="100%" height={500}>
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                        <XAxis
                            type="number"
                            dataKey="volatility"
                            name="Volatility"
                            unit="%"
                            stroke="#94a3b8"
                            tick={{ fill: '#cbd5e1', fontSize: 11 }}
                            domain={volDomain}
                            tickCount={8}
                            label={{ value: 'Risk (Annualized Volatility %)', position: 'bottom', offset: 0, fill: '#94a3b8', fontSize: 12 }}
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
                            label={{ value: 'Expected Return (Annualized %)', angle: -90, position: 'left', offset: 0, fill: '#94a3b8', fontSize: 12 }}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />

                        {/* 1. Feasible Set (Monte Carlo Cloud) - Background */}
                        <Scatter
                            name="Feasible Set"
                            data={monteCarloPoints}
                            fill="#64748b"
                            opacity={0.15}
                            shape="circle"
                        />

                        {/* 2. Capital Market Line (CML) */}
                        <Scatter
                            name="Capital Market Line"
                            data={cmlPoints}
                            line={{ stroke: '#94a3b8', strokeWidth: 2, strokeDasharray: '5 5' }}
                            shape={() => null} // No dots, just line
                            legendType="none"
                        />

                        {/* 3. Efficient Frontier Curve */}
                        <Scatter
                            name="Efficient Frontier"
                            data={frontierPoints}
                            line={{ stroke: '#3b82f6', strokeWidth: 3 }}
                            lineType="monotone"
                            shape={() => null} // No dots on the line itself for cleaner look
                        />

                        {/* 4. Individual Assets */}
                        <Scatter
                            name="Individual Assets"
                            data={assetPoints}
                            fill="#c084fc" // Purple
                            shape="circle"
                        >
                            {assetPoints.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill="#c084fc" stroke="#fff" strokeWidth={1} />
                            ))}
                            <LabelList dataKey="name" position="top" style={{ fill: '#e2e8f0', fontSize: '10px' }} />
                        </Scatter>

                        {/* 5. Optimal Portfolio (Interactive Point) */}
                        {maxSharpePoint && (
                            <Scatter
                                name="Max Sharpe Portfolio"
                                data={[maxSharpePoint]}
                                fill="#10b981"
                                shape="star"
                                zAxisId={0}
                            >
                                <ErrorBar dataKey="error" width={0} strokeWidth={0} />
                            </Scatter>
                        )}

                        {/* 6. Min Variance Portfolio (Interactive Point) */}
                        {minVolPoint && (
                            <Scatter
                                name="Min Variance Portfolio"
                                data={[minVolPoint]}
                                fill="#f59e0b" // Amber/Yellow
                                shape="diamond"
                                zAxisId={0}
                            />
                        )}

                        {/* 7. Optimal Portfolio Label (Visual Only) */}
                        {maxSharpePoint && (
                            <ReferenceDot
                                x={maxSharpePoint.volatility}
                                y={maxSharpePoint.return}
                                r={6}
                                fill="#10b981"
                                stroke="#fff"
                                strokeWidth={2}
                                isFront={true}
                                style={{ pointerEvents: 'none' }}
                            >
                                <Label
                                    value="Max Sharpe"
                                    position="top"
                                    offset={10}
                                    fill="#10b981"
                                    fontSize={12}
                                    fontWeight="bold"
                                />
                            </ReferenceDot>
                        )}

                        {/* 8. Min Variance Label (Visual Only) */}
                        {minVolPoint && (
                            <ReferenceDot
                                x={minVolPoint.volatility}
                                y={minVolPoint.return}
                                r={5}
                                fill="#f59e0b"
                                stroke="#fff"
                                strokeWidth={2}
                                isFront={true}
                                style={{ pointerEvents: 'none' }}
                            >
                                <Label
                                    value="Min Vol"
                                    position="bottom"
                                    offset={10}
                                    fill="#f59e0b"
                                    fontSize={11}
                                    fontWeight="bold"
                                />
                            </ReferenceDot>
                        )}
                    </ScatterChart>
                </ResponsiveContainer>

                {/* Info Note */}
                <div className="mt-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700/40 flex gap-4 text-xs text-slate-400">
                    <div className="flex-1">
                        <strong className="text-slate-200 block mb-1">Capital Market Line (CML)</strong>
                        Represents the best possible return for a given level of risk when combining the risk-free asset with the optimal risky portfolio.
                    </div>
                    <div className="flex-1">
                        <strong className="text-slate-200 block mb-1">Feasible Set</strong>
                        The gray cloud shows thousands of possible portfolios. The Efficient Frontier (blue line) represents the upper boundary (best possible portfolios).
                    </div>
                </div>
            </div>
        </div>
    );
}
