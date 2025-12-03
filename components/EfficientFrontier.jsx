import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, Label, Cell, ReferenceLine } from 'recharts';

export default function EfficientFrontier({ data }) {
    if (!data || !data.frontier_points || data.frontier_points.length === 0) {
        return (
            <div className="flex items-center justify-center h-96 text-slate-400">
                No efficient frontier data available
            </div>
        );
    }

    // 1. Format Frontier Points (The Blue Curve)
    const frontierPoints = data.frontier_points.map(p => ({
        volatility: p.volatility * 100,
        return: p.return * 100,
        sharpe_ratio: p.sharpe_ratio || 0,
        weights: p.weights || {},
        name: 'Efficient Frontier',
        type: 'Efficient Frontier'
    })).sort((a, b) => a.return - b.return);

    // 2. Format Monte Carlo Points (The Cloud)
    // Downsample if too many points to improve performance
    const monteCarloPoints = (data.monte_carlo_points || []).slice(0, 1000).map(p => ({
        volatility: p.volatility * 100,
        return: p.return * 100,
        sharpe_ratio: p.sharpe_ratio || 0,
        weights: p.weights || {},
        name: 'Feasible Portfolio',
        type: 'Monte Carlo'
    }));

    // 3. Format Individual Assets (The Dots)
    const individualAssets = (data.individual_assets || []).map(p => ({
        volatility: p.volatility * 100,
        return: p.return * 100,
        name: p.name, // Ticker
        type: 'Asset'
    }));

    // 4. Key Portfolios
    const optimalPortfolio = data.optimal_portfolio ? {
        volatility: data.optimal_portfolio.volatility * 100,
        return: data.optimal_portfolio.return * 100,
        sharpe_ratio: data.optimal_portfolio.sharpe_ratio || 0,
        weights: data.optimal_portfolio.weights || {},
        name: 'Optimal Portfolio',
        type: 'Optimal Portfolio'
    } : null;

    const minVariancePortfolio = data.min_variance_portfolio ? {
        volatility: data.min_variance_portfolio.volatility * 100,
        return: data.min_variance_portfolio.return * 100,
        sharpe_ratio: data.min_variance_portfolio.sharpe_ratio || 0,
        weights: data.min_variance_portfolio.weights || {},
        name: 'Minimum Variance Portfolio',
        type: 'Minimum Variance Portfolio'
    } : null;

    // DEBUG LOGGING
    console.log("DEBUG: optimalPortfolio:", optimalPortfolio);
    console.log("DEBUG: minVariancePortfolio:", minVariancePortfolio);
    console.log("DEBUG: Are they the same object?", optimalPortfolio === minVariancePortfolio);
    console.log("DEBUG: Raw data.optimal_portfolio:", data.optimal_portfolio);
    console.log("DEBUG: Raw data.min_variance_portfolio:", data.min_variance_portfolio);

    // 5. Capital Market Line (CML)
    // Use backend points if available, otherwise calculate
    let cmlPoints = [];
    if (data.cml_points && data.cml_points.length > 0) {
        cmlPoints = data.cml_points.map(p => ({
            volatility: p.volatility * 100,
            return: p.return * 100,
            type: 'CML'
        })).sort((a, b) => a.volatility - b.volatility);
    } else if (optimalPortfolio) {
        // Fallback: Estimate Rf from CML data or assume 4.5%
        const rfRate = (data.cml_points && data.cml_points[0]) ? data.cml_points[0].return * 100 : 4.5;
        const optVol = optimalPortfolio.volatility;
        const optRet = optimalPortfolio.return;
        const slope = (optRet - rfRate) / optVol;

        cmlPoints = [
            { volatility: 0, return: rfRate, type: 'CML' },
            { volatility: optVol, return: optRet, type: 'CML' },
            { volatility: optVol * 1.5, return: rfRate + slope * (optVol * 1.5), type: 'CML' }
        ];
    }

    // 6. Calculate Axis Domains (Auto-Scaling)
    // Include ALL points to ensure nothing is cut off
    const allPoints = [
        ...frontierPoints,
        ...monteCarloPoints,
        ...individualAssets,
        ...(optimalPortfolio ? [optimalPortfolio] : []),
        ...(minVariancePortfolio ? [minVariancePortfolio] : []),
        ...cmlPoints
    ];

    const minVol = Math.min(...allPoints.map(p => p.volatility));
    const maxVol = Math.max(...allPoints.map(p => p.volatility));
    const minRet = Math.min(...allPoints.map(p => p.return));
    const maxRet = Math.max(...allPoints.map(p => p.return));

    // Add padding (10% margin)
    const volPadding = (maxVol - minVol) * 0.1;
    const retPadding = (maxRet - minRet) * 0.1;

    const volDomain = [
        Math.max(0, Math.floor((minVol - volPadding) * 5) / 5), // Round down to nearest 0.2
        Math.ceil((maxVol + volPadding) * 5) / 5
    ];

    const retDomain = [
        Math.floor((minRet - retPadding) / 5) * 5, // Round down to nearest 5
        Math.ceil((maxRet + retPadding) / 5) * 5
    ];

    // Custom Tooltip
    const CustomTooltip = ({ active, payload, coordinate }) => {
        if (active && payload && payload.length > 0) {
            // DEBUG: Log payload to find pixel coordinates
            // console.log("PAYLOAD ITEM KEYS:", Object.keys(payload[0]));

            // Check if both portfolios are in the payload
            const optimalItem = payload.find(p => p.payload?.type === 'Optimal Portfolio');
            const minVarItem = payload.find(p => p.payload?.type === 'Minimum Variance Portfolio');

            let point;

            if (optimalItem && minVarItem && coordinate) {
                // Both detected: calculate distance using PIXEL coordinates
                // Recharts Scatter items usually have cx/cy or x/y for screen coordinates
                const getCoords = (item) => ({
                    x: item.cx ?? item.x ?? 0,
                    y: item.cy ?? item.y ?? 0
                });

                const optCoords = getCoords(optimalItem);
                const minCoords = getCoords(minVarItem);

                const distOptimal = Math.sqrt(
                    Math.pow(optCoords.x - coordinate.x, 2) +
                    Math.pow(optCoords.y - coordinate.y, 2)
                );

                const distMinVar = Math.sqrt(
                    Math.pow(minCoords.x - coordinate.x, 2) +
                    Math.pow(minCoords.y - coordinate.y, 2)
                );

                console.log(`Distances - Optimal: ${distOptimal.toFixed(2)}px, MinVar: ${distMinVar.toFixed(2)}px`);

                point = distMinVar < distOptimal ? minVarItem.payload : optimalItem.payload;
            } else {
                // Only one or neither: filter and sort by priority
                const seen = new Set();
                const filteredPayload = payload.filter(p => {
                    if (p.payload?.type === 'CML') return false;
                    const key = `${p.payload?.type}-${p.payload?.volatility}-${p.payload?.return}`;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });

                const sortedPayload = [...filteredPayload].sort((a, b) => {
                    const typePriority = {
                        'Minimum Variance Portfolio': 5,
                        'Optimal Portfolio': 5,
                        'Asset': 3,
                        'Efficient Frontier': 2,
                        'Monte Carlo': 1
                    };
                    return (typePriority[b.payload.type] || 0) - (typePriority[a.payload.type] || 0);
                });
                point = sortedPayload[0]?.payload;
            }
            if (!point) return null; // If no point is selected after filtering and sorting
            if (point.type === 'CML') return null; // Don't show tooltip for CML line

            // Determine badge type
            let badge = null;
            if (point.type === 'Optimal Portfolio') {
                badge = <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded font-bold shadow-sm">Max Sharpe</span>;
            } else if (point.type === 'Minimum Variance Portfolio') {
                badge = <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded font-bold shadow-sm">Min Vol</span>;
            } else if (point.type === 'Asset') {
                badge = <span className="text-xs bg-slate-600 text-white px-2 py-0.5 rounded">Asset</span>;
            }

            return (
                <div className="bg-slate-900/95 border border-slate-700/50 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden z-50" style={{ minWidth: '240px' }}>
                    <div className="bg-slate-800/80 px-4 py-3 border-b border-slate-700/50 flex justify-between items-center">
                        <p className="text-white font-bold text-sm tracking-wide truncate pr-2">
                            {point.name || point.type}
                        </p>
                        {badge}
                    </div>

                    {/* Metrics */}
                    <div className="p-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-xs font-medium">Expected Return</span>
                            <span className="text-emerald-400 font-mono font-bold text-sm">{point.return.toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-xs font-medium">Volatility (Risk)</span>
                            <span className="text-sky-400 font-mono font-bold text-sm">{point.volatility.toFixed(2)}%</span>
                        </div>
                        {point.sharpe_ratio !== undefined && point.sharpe_ratio !== 0 && (
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 text-xs font-medium">Sharpe Ratio</span>
                                <span className="text-amber-400 font-mono font-bold text-sm">{point.sharpe_ratio.toFixed(3)}</span>
                            </div>
                        )}

                        {/* Allocations (Only for portfolios) */}
                        {point.weights && Object.keys(point.weights).length > 0 && (
                            <>
                                <div className="border-t border-slate-700/50 my-3" />
                                <div>
                                    <p className="text-slate-500 font-semibold mb-2.5 text-[10px] uppercase tracking-wider">Top Allocations</p>
                                    <div className="space-y-2">
                                        {Object.entries(point.weights)
                                            .sort(([, a], [, b]) => b - a)
                                            .slice(0, 5)
                                            .map(([ticker, weight]) => (
                                                <div key={ticker} className="flex items-center gap-2.5">
                                                    <span className="text-slate-300 font-medium text-xs w-10">
                                                        {ticker}
                                                    </span>
                                                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-blue-500 rounded-full"
                                                            style={{ width: `${(weight * 100).toFixed(1)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-blue-400 font-mono text-xs font-bold w-10 text-right">
                                                        {(weight * 100).toFixed(0)}%
                                                    </span>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            );
        }
    };

    return (
        <div className="rounded-2xl border border-slate-700/40 overflow-hidden bg-gradient-to-br from-slate-900/40 to-slate-800/20 shadow-xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800/80 to-slate-700/60 px-6 py-5 border-b border-slate-600/30 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-white text-xl tracking-tight">Efficient Frontier</h3>
                        <p className="text-sm text-slate-300 mt-1.5">
                            Risk vs. Return Analysis
                        </p>
                    </div>

                    {/* Key Statistics Display */}
                    {(optimalPortfolio || minVariancePortfolio) && (
                        <div className="flex gap-6">
                            {optimalPortfolio && (
                                <div className="text-right hidden sm:block">
                                    <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">Max Sharpe</div>
                                    <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">
                                        {optimalPortfolio.sharpe_ratio.toFixed(2)}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Chart */}
            <div className="p-4 sm:p-8">
                <ResponsiveContainer width="100%" height={500}>
                    <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                        <XAxis
                            type="number"
                            dataKey="volatility"
                            name="Volatility"
                            unit="%"
                            stroke="#94a3b8"
                            strokeWidth={2}
                            tick={{ fill: '#e2e8f0', fontSize: 12, fontWeight: 500 }}
                            tickLine={{ stroke: '#94a3b8', strokeWidth: 2 }}
                            domain={volDomain}
                            tickCount={8}
                            label={{
                                value: 'Annualized Volatility (Risk)',
                                position: 'bottom',
                                offset: 0,
                                fill: '#f8fafc',
                                fontSize: 14,
                                fontWeight: 600,
                                dy: 25
                            }}
                        />
                        <YAxis
                            type="number"
                            dataKey="return"
                            name="Return"
                            unit="%"
                            stroke="#94a3b8"
                            strokeWidth={2}
                            tick={{ fill: '#e2e8f0', fontSize: 12, fontWeight: 500 }}
                            tickLine={{ stroke: '#94a3b8', strokeWidth: 2 }}
                            domain={retDomain}
                            tickCount={8}
                            label={{
                                value: 'Annualized Return',
                                angle: -90,
                                position: 'left',
                                offset: 10,
                                fill: '#f8fafc',
                                fontSize: 14,
                                fontWeight: 600,
                                dx: -25
                            }}
                        />
                        <Tooltip
                            content={<CustomTooltip />}
                            cursor={{ strokeDasharray: '3 3', stroke: '#64748b', strokeWidth: 1 }}
                            allowEscapeViewBox={{ x: true, y: true }}
                            wrapperStyle={{ zIndex: 100 }}
                        />

                        {/* 1. Monte Carlo Cloud (Background) */}
                        <Scatter
                            name="Feasible Set"
                            data={monteCarloPoints}
                            fill="#64748b"
                            opacity={0.15}
                            shape="circle"
                            isAnimationActive={false}
                        />

                        {/* 2. Capital Market Line (CML) - Reference Line */}
                        {cmlPoints.length > 1 && (
                            <>
                                <ReferenceLine
                                    segment={[
                                        { x: cmlPoints[0].volatility, y: cmlPoints[0].return },
                                        { x: cmlPoints[cmlPoints.length - 1].volatility, y: cmlPoints[cmlPoints.length - 1].return }
                                    ]}
                                    stroke="#ffffff"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    ifOverflow="extendDomain"
                                />
                                <ReferenceDot
                                    x={0}
                                    y={cmlPoints[0].return}
                                    r={4}
                                    fill="#a855f7"
                                    stroke="#fff"
                                    strokeWidth={2}
                                    isFront={true}
                                >
                                    <Label
                                        value="Risk Free"
                                        position="right"
                                        fill="#a855f7"
                                        fontSize={11}
                                        fontWeight="bold"
                                        offset={10}
                                    />
                                </ReferenceDot>
                            </>
                        )}

                        {/* 3. Efficient Frontier Curve */}
                        <Scatter
                            name="Efficient Frontier"
                            data={frontierPoints}
                            line={{ stroke: '#3b82f6', strokeWidth: 4 }}
                            lineType="natural"
                            shape={false}
                            stroke="#3b82f6"
                            isAnimationActive={false}
                        />

                        {/* 4. Individual Assets */}
                        <Scatter
                            name="Assets"
                            data={individualAssets}
                            fill="#f8fafc"
                            shape="circle"
                        >
                            {individualAssets.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill="#f8fafc" stroke="#475569" />
                            ))}
                            <LabelList dataKey="name" position="top" offset={5} style={{ fill: '#cbd5e1', fontSize: '10px', fontWeight: 'bold' }} />
                        </Scatter>

                        {/* 5. Optimal Portfolio (Star) */}
                        {optimalPortfolio && (
                            <ReferenceDot
                                x={optimalPortfolio.volatility}
                                y={optimalPortfolio.return}
                                r={6}
                                fill="#10b981"
                                stroke="#fff"
                                strokeWidth={2}
                                isFront={true}
                            >
                                <Label
                                    value="Max Sharpe"
                                    position="top"
                                    fill="#10b981"
                                    fontSize={12}
                                    fontWeight="bold"
                                    offset={10}
                                />
                            </ReferenceDot>
                        )}

                        {/* 6. Min Variance Portfolio (Diamond) */}
                        {minVariancePortfolio && (
                            <ReferenceDot
                                x={minVariancePortfolio.volatility}
                                y={minVariancePortfolio.return}
                                r={5}
                                fill="#f59e0b"
                                stroke="#fff"
                                strokeWidth={2}
                                isFront={true}
                            >
                                <Label
                                    value="Min Vol"
                                    position="bottom"
                                    fill="#f59e0b"
                                    fontSize={11}
                                    fontWeight="bold"
                                    offset={10}
                                />
                            </ReferenceDot>
                        )}

                        {/* 7. Invisible Scatter for Tooltips (Optimal & MinVar) */}
                        {optimalPortfolio && (
                            <Scatter
                                name="Optimal Portfolio"
                                data={[optimalPortfolio]}
                                fill="rgba(255,255,255,0.01)"
                                stroke="none"
                                shape="circle"
                                legendType="none"
                                style={{ pointerEvents: 'all' }}
                            >
                                <Cell r={4} />
                            </Scatter>
                        )}
                        {minVariancePortfolio && (
                            <Scatter
                                name="Minimum Variance Portfolio"
                                data={[minVariancePortfolio]}
                                fill="rgba(255,255,255,0.01)"
                                stroke="none"
                                shape="circle"
                                legendType="none"
                                style={{ pointerEvents: 'all' }}
                            >
                                <Cell r={4} />
                            </Scatter>
                        )}
                    </ScatterChart>
                </ResponsiveContainer>

                {/* Legend / Info */}
                <div className="mt-6 flex flex-wrap gap-4 justify-center text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 border border-white"></div>
                        <span>Max Sharpe Portfolio</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500 border border-white"></div>
                        <span>Min Variance Portfolio</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-0.5 bg-blue-500"></div>
                        <span>Efficient Frontier</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-0.5 bg-slate-400 border-dashed border-t border-slate-400"></div>
                        <span>Capital Market Line (CML)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-slate-100 border border-slate-600"></div>
                        <span>Individual Assets</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-slate-600 opacity-20"></div>
                        <span>Feasible Portfolios</span>
                    </div>
                </div>
            </div >
        </div >
    );
}

// Helper for labels
import { LabelList } from 'recharts';