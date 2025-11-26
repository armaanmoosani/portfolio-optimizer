import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, Label } from 'recharts';

export default function EfficientFrontier({ data }) {
    if (!data || !data.frontier_points || data.frontier_points.length === 0) {
        return (
            <div className="flex items-center justify-center h-96 text-slate-400 text-sm">
                No efficient frontier data available
            </div>
        );
    }

    // ================================================================
    // SINGLE DATASET APPROACH - All points in one array
    // This prevents Recharts from creating separate coordinate systems
    // ================================================================

    const allPoints = [];

    // Add frontier points
    data.frontier_points.forEach((p, idx) => {
        allPoints.push({
            x: p.volatility * 100,
            y: p.return * 100,
            sharpe: p.sharpe_ratio || 0,
            weights: p.weights || {},
            type: 'frontier',
            id: `f-${idx}`
        });
    });

    // Add Monte Carlo points
    (data.monte_carlo_points || []).forEach((p, idx) => {
        allPoints.push({
            x: p.volatility * 100,
            y: p.return * 100,
            sharpe: p.sharpe_ratio || 0,
            weights: p.weights || {},
            type: 'monte_carlo',
            id: `mc-${idx}`
        });
    });

    // Add individual assets
    (data.individual_assets || []).forEach((p, idx) => {
        allPoints.push({
            x: p.volatility * 100,
            y: p.return * 100,
            name: p.name,
            type: 'asset',
            id: `asset-${idx}`
        });
    });

    // Add CML points
    (data.cml_points || []).forEach((p, idx) => {
        allPoints.push({
            x: p.volatility * 100,
            y: p.return * 100,
            type: 'cml',
            id: `cml-${idx}`
        });
    });

    // Identify special points
    const frontierPoints = allPoints.filter(p => p.type === 'frontier');
    let maxSharpe = null;
    let minVol = null;

    if (frontierPoints.length > 0) {
        maxSharpe = frontierPoints.reduce((max, p) => p.sharpe > max.sharpe ? p : max);
        minVol = frontierPoints.reduce((min, p) => p.x < min.x ? p : min);
    }

    // Calculate axis domains
    const xValues = allPoints.filter(p => p.type !== 'monte_carlo').map(p => p.x);
    const yValues = allPoints.filter(p => p.type !== 'monte_carlo').map(p => p.y);

    const minX = Math.min(...xValues, 0);
    const maxX = Math.max(...xValues);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);

    const xPad = (maxX - minX) * 0.1 || 1;
    const yPad = (maxY - minY) * 0.1 || 1;

    const xDomain = [Math.max(0, Math.floor(minX - xPad)), Math.ceil(maxX + xPad)];
    const yDomain = [Math.floor(minY - yPad), Math.ceil(maxY + yPad)];

    // Custom shape renderer
    const renderPoint = (props) => {
        const { cx, cy, payload } = props;

        if (!payload) return null;

        // Determine color and size based on type
        let fill = '#3b82f6';
        let stroke = 'none';
        let strokeWidth = 0;
        let r = 2;

        if (payload.type === 'monte_carlo') {
            fill = '#64748b';
            r = 1.5;
            return <circle cx={cx} cy={cy} r={r} fill={fill} fillOpacity={0.08} />;
        } else if (payload.type === 'cml') {
            return null; // CML rendered as line
        } else if (payload.type === 'asset') {
            fill = '#c084fc';
            stroke = '#fff';
            strokeWidth = 1;
            r = 5;
        } else if (payload.type === 'frontier') {
            // Check if special point
            if (maxSharpe && payload.id === maxSharpe.id) {
                fill = '#10b981';
                stroke = '#fff';
                strokeWidth = 2;
                r = 8;
            } else if (minVol && payload.id === minVol.id) {
                fill = '#f59e0b';
                stroke = '#fff';
                strokeWidth = 2;
                r = 7;
            } else {
                fill = '#3b82f6';
                r = 2;
            }
        }

        return <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
    };

    // Professional Tooltip
    const CustomTooltip = ({ active, payload }) => {
        if (!active || !payload || !payload[0]) return null;

        const point = payload[0].payload;

        let title = 'Portfolio';
        let color = '#3b82f6';

        if (point.type === 'asset') {
            title = point.name;
            color = '#c084fc';
        } else if (point.type === 'monte_carlo') {
            title = 'Simulated Portfolio';
            color = '#64748b';
        } else if (point.type === 'cml') {
            title = 'Capital Market Line';
            color = '#94a3b8';
        } else if (maxSharpe && point.id === maxSharpe.id) {
            title = 'Maximum Sharpe Ratio';
            color = '#10b981';
        } else if (minVol && point.id === minVol.id) {
            title = 'Minimum Volatility';
            color = '#f59e0b';
        } else if (point.type === 'frontier') {
            title = 'Efficient Portfolio';
        }

        const weights = point.weights || {};
        const hasWeights = Object.keys(weights).length > 0;
        const allocations = hasWeights
            ? Object.entries(weights).filter(([_, w]) => w > 0.001).sort((a, b) => b[1] - a[1])
            : [];

        return (
            <div className="bg-slate-900 border border-slate-600 rounded-lg shadow-2xl overflow-hidden min-w-[260px]">
                <div className="px-4 py-2.5 border-b border-slate-700 flex items-center gap-2.5" style={{ backgroundColor: '#1e293b' }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }}></div>
                    <p className="text-white font-semibold text-sm">{title}</p>
                </div>

                <div className="p-4 space-y-2.5">
                    <div className="flex justify-between items-baseline">
                        <span className="text-slate-400 text-xs font-medium">Expected Return</span>
                        <span className="text-emerald-400 font-mono font-semibold text-base tabular-nums">
                            {point.y.toFixed(2)}%
                        </span>
                    </div>

                    <div className="flex justify-between items-baseline">
                        <span className="text-slate-400 text-xs font-medium">Volatility (σ)</span>
                        <span className="text-sky-400 font-mono font-semibold text-base tabular-nums">
                            {point.x.toFixed(2)}%
                        </span>
                    </div>

                    {point.sharpe !== undefined && point.type !== 'cml' && point.type !== 'asset' && (
                        <div className="flex justify-between items-baseline">
                            <span className="text-slate-400 text-xs font-medium">Sharpe Ratio</span>
                            <span className="text-amber-400 font-mono font-semibold text-base tabular-nums">
                                {point.sharpe.toFixed(3)}
                            </span>
                        </div>
                    )}

                    {allocations.length > 0 && (
                        <>
                            <div className="border-t border-slate-700 pt-3 mt-3">
                                <p className="text-slate-400 text-xs font-semibold mb-2.5 uppercase tracking-wide">
                                    Portfolio Allocation
                                </p>
                                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                                    {allocations.slice(0, 6).map(([ticker, weight]) => (
                                        <div key={ticker} className="flex items-center gap-2.5">
                                            <span className="text-slate-200 text-xs font-medium w-14 flex-shrink-0">
                                                {ticker}
                                            </span>
                                            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                                                    style={{ width: `${Math.min(weight * 100, 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-blue-400 font-mono text-xs font-semibold w-11 text-right tabular-nums flex-shrink-0">
                                                {(weight * 100).toFixed(1)}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                {allocations.length > 6 && (
                                    <p className="text-slate-500 text-xs mt-2 italic">
                                        +{allocations.length - 6} more
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    };

    // Extract CML and Frontier for line rendering
    const cmlLine = allPoints.filter(p => p.type === 'cml').sort((a, b) => a.x - b.x);
    const frontierLine = allPoints.filter(p => p.type === 'frontier').sort((a, b) => a.x - b.x);

    return (
        <div className="rounded-xl border border-slate-700/50 overflow-hidden bg-slate-900/60 shadow-xl">
            <div className="bg-slate-800/60 px-6 py-4 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-white text-lg">Efficient Frontier Analysis</h3>
                        <p className="text-xs text-slate-400 mt-1">
                            Mean-Variance Optimization  •  {frontierPoints.length} Points
                        </p>
                    </div>

                    {maxSharpe && (
                        <div className="flex gap-4 text-xs">
                            <div className="text-right">
                                <div className="text-slate-500 font-medium">Optimal Sharpe</div>
                                <div className="text-emerald-400 font-mono font-semibold text-sm">
                                    {maxSharpe.sharpe.toFixed(3)}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-slate-500 font-medium">Min Volatility</div>
                                <div className="text-amber-400 font-mono font-semibold text-sm">
                                    {minVol.x.toFixed(2)}%
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-6">
                <ResponsiveContainer width="100%" height={520}>
                    <ScatterChart margin={{ top: 20, right: 30, bottom: 55, left: 65 }}>
                        <CartesianGrid strokeDasharray="2 4" stroke="#334155" opacity={0.25} />

                        <XAxis
                            type="number"
                            dataKey="x"
                            name="Volatility"
                            unit="%"
                            domain={xDomain}
                            stroke="#64748b"
                            tick={{ fill: '#cbd5e1', fontSize: 11 }}
                            tickFormatter={(v) => `${v.toFixed(1)}%`}
                            label={{
                                value: 'Risk (Annualized Volatility %)',
                                position: 'bottom',
                                offset: 35,
                                fill: '#cbd5e1',
                                fontSize: 12,
                                fontWeight: 500
                            }}
                        />

                        <YAxis
                            type="number"
                            dataKey="y"
                            name="Return"
                            unit="%"
                            domain={yDomain}
                            stroke="#64748b"
                            tick={{ fill: '#cbd5e1', fontSize: 11 }}
                            tickFormatter={(v) => `${v.toFixed(1)}%`}
                            label={{
                                value: 'Expected Return (Annualized %)',
                                angle: -90,
                                position: 'left',
                                offset: 45,
                                fill: '#cbd5e1',
                                fontSize: 12,
                                fontWeight: 500
                            }}
                        />

                        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '4 4', stroke: '#64748b' }} />

                        {/* Single scatter with all points */}
                        <Scatter
                            data={allPoints}
                            shape={renderPoint}
                            line={false}
                            isAnimationActive={false}
                        />

                        {/* CML Line */}
                        {cmlLine.length > 0 && (
                            <ReferenceLine
                                segment={cmlLine.map(p => ({ x: p.x, y: p.y }))}
                                stroke="#94a3b8"
                                strokeWidth={1.5}
                                strokeDasharray="6 4"
                                ifOverflow="extendDomain"
                            />
                        )}

                        {/* Frontier Line */}
                        {frontierLine.length > 1 && frontierLine.map((point, idx) => {
                            if (idx === frontierLine.length - 1) return null;
                            const next = frontierLine[idx + 1];
                            return (
                                <line
                                    key={`line-${idx}`}
                                    x1={point.x}
                                    y1={point.y}
                                    x2={next.x}
                                    y2={next.y}
                                    stroke="#3b82f6"
                                    strokeWidth={2.5}
                                    style={{ pointerEvents: 'none' }}
                                />
                            );
                        })}

                        {/* Labels */}
                        {maxSharpe && (
                            <text
                                x={maxSharpe.x}
                                y={maxSharpe.y - 15}
                                textAnchor="middle"
                                fill="#10b981"
                                fontSize="11"
                                fontWeight="600"
                            >
                                Max Sharpe
                            </text>
                        )}

                        {minVol && (
                            <text
                                x={minVol.x}
                                y={minVol.y + 20}
                                textAnchor="middle"
                                fill="#f59e0b"
                                fontSize="10"
                                fontWeight="600"
                            >
                                Min Vol
                            </text>
                        )}
                    </ScatterChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div className="mt-5 pt-4 border-t border-slate-700/50">
                    <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                            <span className="text-slate-400 font-medium">Efficient Frontier</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white/20"></div>
                            <span className="text-slate-400 font-medium">Maximum Sharpe</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white/20"></div>
                            <span className="text-slate-400 font-medium">Minimum Volatility</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-purple-400"></div>
                            <span className="text-slate-400 font-medium">Individual Assets</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-500/30"></div>
                            <span className="text-slate-400 font-medium">Feasible Set</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
