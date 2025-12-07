import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, Label, Cell, ReferenceLine, LabelList } from 'recharts';

export default function SecurityMarketLine({ data }) {
    if (!data || !data.sml_points || data.sml_points.length === 0) {
        return (
            <div className="flex items-center justify-center h-96 text-slate-400">
                <div className="text-center">
                    <p className="font-semibold">Security Market Line Unavailable</p>
                    <p className="text-sm mt-2">Benchmark data (e.g., SPY) required for CAPM analysis</p>
                </div>
            </div>
        );
    }

    // 1. Format SML Line Points
    const smlPoints = data.sml_points.map((p, idx) => ({
        beta: p.beta,
        return: p.return * 100,
        type: 'sml',
        id: `sml_${idx}`
    })).sort((a, b) => a.beta - b.beta);

    // Extract Risk-Free Rate from SML (Beta = 0)
    const riskFreeRate = smlPoints[0].return;

    // 2. Format Individual Assets with unique IDs
    const assets = (data.individual_assets || []).map((p, idx) => ({
        beta: p.beta || 0,
        return: p.return * 100,
        name: p.name,
        type: 'asset',
        id: `asset_${p.name}`
    }));

    // 3. Calculate Portfolio Beta (Weighted Average)
    let portfolioBeta = 0;
    let portfolioReturn = 0;
    let portfolioWeights = null;

    if (data.optimal_portfolio && data.optimal_portfolio.weights) {
        portfolioReturn = data.optimal_portfolio.return * 100;
        portfolioWeights = data.optimal_portfolio.weights;

        // Calculate weighted beta: β_p = Σ(w_i × β_i)
        Object.entries(data.optimal_portfolio.weights).forEach(([ticker, weight]) => {
            const asset = data.individual_assets.find(a => a.name === ticker);
            if (asset && asset.beta !== undefined) {
                portfolioBeta += weight * asset.beta;
            }
        });
    }

    const optimalPortfolio = data.optimal_portfolio ? {
        beta: portfolioBeta,
        return: portfolioReturn,
        name: 'Optimal Portfolio (Max Sharpe)',
        sharpe_ratio: data.optimal_portfolio.sharpe_ratio || 0,
        type: 'optimal',
        id: 'optimal_portfolio',
        weights: portfolioWeights
    } : null;

    // 4. Market Portfolio (Beta = 1.0 by definition)
    const marketReturn = data.market_return ? data.market_return * 100 : smlPoints[1]?.return || 10;
    const marketPortfolio = {
        beta: 1.0,
        return: marketReturn,
        name: 'Market Portfolio',
        type: 'market',
        id: 'market_portfolio'
    };

    // 5. Calculate Axis Domains
    const allPoints = [
        ...smlPoints,
        ...assets,
        marketPortfolio,
        ...(optimalPortfolio ? [optimalPortfolio] : [])
    ];

    const minBeta = Math.min(0, ...allPoints.map(p => p.beta));
    const maxBeta = Math.max(1.5, ...allPoints.map(p => p.beta));
    const minRet = Math.min(riskFreeRate * 0.9, ...allPoints.map(p => p.return));
    const maxRet = Math.max(marketReturn * 1.2, ...allPoints.map(p => p.return));

    const betaPadding = (maxBeta - minBeta) * 0.1;
    const retPadding = (maxRet - minRet) * 0.1;

    // Ensure x-axis starts at 0 if no negative betas
    const betaDomain = [
        minBeta < 0 ? Math.floor((minBeta - betaPadding) * 10) / 10 : 0,
        Math.ceil((maxBeta + betaPadding) * 10) / 10
    ];

    const retDomain = [
        Math.floor((minRet - retPadding) / 5) * 5,
        Math.ceil((maxRet + retPadding) / 5) * 5
    ];

    // FIXED TOOLTIP with CAPM Validation - Uses payload.type
    const CustomTooltip = ({ active, payload }) => {
        if (!active || !payload || payload.length === 0) return null;

        // Priority based on point TYPE (from payload.type)
        // optimal > market > asset
        const typePriority = {
            'optimal': 100,
            'market': 99,
            'asset': 50
        };

        // Find the highest priority point type in the payload
        let selectedItem = null;
        let highestPriority = -1;

        for (const item of payload) {
            if (!item.payload) continue;
            const pointType = item.payload.type;
            if (!pointType || pointType === 'sml') continue;

            const priority = typePriority[pointType] || 0;
            if (priority > highestPriority) {
                highestPriority = priority;
                selectedItem = item;
            }
        }

        if (!selectedItem || !selectedItem.payload) return null;

        const selectedPoint = selectedItem.payload;

        // Skip SML line points
        if (selectedPoint.type === 'sml') return null;

        // Calculate CAPM Expected Return: E(Ri) = Rf + βi × (E(Rm) - Rf)
        const expectedReturn = riskFreeRate + selectedPoint.beta * (marketReturn - riskFreeRate);

        // Calculate Alpha: α = Actual Return - Expected Return
        const alpha = selectedPoint.return - expectedReturn;

        // Professional Valuation Assessment (CFA Standards)
        let valuation = "Fairly Valued";
        let valuationColor = "text-slate-400";
        let valuationBg = "bg-slate-700/30";

        if (Math.abs(alpha) > 0.5) {
            if (alpha > 0) {
                valuation = "Undervalued";
                valuationColor = "text-emerald-400";
                valuationBg = "bg-emerald-900/30";
            } else {
                valuation = "Overvalued";
                valuationColor = "text-rose-400";
                valuationBg = "bg-rose-900/30";
            }
        }

        // Display badge and name based on point TYPE
        let badge = null;
        let displayName = selectedPoint.name || 'Security';

        if (selectedPoint.type === 'optimal') {
            badge = <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded font-bold shadow-sm">PORTFOLIO</span>;
            displayName = 'Optimal Portfolio (Max Sharpe)';
        } else if (selectedPoint.type === 'market') {
            badge = <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded font-bold shadow-sm">MARKET</span>;
            displayName = 'Market Portfolio (β=1)';
        } else if (selectedPoint.type === 'asset') {
            badge = <span className="text-xs bg-slate-600 text-white px-2 py-0.5 rounded">ASSET</span>;
            displayName = selectedPoint.name;
        }

        return (
            <div className="bg-slate-900/95 border border-slate-700/50 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden z-50" style={{ minWidth: '280px' }}>
                <div className="bg-slate-800/80 px-4 py-3 border-b border-slate-700/50 flex justify-between items-center">
                    <p className="text-white font-bold text-sm tracking-wide truncate pr-2">
                        {displayName}
                    </p>
                    {badge}
                </div>

                <div className="p-4 space-y-3">
                    {/* Core Metrics */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block mb-1">Expected Return</span>
                            <span className="text-white font-mono font-bold text-base">{selectedPoint.return.toFixed(2)}%</span>
                        </div>
                        <div>
                            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block mb-1">Beta (β)</span>
                            <span className="text-sky-400 font-mono font-bold text-base">{selectedPoint.beta.toFixed(3)}</span>
                        </div>
                    </div>

                    {/* CAPM Analysis Section */}
                    <div className="pt-3 border-t border-slate-700/50 space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-xs font-medium">CAPM Expected Return</span>
                            <span className="text-slate-300 font-mono text-sm">{expectedReturn.toFixed(2)}%</span>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-xs font-medium">Alpha (α)</span>
                            <span className={`font-mono font-bold text-sm ${alpha >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {alpha > 0 ? '+' : ''}{alpha.toFixed(2)}%
                            </span>
                        </div>

                        <div className={`flex justify-between items-center px-3 py-2 rounded-lg ${valuationBg}`}>
                            <span className="text-slate-300 text-xs font-semibold">Valuation</span>
                            <span className={`text-sm font-bold ${valuationColor}`}>
                                {valuation}
                            </span>
                        </div>
                    </div>

                    {/* Portfolio Composition (if applicable) */}
                    {selectedPoint.weights && Object.keys(selectedPoint.weights).length > 0 && (
                        <>
                            <div className="border-t border-slate-700/50 my-3" />
                            <div>
                                <p className="text-slate-500 font-semibold mb-2 text-[10px] uppercase tracking-wider">Top Holdings</p>
                                <div className="space-y-1.5">
                                    {Object.entries(selectedPoint.weights)
                                        .sort(([, a], [, b]) => b - a)
                                        .slice(0, 3)
                                        .map(([ticker, weight]) => (
                                            <div key={ticker} className="flex justify-between items-center text-xs">
                                                <span className="text-slate-300 font-mono">{ticker}</span>
                                                <span className="text-blue-400 font-bold">{(weight * 100).toFixed(1)}%</span>
                                            </div>
                                        ))}
                                </div>
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
                        <h3 className="font-bold text-white text-xl tracking-tight">Security Market Line</h3>
                        <p className="text-sm text-slate-300 mt-1.5">
                            Capital Asset Pricing Model (CAPM) • Systematic Risk Analysis
                        </p>
                    </div>

                    <div className="hidden sm:block text-right">
                        <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">Market Risk Premium</div>
                        <div className="text-lg font-bold text-blue-400 font-mono mt-0.5">
                            {(marketReturn - riskFreeRate).toFixed(2)}%
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 sm:p-8">
                <ResponsiveContainer width="100%" height={500}>
                    <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                        <XAxis
                            type="number"
                            dataKey="beta"
                            name="Beta"
                            stroke="#94a3b8"
                            strokeWidth={2}
                            tick={{ fill: '#e2e8f0', fontSize: 12, fontWeight: 500 }}
                            tickLine={{ stroke: '#94a3b8', strokeWidth: 2 }}
                            domain={betaDomain}
                            tickCount={8}
                            label={{
                                value: 'Beta (β) — Systematic Risk Relative to Market',
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
                                value: 'Expected Return (CAPM)',
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

                        {/* Reference Lines */}
                        {minBeta < 0 && (
                            <ReferenceLine x={0} stroke="#64748b" strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
                        )}
                        <ReferenceLine x={1} stroke="#64748b" strokeWidth={1} strokeDasharray="3 3" opacity={0.5}>
                            <Label value="β=1" position="top" fill="#94a3b8" fontSize={10} offset={5} />
                        </ReferenceLine>

                        {/* Security Market Line */}
                        <ReferenceLine
                            segment={[
                                { x: smlPoints[0].beta, y: smlPoints[0].return },
                                { x: smlPoints[smlPoints.length - 1].beta, y: smlPoints[smlPoints.length - 1].return }
                            ]}
                            stroke="#94a3b8"
                            strokeWidth={3}
                            strokeDasharray="8 4"
                            ifOverflow="extendDomain"
                        />

                        {/* Risk-Free Rate Point */}
                        <ReferenceDot
                            x={0}
                            y={riskFreeRate}
                            r={5}
                            fill="#a855f7"
                            stroke="#fff"
                            strokeWidth={2}
                            isFront={true}
                        >
                            <Label
                                value={`Rf=${riskFreeRate.toFixed(1)}%`}
                                position="right"
                                fill="#a855f7"
                                fontSize={11}
                                fontWeight="bold"
                                offset={10}
                            />
                        </ReferenceDot>

                        {/* Individual Assets */}
                        <Scatter
                            name="Assets"
                            data={assets}
                            fill="#f8fafc"
                            shape="circle"
                        >
                            {assets.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill="#f8fafc" stroke="#475569" strokeWidth={1.5} />
                            ))}
                            <LabelList dataKey="name" position="top" offset={8} style={{ fill: '#cbd5e1', fontSize: '10px', fontWeight: '600' }} />
                        </Scatter>

                        {/* Market Portfolio (Beta=1) */}
                        <Scatter
                            name="Market"
                            data={[marketPortfolio]}
                            shape={(props) => {
                                const { cx, cy } = props;
                                return (
                                    <g>
                                        <rect x={cx - 6} y={cy - 6} width={12} height={12} fill="#3b82f6" stroke="#fff" strokeWidth={2.5} />
                                        <text x={cx} y={cy + 22} textAnchor="middle" fill="#3b82f6" fontSize={11} fontWeight="bold">Market</text>
                                    </g>
                                );
                            }}
                            isAnimationActive={false}
                        />

                        {/* Optimal Portfolio */}
                        {optimalPortfolio && (
                            <Scatter
                                name="Optimal"
                                data={[optimalPortfolio]}
                                shape={(props) => {
                                    const { cx, cy } = props;
                                    // Star shape using polygon
                                    const points = [];
                                    const outerRadius = 8;
                                    const innerRadius = 3;
                                    for (let i = 0; i < 10; i++) {
                                        const radius = i % 2 === 0 ? outerRadius : innerRadius;
                                        const angle = (i * Math.PI) / 5 - Math.PI / 2;
                                        points.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
                                    }
                                    return (
                                        <g>
                                            <polygon points={points.join(' ')} fill="#10b981" stroke="#fff" strokeWidth={2.5} />
                                            <text x={cx} y={cy - 15} textAnchor="middle" fill="#10b981" fontSize={11} fontWeight="bold">Optimal</text>
                                        </g>
                                    );
                                }}
                                isAnimationActive={false}
                            />
                        )}
                    </ScatterChart>
                </ResponsiveContainer>

                {/* Professional Legend with CAPM Interpretation */}
                <div className="mt-6 border-t border-slate-700/30 pt-4">
                    <div className="flex flex-wrap gap-6 justify-center text-xs text-slate-400 mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-0.5 bg-slate-400 border-dashed border-t-2"></div>
                            <span>Security Market Line (SML)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500 border-2 border-white"></div>
                            <span>Market (β=1.0)</span>
                        </div>
                        {optimalPortfolio && (
                            <div className="flex items-center gap-2">
                                <svg width="14" height="14" viewBox="0 0 24 24">
                                    <polygon points="12 2 15 9 22 10 17 15 18 22 12 18 6 22 7 15 2 10 9 9" fill="#10b981" stroke="white" strokeWidth="2" />
                                </svg>
                                <span>Optimal (Max Sharpe)</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-slate-100 border border-slate-600"></div>
                            <span>Individual Assets</span>
                        </div>
                    </div>

                    {/* CAPM Interpretation Guide */}
                    <div className="flex flex-wrap gap-6 justify-center text-xs mt-3 pt-3 border-t border-slate-700/30">
                        <div className="flex items-center gap-2">
                            <span className="text-emerald-400 font-bold">Above SML:</span>
                            <span className="text-slate-400">Undervalued (α &gt; 0)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-bold">On SML:</span>
                            <span className="text-slate-400">Fairly Valued (α ≈ 0)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-rose-400 font-bold">Below SML:</span>
                            <span className="text-slate-400">Overvalued (α &lt; 0)</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}