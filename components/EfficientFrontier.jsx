import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, Label } from 'recharts';

export default function EfficientFrontier({ data }) {
    if (!data || !data.frontier_points || data.frontier_points.length === 0) {
        return (
            <div className="flex items-center justify-center h-96 text-slate-400 text-sm">
                No efficient frontier data available
            </div>
        );
    }

    // DEBUG: Log actual backend data to diagnose coordinate mismatch
    console.log('=== EFFICIENT FRONTIER DEBUG ===');
    console.log('First frontier point (raw from backend):', data.frontier_points[0]);
    if (data.individual_assets && data.individual_assets[0]) {
        console.log('First asset (raw from backend):', data.individual_assets[0]);
    }
    console.log('================================');

    // ================================================================
    // CRITICAL: Data transformation - Backend sends decimals (0.15)
    // We convert to percentages (15.0) for display
    // ================================================================

    const transformPoint = (p, type) => {
        // Backend format: {volatility: 0.1534, return: 0.2145, ...}
        // Chart needs: {vol: 15.34, ret: 21.45, ...}
        const vol = (p.volatility || 0) * 100;
        const ret = (p.return || 0) * 100;

        return {
            vol: vol,          // X-axis value
            ret: ret,          // Y-axis value
            volatility: vol,   // Display in tooltip
            return: ret,       // Display in tooltip
            sharpe: p.sharpe_ratio || 0,
            weights: p.weights || {},
            name: p.name || type,
            pointType: type
        };
    };

    const frontierPoints = data.frontier_points.map(p => transformPoint(p, 'Efficient Frontier'));
    const monteCarloPoints = (data.monte_carlo_points || []).map(p => transformPoint(p, 'Simulated Portfolio'));
    const assetPoints = (data.individual_assets || []).map(p => ({
        vol: (p.volatility || 0) * 100,
        ret: (p.return || 0) * 100,
        volatility: (p.volatility || 0) * 100,
        return: (p.return || 0) * 100,
        name: p.name,
        pointType: 'Individual Asset'
    }));
    const cmlPoints = (data.cml_points || []).map(p => transformPoint(p, 'Capital Market Line'));

    // Find special portfolios from frontier
    let maxSharpe = null;
    let minVol = null;

    if (frontierPoints.length > 0) {
        maxSharpe = frontierPoints.reduce((max, p) => p.sharpe > max.sharpe ? p : max);
        minVol = frontierPoints.reduce((min, p) => p.vol < min.vol ? p : min);
    }

    // Calculate axis domains
    const allPoints = [...frontierPoints, ...assetPoints];
    if (allPoints.length === 0) return <div className="p-8 text-slate-400">No data</div>;

    const vols = allPoints.map(p => p.vol);
    const rets = allPoints.map(p => p.ret);

    const minVolVal = Math.min(...vols, 0);
    const maxVolVal = Math.max(...vols);
    const minRetVal = Math.min(...rets);
    const maxRetVal = Math.max(...rets);

    const volPadding = (maxVolVal - minVolVal) * 0.1 || 1;
    const retPadding = (maxRetVal - minRetVal) * 0.1 || 1;

    const xDomain = [Math.max(0, Math.floor(minVolVal - volPadding)), Math.ceil(maxVolVal + volPadding)];
    const yDomain = [Math.floor(minRetVal - retPadding), Math.ceil(maxRetVal + retPadding)];

    // Professional Tooltip
    const CustomTooltip = ({ active, payload }) => {
        if (!active || !payload || !payload[0]) return null;

        const point = payload[0].payload;

        // Determine title
        let title = point.name || point.pointType || 'Portfolio';
        let color = '#3b82f6';

        if (maxSharpe && Math.abs(point.vol - maxSharpe.vol) < 0.01 && Math.abs(point.ret - maxSharpe.ret) < 0.01) {
            title = 'Maximum Sharpe Ratio';
            color = '#10b981';
        } else if (minVol && Math.abs(point.vol - minVol.vol) < 0.01 && Math.abs(point.ret - minVol.ret) < 0.01) {
            title = 'Minimum Volatility';
            color = '#f59e0b';
        } else if (point.pointType === 'Individual Asset') {
            color = '#c084fc';
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
                        <span className="text-emerald-400 font-mono font-semibold text-base">
                            {point.return.toFixed(2)}%
                        </span>
                    </div>

                    <div className="flex justify-between items-baseline">
                        <span className="text-slate-400 text-xs font-medium">Volatility (σ)</span>
                        <span className="text-sky-400 font-mono font-semibold text-base">
                            {point.volatility.toFixed(2)}%
                        </span>
                    </div>

                    {point.sharpe !== undefined && point.pointType !== 'Capital Market Line' && (
                        <div className="flex justify-between items-baseline">
                            <span className="text-slate-400 text-xs font-medium">Sharpe Ratio</span>
                            <span className="text-amber-400 font-mono font-semibold text-base">
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
                                            <span className="text-blue-400 font-mono text-xs font-semibold w-11 text-right flex-shrink-0">
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
                                    {minVol.vol.toFixed(2)}%
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

                        {/* X-Axis: Risk (Volatility) */}
                        <XAxis
                            type="number"
                            dataKey="vol"
                            name="Volatility"
                            unit="%"
                            domain={xDomain}
                            stroke="#64748b"
                            tick={{ fill: '#cbd5e1', fontSize: 11 }}
                            tickFormatter={(val) => `${val.toFixed(1)}%`}
                            label={{
                                value: 'Risk (Annualized Volatility %)',
                                position: 'bottom',
                                offset: 35,
                                fill: '#cbd5e1',
                                fontSize: 12,
                                fontWeight: 500
                            }}
                        />

                        {/* Y-Axis: Return */}
                        <YAxis
                            type="number"
                            dataKey="ret"
                            name="Return"
                            unit="%"
                            domain={yDomain}
                            stroke="#64748b"
                            tick={{ fill: '#cbd5e1', fontSize: 11 }}
                            tickFormatter={(val) => `${val.toFixed(1)}%`}
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

                        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '4 4', stroke: '#64748b', strokeWidth: 1 }} />

                        {/* Monte Carlo Cloud */}
                        {monteCarloPoints.length > 0 && (
                            <Scatter
                                data={monteCarloPoints}
                                fill="#64748b"
                                fillOpacity={0.08}
                                shape="circle"
                                r={1.5}
                                isAnimationActive={false}
                            />
                        )}

                        {/* Capital Market Line */}
                        {cmlPoints.length > 0 && (
                            <Scatter
                                data={cmlPoints}
                                shape={() => null}
                                line={{ stroke: '#94a3b8', strokeWidth: 1.5, strokeDasharray: '6 4' }}
                                isAnimationActive={false}
                            />
                        )}

                        {/* Efficient Frontier */}
                        <Scatter
                            data={frontierPoints}
                            fill="#3b82f6"
                            line={{ stroke: '#3b82f6', strokeWidth: 2.5 }}
                            lineType="monotone"
                            shape="circle"
                            r={2}
                            isAnimationActive={true}
                            animationDuration={800}
                        />

                        {/* Individual Assets */}
                        {assetPoints.length > 0 && (
                            <Scatter
                                data={assetPoints}
                                fill="#c084fc"
                                stroke="#fff"
                                strokeWidth={1}
                                shape="circle"
                                r={5}
                            />
                        )}

                        {/* Max Sharpe */}
                        {maxSharpe && (
                            <>
                                <Scatter
                                    data={[maxSharpe]}
                                    fill="#10b981"
                                    stroke="#fff"
                                    strokeWidth={2}
                                    shape="circle"
                                    r={8}
                                />
                                <ReferenceDot x={maxSharpe.vol} y={maxSharpe.ret} r={0}>
                                    <Label value="Max Sharpe" position="top" fill="#10b981" fontSize={11} fontWeight="600" offset={14} />
                                </ReferenceDot>
                            </>
                        )}

                        {/* Min Vol */}
                        {minVol && (
                            <>
                                <Scatter
                                    data={[minVol]}
                                    fill="#f59e0b"
                                    stroke="#fff"
                                    strokeWidth={2}
                                    shape="circle"
                                    r={7}
                                />
                                <ReferenceDot x={minVol.vol} y={minVol.ret} r={0}>
                                    <Label value="Min Vol" position="bottom" fill="#f59e0b" fontSize={10} fontWeight="600" offset={14} />
                                </ReferenceDot>
                            </>
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
                        {maxSharpe && (
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white/20"></div>
                                <span className="text-slate-400 font-medium">Maximum Sharpe</span>
                            </div>
                        )}
                        {minVol && (
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white/20"></div>
                                <span className="text-slate-400 font-medium">Minimum Volatility</span>
                            </div>
                        )}
                        {assetPoints.length > 0 && (
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-purple-400"></div>
                                <span className="text-slate-400 font-medium">Individual Assets</span>
                            </div>
                        )}
                        {monteCarloPoints.length > 0 && (
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-500/30"></div>
                                <span className="text-slate-400 font-medium">Feasible Set</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
