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

            return (
                <div className="bg-slate-900/98 border-2 border-slate-600/50 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden z-50" style={{ minWidth: '220px' }}>
                    <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-3 border-b border-slate-600/50 flex justify-between items-center">
                        <p className="text-white font-bold text-sm tracking-wide">
                            {point.name}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded ${point.type === 'Asset' ? 'bg-slate-600 text-white' : 'bg-emerald-600 text-white'}`}>
                            {point.type}
                        </span>
                    </div>
                    <div className="p-4 space-y-2.5">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-300 text-xs font-medium">Return</span>
                            <span className="text-emerald-400 font-mono font-bold text-sm">{point.return.toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-300 text-xs font-medium">Beta</span>
                            <span className="text-sky-400 font-mono font-bold text-sm">{point.beta.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-slate-700/50 pt-2 mt-2">
                            <span className="text-slate-300 text-xs font-medium">Alpha (Excess)</span>
                            <span className={`font-mono font-bold text-sm ${alpha >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {alpha > 0 ? '+' : ''}{alpha.toFixed(2)}%
                            </span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="rounded-2xl border border-slate-700/40 overflow-hidden bg-gradient-to-br from-slate-900/40 to-slate-800/20 shadow-xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800/80 to-slate-700/60 px-6 py-5 border-b border-slate-600/30 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-white text-xl tracking-tight">Security Market Line</h3>
                        <p className="text-sm text-slate-300 mt-1.5">
                            Asset Valuation (CAPM)
                        </p>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="p-4 sm:p-8">
                <ResponsiveContainer width="100%" height={500}>
                    <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
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
                            position={{ x: 0, y: 0 }}
                            allowEscapeViewBox={{ x: true, y: true }}
                            wrapperStyle={{ top: -10, left: 0, right: 0, zIndex: 100 }}
                        />

                        {/* 1. SML Line - Reference Line */}
                        <ReferenceLine
                            segment={[
                                { x: smlPoints[0].beta, y: smlPoints[0].return },
                                { x: smlPoints[smlPoints.length - 1].beta, y: smlPoints[smlPoints.length - 1].return }
                            ]}
                            stroke="#ffffff"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            ifOverflow="extendDomain"
                        />
                        <ReferenceDot
                            x={0}
                            y={smlPoints[0].return}
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


                        <Scatter
                            name="Market"
                            data={[marketPortfolio]} // We need to access marketPortfolio from scope
                            fill="rgba(255,255,255,0.01)"
                            stroke="none"
                            shape="circle"
                            legendType="none"
                            style={{ pointerEvents: 'all' }}
                        >
                            <Cell r={10} />
                        </Scatter>

                        {/* 2. Individual Assets */}
                        <Scatter
                            name="Assets"
                            data={assets}
                            fill="#f8fafc"
                            shape="circle"
                        >
                            {assets.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill="#f8fafc" stroke="#475569" />
                            ))}
                            <LabelList dataKey="name" position="top" offset={5} style={{ fill: '#cbd5e1', fontSize: '10px', fontWeight: 'bold' }} />
                        </Scatter>

                        {/* 3. Market Portfolio */}
                        <ReferenceDot
                            x={1.0}
                            y={marketReturn}
                            r={6}
                            fill="#3b82f6"
                            stroke="#fff"
                            strokeWidth={2}
                            shape="square"
                            isFront={true}
                        >
                            <Label
                                value="Market"
                                position="bottom"
                                fill="#3b82f6"
                                fontSize={11}
                                fontWeight="bold"
                                offset={10}
                            />
                        </ReferenceDot>


                    </ScatterChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div className="mt-6 flex flex-wrap gap-4 justify-center text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-0.5 bg-slate-400 border-dashed border-t border-slate-400"></div>
                        <span>Security Market Line (SML)</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 border border-white"></div>
                        <span>Market (Beta=1)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-slate-100 border border-slate-600"></div>
                        <span>Individual Assets</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

import { LabelList } from 'recharts';
