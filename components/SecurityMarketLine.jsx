import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, Label, Cell, ReferenceLine } from 'recharts';

export default function SecurityMarketLine({ data }) {
    if (!data || !data.sml_points || data.sml_points.length === 0) {
        return (
            <div className="flex items-center justify-center h-96 text-slate-400">
                No SML data available (Benchmark data required)
            </div>
        );
    }

    // Debugging
    console.log("SML Data:", data);

    // 1. Format SML Line Points
    const smlPoints = data.sml_points.map(p => ({
        beta: p.beta,
        return: p.return * 100,
        type: 'SML'
    })).sort((a, b) => a.beta - b.beta);

    // 2. Format Individual Assets
    const assets = (data.individual_assets || []).map(p => ({
        beta: p.beta || 0,
        return: p.return * 100,
        name: p.name,
        type: 'Asset'
    }));

    // 3. Optimal Portfolio (Calculate Beta)
    // We need to calculate the portfolio beta: sum(weight_i * beta_i)
    let portfolioBeta = 0;
    let portfolioReturn = 0;

    if (data.optimal_portfolio && data.optimal_portfolio.weights) {
        portfolioReturn = data.optimal_portfolio.return * 100;

        // Calculate weighted beta
        Object.entries(data.optimal_portfolio.weights).forEach(([ticker, weight]) => {
            const asset = data.individual_assets.find(a => a.name === ticker);
            if (asset && asset.beta) {
                portfolioBeta += weight * asset.beta;
            }
        });
    }

    const optimalPortfolio = data.optimal_portfolio ? {
        beta: portfolioBeta,
        return: portfolioReturn,
        name: 'Optimal Portfolio',
        type: 'Optimal Portfolio'
    } : null;

    // 4. Market Portfolio (Beta = 1)
    const marketReturn = data.market_return ? data.market_return * 100 : smlPoints[1].return;
    const marketPortfolio = {
        beta: 1.0,
        return: marketReturn,
        name: 'Market (SPY)',
        type: 'Market'
    };

    // 5. Calculate Axis Domains
    const allPoints = [
        ...smlPoints,
        ...assets,
        ...smlPoints,
        ...assets,
        marketPortfolio
    ];

    const minBeta = Math.min(0, ...allPoints.map(p => p.beta));
    const maxBeta = Math.max(1.5, ...allPoints.map(p => p.beta));
    const minRet = Math.min(0, ...allPoints.map(p => p.return));
    const maxRet = Math.max(marketReturn * 1.2, ...allPoints.map(p => p.return));

    const betaPadding = (maxBeta - minBeta) * 0.1;
    const retPadding = (maxRet - minRet) * 0.1;

    const betaDomain = [
        Math.floor((minBeta - betaPadding) * 10) / 10,
        Math.ceil((maxBeta + betaPadding) * 10) / 10
    ];

    const retDomain = [
        Math.floor((minRet - retPadding) / 5) * 5,
        Math.ceil((maxRet + retPadding) / 5) * 5
    ];

    // Custom Tooltip
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length > 0) {
            const point = payload[0].payload;
            if (point.type === 'SML') return null;

            // Calculate Alpha (Distance from SML)
            // Expected Return (CAPM) = Rf + Beta * (Rm - Rf)
            const rf = smlPoints[0].return;
            const rm = marketReturn;
            const expectedReturn = rf + point.beta * (rm - rf);
            const alpha = point.return - expectedReturn;

            // Valuation Status
            let valuation = "Fairly Valued";
            let valuationColor = "text-slate-400";
            if (Math.abs(alpha) > 0.1) { // 0.1% tolerance
                valuation = alpha > 0 ? "Undervalued" : "Overvalued";
                valuationColor = alpha > 0 ? "text-emerald-400" : "text-rose-400";
            }

            return (
                <div className="bg-slate-900/95 border border-slate-700/50 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden z-50" style={{ minWidth: '240px' }}>
                    <div className="bg-slate-800/80 px-4 py-3 border-b border-slate-700/50 flex justify-between items-center">
                        <p className="text-white font-bold text-sm tracking-wide truncate pr-2">
                            {point.name}
                        </p>
                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${point.type === 'Asset' ? 'bg-slate-700 text-slate-300' :
                                point.type === 'Market' ? 'bg-blue-900/50 text-blue-300 border border-blue-700/30' :
                                    'bg-emerald-900/50 text-emerald-300 border border-emerald-700/30'
                            }`}>
                            {point.type}
                        </span>
                    </div>

                    <div className="p-4 space-y-3">
                        {/* Main Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block mb-0.5">Return</span>
                                <span className="text-white font-mono font-bold text-sm">{point.return.toFixed(2)}%</span>
                            </div>
                            <div>
                                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block mb-0.5">Beta</span>
                                <span className="text-sky-400 font-mono font-bold text-sm">{point.beta.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Alpha / Valuation Section */}
                        <div className="pt-3 border-t border-slate-700/50">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-slate-400 text-xs font-medium">Alpha (Excess Return)</span>
                                <span className={`font-mono font-bold text-sm ${alpha >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {alpha > 0 ? '+' : ''}{alpha.toFixed(2)}%
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 text-xs font-medium">Valuation</span>
                                <span className={`text-xs font-bold ${valuationColor}`}>
                                    {valuation}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    // Custom Shapes
    const StarShape = (props) => {
        const { cx, cy, fill } = props;
        // Simple star path
        const path = "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";
        // Scale and position logic would be needed for a true SVG path, 
        // but Recharts supports 'star' type natively for Scatter, or we can use a simple polygon/symbol.
        // Let's use a simple circle with a distinct stroke for now to ensure reliability, or a diamond.
        return <circle cx={cx} cy={cy} r={6} fill={fill} stroke="#fff" strokeWidth={2} />;
    };

    return (
        <div className="rounded-2xl border border-slate-700/40 overflow-hidden bg-gradient-to-br from-slate-900/40 to-slate-800/20 shadow-xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800/80 to-slate-700/60 px-6 py-5 border-b border-slate-600/30 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-white text-xl tracking-tight">Security Market Line</h3>
                        <p className="text-sm text-slate-300 mt-1.5">
                            Capital Asset Pricing Model (CAPM)
                        </p>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="p-4 sm:p-8">
                <ResponsiveContainer width="100%" height={500}>
                    <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
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
                                value: 'Beta (Systematic Risk)',
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
                                value: 'Expected Return',
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

                        {/* 1. SML Line - Reference Line */}
                        <ReferenceLine
                            segment={[
                                { x: smlPoints[0].beta, y: smlPoints[0].return },
                                { x: smlPoints[smlPoints.length - 1].beta, y: smlPoints[smlPoints.length - 1].return }
                            ]}
                            stroke="#94a3b8"
                            strokeWidth={2}
                            strokeDasharray="6 4"
                            ifOverflow="extendDomain"
                        />

                        {/* Risk Free Label */}
                        <ReferenceDot
                            x={0}
                            y={smlPoints[0].return}
                            r={5}
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

                        {/* 2. Market Portfolio (Square) */}
                        <Scatter
                            name="Market"
                            data={[marketPortfolio]}
                            shape="square"
                            fill="#3b82f6"
                            stroke="#fff"
                            strokeWidth={2}
                        >
                            <LabelList dataKey="name" position="bottom" offset={10} style={{ fill: '#3b82f6', fontSize: '11px', fontWeight: 'bold' }} />
                        </Scatter>

                        {/* 3. Optimal Portfolio (Star/Distinct) */}
                        {optimalPortfolio && (
                            <Scatter
                                name="Optimal Portfolio"
                                data={[optimalPortfolio]}
                                shape="star" // Recharts supports 'star'
                                fill="#10b981"
                                stroke="#fff"
                                strokeWidth={2}
                                r={10} // Make it larger
                            >
                                <LabelList value="Optimal" position="top" offset={10} style={{ fill: '#10b981', fontSize: '11px', fontWeight: 'bold' }} />
                            </Scatter>
                        )}

                        {/* 4. Individual Assets */}
                        <Scatter
                            name="Assets"
                            data={assets}
                            fill="#f8fafc"
                            shape="circle"
                        >
                            {assets.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill="#f8fafc" stroke="#475569" strokeWidth={1} />
                            ))}
                            <LabelList dataKey="name" position="top" offset={8} style={{ fill: '#cbd5e1', fontSize: '10px', fontWeight: '600' }} />
                        </Scatter>

                    </ScatterChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div className="mt-6 flex flex-wrap gap-6 justify-center text-xs text-slate-400 border-t border-slate-700/30 pt-4">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-0.5 bg-slate-400 border-dashed border-t-2 border-slate-400"></div>
                        <span>Security Market Line (SML)</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 border border-white"></div>
                        <span>Market (Beta=1)</span>
                    </div>

                    {optimalPortfolio && (
                        <div className="flex items-center gap-2">
                            {/* Star representation */}
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="#10b981" stroke="white" strokeWidth="2">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                            <span>Optimal Portfolio</span>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-slate-100 border border-slate-600"></div>
                        <span>Individual Assets</span>
                    </div>

                    <div className="flex items-center gap-2 pl-4 border-l border-slate-700">
                        <span className="text-emerald-400 font-bold">Above Line:</span>
                        <span>Undervalued (Alpha &gt; 0)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-rose-400 font-bold">Below Line:</span>
                        <span>Overvalued (Alpha &lt; 0)</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

import { LabelList } from 'recharts';
