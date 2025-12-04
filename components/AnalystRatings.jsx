import React from 'react';

export default function AnalystRatings({ recommendations }) {
    if (!recommendations) return null;

    const { strongBuy = 0, buy = 0, hold = 0, sell = 0, strongSell = 0 } = recommendations;
    const total = strongBuy + buy + hold + sell + strongSell;

    if (total === 0) return null;

    const buyPercent = ((strongBuy + buy) / total) * 100;
    const holdPercent = (hold / total) * 100;
    const sellPercent = ((sell + strongSell) / total) * 100;

    // Determine consensus label
    let consensus = "Hold";
    if (buyPercent > 50) consensus = "Buy";
    if (buyPercent > 75) consensus = "Strong Buy";
    if (sellPercent > 50) consensus = "Sell";
    if (sellPercent > 75) consensus = "Strong Sell";

    return (
        <div className="glass-panel rounded-3xl p-8 border border-white/5 bg-slate-900/40">
            <h3 className="text-xl font-bold text-white mb-6">Analyst Ratings</h3>

            <div className="flex items-center justify-between mb-6">
                <div className="flex flex-col">
                    <span className="text-sm text-slate-400 font-medium uppercase tracking-wider">Consensus</span>
                    <span className={`text-3xl font-bold ${consensus.includes('Buy') ? 'text-emerald-400' :
                            consensus.includes('Sell') ? 'text-rose-400' : 'text-amber-400'
                        }`}>
                        {consensus}
                    </span>
                </div>
                <div className="text-right">
                    <span className="text-sm text-slate-400 font-medium uppercase tracking-wider">Analysts</span>
                    <span className="text-3xl font-bold text-white block">{total}</span>
                </div>
            </div>

            {/* Bar Chart */}
            <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden flex mb-4">
                <div style={{ width: `${buyPercent}%` }} className="bg-emerald-500 h-full" />
                <div style={{ width: `${holdPercent}%` }} className="bg-amber-500 h-full" />
                <div style={{ width: `${sellPercent}%` }} className="bg-rose-500 h-full" />
            </div>

            {/* Legend */}
            <div className="flex justify-between text-xs font-medium text-slate-400">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    Buy ({Math.round(buyPercent)}%)
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    Hold ({Math.round(holdPercent)}%)
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                    Sell ({Math.round(sellPercent)}%)
                </div>
            </div>
        </div>
    );
}
