import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, Label, Cell, ReferenceLine, LabelList } from 'recharts';

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
        type: 'frontier',
        id: 'frontier'
    })).sort((a, b) => a.return - b.return);

    // 2. Format Monte Carlo Points (The Cloud)
    const monteCarloPoints = (data.monte_carlo_points || []).slice(0, 1000).map((p, idx) => ({
        volatility: p.volatility * 100,
        return: p.return * 100,
        sharpe_ratio: p.sharpe_ratio || 0,
        weights: p.weights || {},
        name: 'Feasible Portfolio',
        type: 'monte_carlo',
        id: `mc_${idx}`
    }));

    // 3. Format Individual Assets (The Dots)
    const individualAssets = (data.individual_assets || []).map((p, idx) => ({
        volatility: p.volatility * 100,
        return: p.return * 100,
        name: p.name,
        type: 'asset',
        id: `asset_${p.name}`
    }));

    // 4. Key Portfolios - CRITICAL: Store raw values for exact matching
    const optimalPortfolio = data.optimal_portfolio ? {
        volatility: data.optimal_portfolio.volatility * 100,
        return: data.optimal_portfolio.return * 100,
        sharpe_ratio: data.optimal_portfolio.sharpe_ratio || 0,
        weights: data.optimal_portfolio.weights || {},
        name: 'Maximum Sharpe Ratio Portfolio',
        type: 'optimal',
        id: 'optimal_portfolio'
    } : null;

    const minVariancePortfolio = data.min_variance_portfolio ? {
        volatility: data.min_variance_portfolio.volatility * 100,
        return: data.min_variance_portfolio.return * 100,
        sharpe_ratio: data.min_variance_portfolio.sharpe_ratio || 0,
        weights: data.min_variance_portfolio.weights || {},
        name: 'Global Minimum Variance Portfolio',
        type: 'min_variance',
        id: 'min_variance_portfolio'
    } : null;

    // CRITICAL: Check if portfolios are truly distinct (>0.1% difference in volatility)
    const hasDistinctMinVol = minVariancePortfolio && optimalPortfolio &&
        Math.abs(minVariancePortfolio.volatility - optimalPortfolio.volatility) > 0.1;

    // 5. Capital Market Line (CML)
    let cmlPoints = [];
    if (data.cml_points && data.cml_points.length > 0) {
        cmlPoints = data.cml_points.map((p, idx) => ({
            volatility: p.volatility * 100,
            return: p.return * 100,
            type: 'cml',
            id: `cml_${idx}`
        })).sort((a, b) => a.volatility - b.volatility);
    } else if (optimalPortfolio) {
        const rfRate = 4.5;
        const optVol = optimalPortfolio.volatility;
        const optRet = optimalPortfolio.return;
        const slope = (optRet - rfRate) / optVol;

        cmlPoints = [
            { volatility: 0, return: rfRate, type: 'cml', id: 'cml_rf' },
            { volatility: optVol, return: optRet, type: 'cml', id: 'cml_tangent' },
            { volatility: optVol * 1.5, return: rfRate + slope * (optVol * 1.5), type: 'cml', id: 'cml_extend' }
        ];
    }

    // 6. Calculate Axis Domains (Auto-Scaling)
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

    const volPadding = (maxVol - minVol) * 0.1;
    const retPadding = (maxRet - minRet) * 0.1;

    const volDomain = [
        Math.max(0, Math.floor((minVol - volPadding) * 5) / 5),
        Math.ceil((maxVol + volPadding) * 5) / 5
    ];

    const retDomain = [
        Math.floor((minRet - retPadding) / 5) * 5,
        Math.ceil((maxRet + retPadding) / 5) * 5
    ];

    // INDUSTRY-GRADE TOOLTIP - Uses exact point matching
    const CustomTooltip = ({ active, payload }) => {
        if (!active || !payload || payload.length === 0) return null;

        // CRITICAL FIX: Find the exact point being hovered using unique ID
        // Priority order: optimal > min_variance > asset > frontier > monte_carlo
        const priorityOrder = ['optimal', 'min_variance', 'asset', 'frontier', 'monte_carlo'];

        let selectedPoint = null;
        for (const type of priorityOrder) {
            const found = payload.find(p => p.payload?.type === type);
            if (found) {
                selectedPoint = found.payload;
                break;
            }
        }

        if (!selectedPoint || selectedPoint.type === 'cml') return null;

        // Validate data integrity - prevent showing wrong portfolio data
        const isOptimal = selectedPoint.id === 'optimal_portfolio';
        const isMinVar = selectedPoint.id === 'min_variance_portfolio';

        // Display badge
        let badge = null;
        if (isOptimal) {
            badge = <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded font-bold shadow-sm">MAX SHARPE</span>;
        } else if (isMinVar) {
            badge = <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded font-bold shadow-sm">MIN VOL</span>;
        } else if (selectedPoint.type === 'asset') {
            badge = <span className="text-xs bg-slate-600 text-white px-2 py-0.5 rounded">ASSET</span>;
        } else if (selectedPoint.type === 'frontier') {
            badge = <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">FRONTIER</span>;
        }

        return (
            <div className="bg-slate-900/95 border border-slate-700/50 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden z-50" style={{ minWidth: '260px' }}>
                <div className="bg-slate-800/80 px-4 py-3 border-b border-slate-700/50 flex justify-between items-center">
                    <p className="text-white font-bold text-sm tracking-wide truncate pr-2">
                        {selectedPoint.name}
                    </p>
                    {badge}
                </div>

                <div className="p-4 space-y-3">
                    {/* Core Metrics */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block mb-1">Expected Return</span>
                            <span className="text-emerald-400 font-mono font-bold text-base">{selectedPoint.return.toFixed(2)}%</span>
                        </div>
                        <div>
                            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block mb-1">Volatility</span>
                            <span className="text-sky-400 font-mono font-bold text-base">{selectedPoint.volatility.toFixed(2)}%</span>
                        </div>
                    </div>

                    {selectedPoint.sharpe_ratio !== undefined && selectedPoint.sharpe_ratio !== 0 && (
                        <div className="pt-2 border-t border-slate-700/50">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 text-xs font-medium">Sharpe Ratio</span>
                                <span className="text-amber-400 font-mono font-bold text-sm">{selectedPoint.sharpe_ratio.toFixed(3)}</span>
                            </div>
                        </div>
                    )}

                    {/* Allocations (Only for portfolios) */}
                    {selectedPoint.weights && Object.keys(selectedPoint.weights).length > 0 && (
                        <>
                            <div className="border-t border-slate-700/50 my-3" />
                            <div>
                                <p className="text-slate-500 font-semibold mb-2.5 text-[10px] uppercase tracking-wider">Portfolio Allocations</p>
                                <div className="space-y-2">
                                    {Object.entries(selectedPoint.weights)
                                        .sort(([, a], [, b]) => b - a)
                                        .slice(0, 5)
                                        .map(([ticker, weight]) => (
                                            <div key={ticker} className="flex items-center gap-2.5">
                                                <span className="text-slate-300 font-medium text-xs w-12 font-mono">
                                                    {ticker}
                                                </span>
                                                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                                                        style={{ width: `${(weight * 100).toFixed(1)}%` }}
                                                    />
                                                </div>
                                                <span className="text-blue-400 font-mono text-xs font-bold w-12 text-right">
                                                    {(weight * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                        ))}
                                </div>
                                {Object.keys(selectedPoint.weights).length > 5 && (
                                    <p className="text-slate-500 text-[10px] mt-2 italic">
                                        +{Object.keys(selectedPoint.weights).length - 5} more positions
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
        <div className="rounded-2xl border border-slate-700/40 bg-gradient-to-br from-slate-900/40 to-slate-800/20 shadow-xl">
            <div className="bg-gradient-to-r from-slate-800/80 to-slate-700/60 px-6 py-5 border-b border-slate-600/30 backdrop-blur-sm rounded-t-2xl">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-white text-xl tracking-tight">Efficient Frontier</h3>
                        <p className="text-sm text-slate-300 mt-1.5">
                            Modern Portfolio Theory • Markowitz Optimization
                        </p>
                    </div>

                    {optimalPortfolio && (
                        <div className="flex gap-6">
                            <div className="text-right hidden sm:block">
                                <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">Max Sharpe Ratio</div>
                                <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">
                                    {optimalPortfolio.sharpe_ratio.toFixed(3)}
                                </div>
                            </div>
                            {hasDistinctMinVol && (
                                <div className="text-right hidden sm:block">
                                    <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">Min Volatility</div>
                                    <div className="text-xl font-bold text-amber-400 font-mono mt-0.5">
                                        {minVariancePortfolio.volatility.toFixed(2)}%
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="p-4 sm:p-8">
                <ResponsiveContainer width="100%" height={500}>
                    <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
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
                                value: 'Annualized Volatility (Standard Deviation)',
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
                                value: 'Expected Annual Return',
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

                        {/* Layer 1: Monte Carlo Cloud (Background) */}
                        <Scatter
                            name="Feasible Set"
                            data={monteCarloPoints}
                            fill="#64748b"
                            opacity={0.12}
                            shape="circle"
                            isAnimationActive={false}
                        />

                        {/* Layer 2: Capital Market Line */}
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
                                        value="Risk-Free Rate"
                                        position="right"
                                        fill="#a855f7"
                                        fontSize={11}
                                        fontWeight="bold"
                                        offset={10}
                                    />
                                </ReferenceDot>
                            </>
                        )}

                        {/* Layer 3: Efficient Frontier Curve */}
                        <Scatter
                            name="Efficient Frontier"
                            data={frontierPoints}
                            line={{ stroke: '#3b82f6', strokeWidth: 4 }}
                            lineType="natural"
                            shape={false}
                            stroke="#3b82f6"
                            isAnimationActive={false}
                        />

                        {/* Layer 4: Individual Assets */}
                        <Scatter
                            name="Assets"
                            data={individualAssets}
                            fill="#f8fafc"
                            shape="circle"
                        >
                            {individualAssets.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill="#f8fafc" stroke="#475569" strokeWidth={1.5} />
                            ))}
                            <LabelList dataKey="name" position="top" offset={6} style={{ fill: '#cbd5e1', fontSize: '10px', fontWeight: 'bold' }} />
                        </Scatter>

                        {/* Layer 5: Minimum Variance Portfolio (if distinct) */}
                        {hasDistinctMinVol && (
                            <Scatter
                                name="Min Variance"
                                data={[minVariancePortfolio]}
                                shape={(props) => {
                                    const { cx, cy } = props;
                                    return (
                                        <g>
                                            <circle cx={cx} cy={cy} r={6} fill="#f59e0b" stroke="#fff" strokeWidth={2.5} />
                                            <text x={cx} y={cy + 20} textAnchor="middle" fill="#f59e0b" fontSize={11} fontWeight="bold">Min Vol</text>
                                        </g>
                                    );
                                }}
                                isAnimationActive={false}
                            />
                        )}

                        {/* Layer 6: Optimal Portfolio (Always on top) */}
                        {optimalPortfolio && (
                            <Scatter
                                name="Max Sharpe"
                                data={[optimalPortfolio]}
                                shape={(props) => {
                                    const { cx, cy } = props;
                                    return (
                                        <g>
                                            <circle cx={cx} cy={cy} r={8} fill="#10b981" stroke="#fff" strokeWidth={2.5} />
                                            <text x={cx} y={cy - 15} textAnchor="middle" fill="#10b981" fontSize={12} fontWeight="bold">Max Sharpe</text>
                                        </g>
                                    );
                                }}
                                isAnimationActive={false}
                            />
                        )}
                    </ScatterChart>
                </ResponsiveContainer>

                {/* Professional Legend */}
                <div className="mt-6 flex flex-wrap gap-4 justify-center text-xs text-slate-400 border-t border-slate-700/30 pt-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white"></div>
                        <span>Max Sharpe Ratio Portfolio</span>
                    </div>
                    {hasDistinctMinVol && (
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-amber-500 border-2 border-white"></div>
                            <span>Global Minimum Variance</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-0.5 bg-blue-500"></div>
                        <span>Efficient Frontier</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-0.5 bg-white opacity-60 border-dashed border-t-2"></div>
                        <span>Capital Market Line</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-slate-100 border border-slate-600"></div>
                        <span>Individual Assets</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-slate-600 opacity-20"></div>
                        <span>Feasible Set (Monte Carlo)</span>
                    </div>
                </div>
            </div>
        </div>
    );
}