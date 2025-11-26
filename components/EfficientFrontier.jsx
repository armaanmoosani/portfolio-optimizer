import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, Label, ReferenceLine } from 'recharts';

export default function EfficientFrontier({ data }) {
    if (!data || !data.frontier_points || data.frontier_points.length === 0) {
        return (
            <div className="flex items-center justify-center h-96 text-slate-400 text-sm">
                No efficient frontier data available
            </div>
        );
    }

    // 1. Identify Special Indices
    let maxSharpeIdx = -1;
    let minVolIdx = -1;
    let maxSharpeVal = -Infinity;
    let minVolVal = Infinity;

    data.frontier_points.forEach((p, idx) => {
        const sharpe = p.sharpe_ratio || 0;
        const vol = p.volatility || 0;

        if (sharpe > maxSharpeVal) {
            maxSharpeVal = sharpe;
            maxSharpeIdx = idx;
        }

        if (vol < minVolVal) {
            minVolVal = vol;
            minVolIdx = idx;
        }
    });

    // 2. Transform Data
    const frontierPoints = data.frontier_points.map((p, idx) => ({
        x: p.volatility * 100,
        y: p.return * 100,
        sharpe: p.sharpe_ratio || 0,
        weights: p.weights || {},
        type: 'frontier',
        id: idx,
        isMaxSharpe: idx === maxSharpeIdx,
        isMinVol: idx === minVolIdx
    }));

    const monteCarloPoints = (data.monte_carlo_points || []).map((p, idx) => ({
        x: p.volatility * 100,
        y: p.return * 100,
        sharpe: p.sharpe_ratio || 0,
        weights: p.weights || {},
        type: 'monte_carlo',
        id: idx
    }));

    const assetPoints = (data.individual_assets || []).map((p, idx) => ({
        x: p.volatility * 100,
        y: p.return * 100,
        name: p.name,
        type: 'asset',
        id: idx,
        weights: { [p.name]: 1.0 }
    }));

    const cmlPoints = (data.cml_points || []).map((p, idx) => ({
        x: p.volatility * 100,
        y: p.return * 100,
        type: 'cml',
        id: idx
    })).sort((a, b) => a.x - b.x);

    // 3. Sort for Line Drawing
    const frontierSorted = [...frontierPoints].sort((a, b) => a.x - b.x);

    // 4. Create Explicit Overlay Objects
    // These are distinct objects with specific types to force correct tooltip rendering
    const maxSharpePoint = frontierPoints.find(p => p.isMaxSharpe);
    const minVolPoint = frontierPoints.find(p => p.isMinVol);

    const maxSharpeOverlay = maxSharpePoint ? { ...maxSharpePoint, type: 'max_sharpe_overlay' } : null;
    const minVolOverlay = minVolPoint ? { ...minVolPoint, type: 'min_vol_overlay' } : null;

    // Calculate domains
    const allVisible = [...frontierPoints, ...assetPoints];
    const xValues = allVisible.map(p => p.x);
    const yValues = allVisible.map(p => p.y);

    const minX = Math.min(...xValues, 0);
    const maxX = Math.max(...xValues);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);

    const xPad = (maxX - minX) * 0.1 || 1;
    const yPad = (maxY - minY) * 0.1 || 1;

    const xDomain = [Math.max(0, Math.floor(minX - xPad)), Math.ceil(maxX + xPad)];
    const yDomain = [Math.floor(minY - yPad), Math.ceil(maxY + yPad)];

    // Professional Tooltip
    const CustomTooltip = ({ active, payload }) => {
        if (!active || !payload || payload.length === 0) return null;

        // Smart Payload Scanning: Prioritize specific overlays over generic points
        // UPDATED PRIORITY: Asset > Min Vol > Max Sharpe > Frontier
        // This ensures that if "Max Sharpe" is accidentally included in the payload (ghosting),
        // the more specific points (Asset/MinVol) will take precedence.
        let point = payload.find(p => p.payload.type === 'asset')?.payload;
        if (!point) point = payload.find(p => p.payload.type === 'min_vol_overlay')?.payload;
        if (!point) point = payload.find(p => p.payload.type === 'max_sharpe_overlay')?.payload;
        if (!point) point = payload.find(p => p.payload.type === 'cml')?.payload;
        if (!point) point = payload[0].payload; // Fallback

        let title = 'Portfolio';
        let color = '#3b82f6';

        // Explicit Type Checks
        if (point.type === 'asset') {
            title = point.name;
            color = '#c084fc';
        } else if (point.type === 'min_vol_overlay') {
            title = 'Minimum Volatility';
            color = '#f59e0b';
        } else if (point.type === 'max_sharpe_overlay') {
            title = 'Maximum Sharpe Ratio';
            color = '#10b981';
        } else if (point.type === 'monte_carlo') {
            title = 'Simulated Portfolio';
            color = '#64748b';
        } else if (point.type === 'cml') {
            title = 'Capital Market Line';
            color = '#94a3b8';
        } else if (point.type === 'frontier') {
            // Fallback for underlying frontier points
            if (point.isMaxSharpe) {
                title = 'Maximum Sharpe Ratio';
                color = '#10b981';
            } else if (point.isMinVol) {
                title = 'Minimum Volatility';
                color = '#f59e0b';
            } else {
                title = 'Efficient Portfolio';
            }
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
                                                    className="h-full bg-blue-500 rounded-full"
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

    return (
        <div className="rounded-xl border border-slate-700/50 overflow-hidden bg-slate-900/60 shadow-xl">
            <div className="bg-slate-800/60 px-6 py-4 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-white text-lg">Efficient Frontier Analysis</h3>
                        <p className="text-xs text-slate-400 mt-1">
                            Mean-Variance Optimization  •  {frontierPoints.length} Portfolio Points
                        </p>
                    </div>

                    {maxSharpeOverlay && (
                        <div className="flex gap-4 text-xs">
                            <div className="text-right">
                                <div className="text-slate-500 font-medium">Optimal Sharpe</div>
                                <div className="text-emerald-400 font-mono font-semibold text-sm">
                                    {maxSharpeOverlay.sharpe.toFixed(3)}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-slate-500 font-medium">Min Volatility</div>
                                <div className="text-amber-400 font-mono font-semibold text-sm">
                                    {minVolOverlay ? minVolOverlay.x.toFixed(2) : '0.00'}%
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-6">
                <ResponsiveContainer width="100%" height={520}>
                    <ScatterChart margin={{ top: 20, right: 30, bottom: 55, left: 65 }}>
                        <CartesianGrid strokeDasharray="2 4" stroke="#334155" opacity={0.25} strokeWidth={0.5} />

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

                        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#64748b', strokeWidth: 1.5, opacity: 0.5 }} />

                        {/* CML Line */}
                        {cmlPoints.length > 1 && (
                            <ReferenceLine
                                segment={[
                                    { x: cmlPoints[0].x, y: cmlPoints[0].y },
                                    { x: cmlPoints[cmlPoints.length - 1].x, y: cmlPoints[cmlPoints.length - 1].y }
                                ]}
                                stroke="#94a3b8"
                                strokeWidth={1.5}
                                strokeDasharray="6 4"
                            />
                        )}

                        {/* Efficient Frontier (Main Line) */}
                        <Scatter
                            key="frontier-line"
                            name="Frontier"
                            data={frontierSorted}
                            line={{ stroke: '#3b82f6', strokeWidth: 2.5 }}
                            lineType="monotone"
                            fill="#3b82f6"
                            shape="circle"
                            isAnimationActive={false}
                        />

                        {/* Monte Carlo Cloud */}
                        {monteCarloPoints.length > 0 && (
                            <Scatter
                                key="monte-carlo"
                                name="MonteCarlo"
                                data={monteCarloPoints}
                                fill="#64748b"
                                fillOpacity={0.08}
                                shape="circle"
                                r={1.5}
                                isAnimationActive={false}
                            />
                        )}

                        {/* Individual Assets */}
                        {assetPoints.length > 0 && (
                            <Scatter
                                key="assets"
                                name="Assets"
                                data={assetPoints}
                                fill="#c084fc"
                                stroke="#fff"
                                strokeWidth={1}
                                shape="circle"
                                r={5}
                            />
                        )}

                        {/* Max Sharpe Overlay */}
                        {maxSharpeOverlay && (
                            <Scatter
                                key="max-sharpe"
                                name="MaxSharpe"
                                data={[maxSharpeOverlay]}
                                fill="#10b981"
                                stroke="#fff"
                                strokeWidth={2}
                                shape="star"
                                r={8}
                            />
                        )}
                        {maxSharpeOverlay && (
                            <ReferenceDot
                                x={maxSharpeOverlay.x}
                                y={maxSharpeOverlay.y}
                                r={0}
                                stroke="none"
                                fill="none"
                                ifOverflow="extendDomain"
                            >
                                <Label
                                    value="Max Sharpe"
                                    position="top"
                                    fill="#10b981"
                                    fontSize={11}
                                    fontWeight="600"
                                    offset={15}
                                />
                            </ReferenceDot>
                        )}

                        {/* Min Vol Overlay */}
                        {minVolOverlay && (
                            <Scatter
                                key="min-vol"
                                name="MinVol"
                                data={[minVolOverlay]}
                                fill="#f59e0b"
                                stroke="#fff"
                                strokeWidth={2}
                                shape="diamond"
                                r={7}
                            />
                        )}
                        {minVolOverlay && (
                            <ReferenceDot
                                x={minVolOverlay.x}
                                y={minVolOverlay.y}
                                r={0}
                                stroke="none"
                                fill="none"
                                ifOverflow="extendDomain"
                            >
                                <Label
                                    value="Min Vol"
                                    position="bottom"
                                    fill="#f59e0b"
                                    fontSize={10}
                                    fontWeight="600"
                                    offset={15}
                                />
                            </ReferenceDot>
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
                        {assetPoints.length > 0 && (
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-purple-400"></div>
                                <span className="text-slate-400 font-medium">Individual Assets</span>
                            </div>
                        )}
                        {monteCarloPoints.length > 0 && (
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-500/30"></div>
                                <span className="text-slate-400 font-medium">Feasible Set ({monteCarloPoints.length.toLocaleString()} simulations)</span>
                            </div>
                        )}
                        {cmlPoints.length > 0 && (
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-px bg-slate-400" style={{ borderTop: '1.5px dashed' }}></div>
                                <span className="text-slate-400 font-medium">Capital Market Line</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
