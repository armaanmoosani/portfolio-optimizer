import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, Label, Legend } from 'recharts';

export default function EfficientFrontier({ data }) {
    if (!data || !data.frontier_points || data.frontier_points.length === 0) {
        return (
            <div className="flex items-center justify-center h-96 text-slate-400 text-sm">
                No efficient frontier data available
            </div>
        );
    }

    // ============================================================
    // DATA TRANSFORMATION - Convert backend decimals to percentages
    // Backend format: {volatility: 0.1534, return: 0.2145}
    // Display format: {volatility: 15.34, return: 21.45}
    // ============================================================

    const frontierPoints = data.frontier_points.map((p, idx) => ({
        volatility: p.volatility * 100,
        return: p.return * 100,
        sharpe_ratio: p.sharpe_ratio || 0,
        weights: p.weights || {},
        _meta: { type: 'frontier', id: idx }
    }));

    const monteCarloPoints = (data.monte_carlo_points || []).map((p, idx) => ({
        volatility: p.volatility * 100,
        return: p.return * 100,
        sharpe_ratio: p.sharpe_ratio || 0,
        weights: p.weights || {},
        _meta: { type: 'monte_carlo', id: idx }
    }));

    const individualAssets = (data.individual_assets || []).map((p, idx) => ({
        volatility: p.volatility * 100,
        return: p.return * 100,
        name: p.name,
        _meta: { type: 'asset', id: idx }
    }));

    const cmlPoints = (data.cml_points || []).map((p, idx) => ({
        volatility: p.volatility * 100,
        return: p.return * 100,
        _meta: { type: 'cml', id: idx }
    }));

    // ============================================================
    // IDENTIFY SPECIAL PORTFOLIOS
    // ============================================================

    let maxSharpePortfolio = null;
    let minVolatilityPortfolio = null;

    if (frontierPoints.length > 0) {
        maxSharpePortfolio = frontierPoints.reduce((max, p) =>
            p.sharpe_ratio > max.sharpe_ratio ? p : max
        );

        minVolatilityPortfolio = frontierPoints.reduce((min, p) =>
            p.volatility < min.volatility ? p : min
        );
    }

    // ============================================================
    // AXIS DOMAIN CALCULATION - Professional formatting
    // ============================================================

    const visiblePoints = [...frontierPoints, ...individualAssets];

    if (visiblePoints.length === 0) {
        return <div className="flex items-center justify-center h-96 text-slate-400">No data to display</div>;
    }

    const volValues = visiblePoints.map(p => p.volatility);
    const retValues = visiblePoints.map(p => p.return);

    const minVol = Math.min(...volValues, 0);
    const maxVol = Math.max(...volValues);
    const minRet = Math.min(...retValues);
    const maxRet = Math.max(...retValues);

    // 10% padding on each side for professional spacing
    const volPadding = (maxVol - minVol) * 0.10 || 1;
    const retPadding = (maxRet - minRet) * 0.10 || 1;

    // Round to nice numbers for clean axis labels
    const xMin = Math.max(0, Math.floor(minVol - volPadding));
    const xMax = Math.ceil(maxVol + volPadding);
    const yMin = Math.floor(minRet - retPadding);
    const yMax = Math.ceil(maxRet + retPadding);

    // ============================================================
    // PROFESSIONAL TOOLTIP - Bloomberg/Morningstar Style
    // ============================================================

    const CustomTooltip = ({ active, payload }) => {
        if (!active || !payload || payload.length === 0) return null;

        const point = payload[0].payload;
        const meta = point._meta || {};

        // Determine point label
        let title = 'Portfolio';
        let titleColor = '#3b82f6';

        if (meta.type === 'asset') {
            title = point.name;
            titleColor = '#c084fc';
        } else if (meta.type === 'cml') {
            title = 'Capital Market Line';
            titleColor = '#94a3b8';
        } else if (meta.type === 'monte_carlo') {
            title = 'Simulated Portfolio';
            titleColor = '#64748b';
        } else if (maxSharpePortfolio &&
            Math.abs(point.volatility - maxSharpePortfolio.volatility) < 0.01 &&
            Math.abs(point.return - maxSharpePortfolio.return) < 0.01) {
            title = 'Maximum Sharpe Ratio';
            titleColor = '#10b981';
        } else if (minVolatilityPortfolio &&
            Math.abs(point.volatility - minVolatilityPortfolio.volatility) < 0.01 &&
            Math.abs(point.return - minVolatilityPortfolio.return) < 0.01) {
            title = 'Minimum Volatility';
            titleColor = '#f59e0b';
        } else if (meta.type === 'frontier') {
            title = 'Efficient Portfolio';
            titleColor = '#3b82f6';
        }

        const hasWeights = point.weights && Object.keys(point.weights).length > 0;
        const allocations = hasWeights
            ? Object.entries(point.weights)
                .filter(([_, w]) => w > 0.001)
                .sort((a, b) => b[1] - a[1])
            : [];

        return (
            <div className="bg-slate-900 border border-slate-600/80 rounded-lg shadow-2xl overflow-hidden min-w-[260px] max-w-[320px]">
                {/* Header with color indicator */}
                <div className="px-4 py-2.5 border-b border-slate-700/80 flex items-center gap-2.5" style={{ backgroundColor: '#1e293b' }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: titleColor }}></div>
                    <p className="text-white font-semibold text-sm tracking-tight">{title}</p>
                </div>

                {/* Metrics Grid */}
                <div className="p-4 space-y-2.5">
                    {/* Return */}
                    <div className="flex justify-between items-baseline">
                        <span className="text-slate-400 text-xs font-medium">Expected Return</span>
                        <span className="text-emerald-400 font-mono font-semibold text-base tabular-nums">
                            {point.return.toFixed(2)}%
                        </span>
                    </div>

                    {/* Risk */}
                    <div className="flex justify-between items-baseline">
                        <span className="text-slate-400 text-xs font-medium">Volatility (σ)</span>
                        <span className="text-sky-400 font-mono font-semibold text-base tabular-nums">
                            {point.volatility.toFixed(2)}%
                        </span>
                    </div>

                    {/* Sharpe Ratio */}
                    {point.sharpe_ratio !== undefined && meta.type !== 'cml' && meta.type !== 'asset' && (
                        <div className="flex justify-between items-baseline">
                            <span className="text-slate-400 text-xs font-medium">Sharpe Ratio</span>
                            <span className="text-amber-400 font-mono font-semibold text-base tabular-nums">
                                {point.sharpe_ratio.toFixed(3)}
                            </span>
                        </div>
                    )}

                    {/* Portfolio Weights */}
                    {allocations.length > 0 && (
                        <>
                            <div className="border-t border-slate-700/70 pt-3 mt-3">
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
                                                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
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
                                        +{allocations.length - 6} more holdings
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
        <div className="rounded-xl border border-slate-700/50 overflow-hidden bg-slate-900/60 backdrop-blur-sm shadow-xl">
            {/* Professional Header */}
            <div className="bg-slate-800/60 px-6 py-4 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-white text-lg tracking-tight">Efficient Frontier Analysis</h3>
                        <p className="text-xs text-slate-400 mt-1">
                            Mean-Variance Optimization • {frontierPoints.length} Portfolio Points
                        </p>
                    </div>

                    {/* Key Metrics Display */}
                    {maxSharpePortfolio && (
                        <div className="flex gap-4 text-xs">
                            <div className="text-right">
                                <div className="text-slate-500 font-medium">Optimal Sharpe</div>
                                <div className="text-emerald-400 font-mono font-semibold text-sm">
                                    {maxSharpePortfolio.sharpe_ratio.toFixed(3)}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-slate-500 font-medium">Min Volatility</div>
                                <div className="text-amber-400 font-mono font-semibold text-sm">
                                    {minVolatilityPortfolio?.volatility.toFixed(2)}%
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Chart */}
            <div className="p-6">
                <ResponsiveContainer width="100%" height={520}>
                    <ScatterChart margin={{ top: 20, right: 30, bottom: 55, left: 65 }}>
                        <CartesianGrid
                            strokeDasharray="2 4"
                            stroke="#334155"
                            opacity={0.25}
                            strokeWidth={0.5}
                        />

                        <XAxis
                            type="number"
                            dataKey="volatility"
                            name="Volatility"
                            unit="%"
                            domain={[xMin, xMax]}
                            stroke="#64748b"
                            tick={{ fill: '#cbd5e1', fontSize: 11 }}
                            tickFormatter={(value) => `${value.toFixed(1)}%`}
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
                            dataKey="return"
                            name="Return"
                            unit="%"
                            domain={[yMin, yMax]}
                            stroke="#64748b"
                            tick={{ fill: '#cbd5e1', fontSize: 11 }}
                            tickFormatter={(value) => `${value.toFixed(1)}%`}
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

                        <Tooltip
                            content={<CustomTooltip />}
                            cursor={{
                                strokeDasharray: '4 4',
                                stroke: '#64748b',
                                strokeWidth: 1
                            }}
                        />

                        {/* Layer 1: Monte Carlo Simulation (Feasible Set) */}
                        {monteCarloPoints.length > 0 && (
                            <Scatter
                                name="Feasible Set"
                                data={monteCarloPoints}
                                fill="#64748b"
                                fillOpacity={0.08}
                                shape="circle"
                                r={1.5}
                                isAnimationActive={false}
                            />
                        )}

                        {/* Layer 2: Capital Market Line */}
                        {cmlPoints.length > 0 && (
                            <Scatter
                                name="Capital Market Line"
                                data={cmlPoints}
                                shape={() => null}
                                line={{
                                    stroke: '#94a3b8',
                                    strokeWidth: 1.5,
                                    strokeDasharray: '6 4'
                                }}
                                isAnimationActive={false}
                            />
                        )}

                        {/* Layer 3: Efficient Frontier (Main Curve) */}
                        <Scatter
                            name="Efficient Frontier"
                            data={frontierPoints}
                            fill="#3b82f6"
                            line={{
                                stroke: '#3b82f6',
                                strokeWidth: 2.5
                            }}
                            lineType="monotone"
                            shape="circle"
                            r={2}
                            isAnimationActive={true}
                            animationDuration={800}
                        />

                        {/* Layer 4: Individual Assets */}
                        {individualAssets.length > 0 && (
                            <Scatter
                                name="Individual Assets"
                                data={individualAssets}
                                fill="#c084fc"
                                stroke="#fff"
                                strokeWidth={1}
                                shape="circle"
                                r={5}
                                isAnimationActive={true}
                                animationDuration={600}
                            />
                        )}

                        {/* Layer 5: Maximum Sharpe Ratio Portfolio */}
                        {maxSharpePortfolio && (
                            <>
                                <Scatter
                                    name="Max Sharpe"
                                    data={[maxSharpePortfolio]}
                                    fill="#10b981"
                                    stroke="#fff"
                                    strokeWidth={2}
                                    shape="circle"
                                    r={8}
                                    isAnimationActive={true}
                                    animationDuration={1000}
                                />
                                <ReferenceDot
                                    x={maxSharpePortfolio.volatility}
                                    y={maxSharpePortfolio.return}
                                    r={0}
                                    ifOverflow="extendDomain"
                                >
                                    <Label
                                        value="Max Sharpe"
                                        position="top"
                                        fill="#10b981"
                                        fontSize={11}
                                        fontWeight="600"
                                        offset={14}
                                    />
                                </ReferenceDot>
                            </>
                        )}

                        {/* Layer 6: Minimum Volatility Portfolio */}
                        {minVolatilityPortfolio && (
                            <>
                                <Scatter
                                    name="Min Volatility"
                                    data={[minVolatilityPortfolio]}
                                    fill="#f59e0b"
                                    stroke="#fff"
                                    strokeWidth={2}
                                    shape="circle"
                                    r={7}
                                    isAnimationActive={true}
                                    animationDuration={1000}
                                />
                                <ReferenceDot
                                    x={minVolatilityPortfolio.volatility}
                                    y={minVolatilityPortfolio.return}
                                    r={0}
                                    ifOverflow="extendDomain"
                                >
                                    <Label
                                        value="Min Vol"
                                        position="bottom"
                                        fill="#f59e0b"
                                        fontSize={10}
                                        fontWeight="600"
                                        offset={14}
                                    />
                                </ReferenceDot>
                            </>
                        )}
                    </ScatterChart>
                </ResponsiveContainer>

                {/* Professional Legend */}
                <div className="mt-5 pt-4 border-t border-slate-700/50">
                    <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                            <span className="text-slate-400 font-medium">Efficient Frontier</span>
                        </div>
                        {maxSharpePortfolio && (
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white/20"></div>
                                <span className="text-slate-400 font-medium">Maximum Sharpe</span>
                            </div>
                        )}
                        {minVolatilityPortfolio && (
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white/20"></div>
                                <span className="text-slate-400 font-medium">Minimum Volatility</span>
                            </div>
                        )}
                        {individualAssets.length > 0 && (
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
