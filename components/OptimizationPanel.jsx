import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Shield, Target, PieChart, Sliders, Info, Calendar, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useToast } from "@/components/Toast";

const optimizationMethods = [
    {
        id: "sharpe",
        name: "Max Sharpe Ratio",
        description: "Maximize risk-adjusted returns",
        icon: TrendingUp,
        detail: "Optimizes for the highest return per unit of risk taken. Best for balanced growth."
    },
    {
        id: "min_vol",
        name: "Minimum Volatility",
        description: "Minimize portfolio risk",
        icon: Shield,
        detail: "Seeks the lowest possible portfolio risk. Ideal for conservative investors."
    },
    {
        id: "max_return",
        name: "Max Return",
        description: "Maximize total returns",
        icon: Target,
        detail: "Maximizes expected returns regardless of risk. Aggressive strategy."
    },
    {
        id: "kelly",
        name: "Kelly Criterion",
        description: "Maximize geometric growth",
        icon: TrendingUp,
        detail: "Maximizes expected log returns for optimal long-term wealth growth. Mathematically proven aggressive strategy."
    },
    {
        id: "sortino",
        name: "Max Sortino Ratio",
        description: "Maximize downside-adjusted returns",
        icon: Shield,
        detail: "Like Sharpe, but only penalizes downside volatility. Requires a Minimum Acceptable Return (MAR).",
        requiresMAR: true
    },
    {
        id: "omega",
        name: "Max Omega Ratio",
        description: "Maximize probability of gains",
        icon: Target,
        detail: "Ratio of upside to downside potential relative to MAR. Comprehensive risk-reward measure.",
        requiresMAR: true
    }
];

export default function OptimizationPanel({ assets = [], onOptimizationComplete }) {
    const toast = useToast();

    const showToast = (message, type = "info") => {
        if (toast[type]) {
            toast[type](message);
        } else {
            toast.info(message);
        }
    };
    const [selectedMethod, setSelectedMethod] = useState("sharpe");
    const [tooltipVisible, setTooltipVisible] = useState(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);

    // Configuration state
    const [startYear, setStartYear] = useState("2020");
    const [endYear, setEndYear] = useState("2024");
    const [frequency, setFrequency] = useState("daily");
    const [strategyType, setStrategyType] = useState("long-only");
    const [benchmark, setBenchmark] = useState("SPY");
    const [startingValue, setStartingValue] = useState("10000");
    const [minWeight, setMinWeight] = useState("0");
    const [maxWeight, setMaxWeight] = useState("100");
    const [mar, setMar] = useState("0");  // Minimum Acceptable Return (%) for Sortino/Omega
    const [rebalanceFreq, setRebalanceFreq] = useState("never");  // Rebalancing frequency


    // Generate years array from 1985 to 2025
    const years = Array.from({ length: 2025 - 1985 + 1 }, (_, i) => 1985 + i);

    const handleOptimize = async () => {
        if (assets.length < 2) {
            showToast("Please add at least 2 assets to optimize", "warning");
            return;
        }

        if (parseInt(startYear) >= parseInt(endYear)) {
            showToast("Start year must be before end year", "error");
            return;
        }

        setIsOptimizing(true);

        try {
            const payload = {
                tickers: assets.map(a => a.symbol),
                start_date: `${startYear}-01-01`,
                end_date: `${endYear}-12-31`,
                objective: selectedMethod,
                initial_capital: parseFloat(startingValue),
                benchmark: benchmark || "SPY",
                min_weight: parseFloat(minWeight) / 100,
                max_weight: parseFloat(maxWeight) / 100,
                frequency: frequency,
                mar: parseFloat(mar) / 100,  // Convert percentage to decimal
                rebalance_freq: rebalanceFreq  // Portfolio rebalancing
            };

            const response = await fetch('/api/optimize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                let errorMessage = 'Optimization failed';
                try {
                    const contentType = response.headers.get("content-type");
                    if (contentType && contentType.indexOf("application/json") !== -1) {
                        const errorData = await response.json();
                        errorMessage = errorData.detail || errorMessage;
                    } else {
                        const text = await response.text();
                        console.error("Non-JSON error response:", text);
                        errorMessage = `Server Error (${response.status}): Please try again later.`;
                    }
                } catch (e) {
                    console.error("Error parsing error response:", e);
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();

            // Transform backend data to frontend format
            const results = {
                metrics: {
                    expectedReturn: (data.backtest.metrics.annualized_return || 0) * 100,
                    volatility: (data.backtest.metrics.annualized_volatility || 0) * 100,
                    sharpeRatio: data.backtest.metrics.sharpe_ratio || 0,
                    sortinoRatio: data.backtest.metrics.sortino_ratio || 0,
                    maxDrawdown: (data.backtest.metrics.max_drawdown || 0) * 100,
                    alpha: (data.backtest.metrics.alpha || 0) * 100,
                    beta: data.backtest.metrics.beta || 0,
                    bestYear: (data.backtest.metrics.best_year || 0) * 100,
                    worstYear: (data.backtest.metrics.worst_year || 0) * 100,
                    startBalance: parseFloat(startingValue),
                    endBalance: parseFloat(startingValue) * (1 + (data.backtest.metrics.total_return || 0)),

                    // Comprehensive Metrics (Convert to %)
                    arithmetic_mean_monthly: (data.backtest.metrics.arithmetic_mean_monthly || 0),
                    arithmetic_mean_annualized: (data.backtest.metrics.arithmetic_mean_annualized || 0) * 100,
                    geometric_mean_monthly: (data.backtest.metrics.geometric_mean_monthly || 0),
                    geometric_mean_annualized: (data.backtest.metrics.geometric_mean_annualized || 0) * 100,
                    std_dev_monthly: (data.backtest.metrics.std_dev_monthly || 0),
                    std_dev_annualized: (data.backtest.metrics.std_dev_annualized || 0) * 100,
                    downside_dev_monthly: (data.backtest.metrics.downside_dev_monthly || 0),
                    benchmark_correlation: data.backtest.metrics.benchmark_correlation || 0,
                    treynor_ratio: (data.backtest.metrics.treynor_ratio || 0) * 100
                },
                weights: Object.entries(data.optimization.weights || {}).map(([asset, weight]) => ({
                    asset,
                    weight: weight * 100,
                    color: `hsl(${Math.random() * 360}, 70%, 50%)`
                })),
                chartData: data.backtest.chart_data || [],
                performance: (data.backtest.chart_data || []).map(d => ({
                    date: d.date,
                    value: d.value
                })),
                drawdown: (data.backtest.chart_data || []).map(d => ({
                    date: d.date,
                    drawdown: d.drawdown
                })),
                assets: Object.keys(data.optimization.weights || {}),
                trailingReturns: data.backtest?.trailing_returns || {},
                monthlyReturns: data.backtest?.monthly_returns || {},
                drawdowns: data.backtest?.drawdowns || [],
                correlations: data.backtest?.correlations || {},
                assetMetrics: data.backtest?.asset_metrics || {},
                efficientFrontier: data.efficient_frontier || null
            };

            onOptimizationComplete(results);
            showToast("Portfolio optimized successfully!", "success");
        } catch (error) {
            console.error("Optimization error:", error);
            showToast(error.message || "Failed to optimize portfolio", "error");
        } finally {
            setIsOptimizing(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Configuration</h2>
                <p className="text-slate-400">Set up your optimization parameters</p>
            </div>

            {/* Year Range */}
            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-slate-500 mb-1.5 block">Start Year</label>
                        <select
                            value={startYear}
                            onChange={(e) => setStartYear(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%2394a3b8%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:1.5em] bg-[center_right_0.5em] bg-no-repeat pr-10"
                        >
                            {years.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 mb-1.5 block">End Year</label>
                        <select
                            value={endYear}
                            onChange={(e) => setEndYear(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%2394a3b8%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:1.5em] bg-[center_right_0.5em] bg-no-repeat pr-10"
                        >
                            {years.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Data Frequency */}
            <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Data Frequency</label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => setFrequency("daily")}
                        className={`py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${frequency === "daily"
                            ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                            : "bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600"
                            }`}
                    >
                        Daily
                    </button>
                    <button
                        onClick={() => setFrequency("monthly")}
                        className={`py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${frequency === "monthly"
                            ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                            : "bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600"
                            }`}
                    >
                        Monthly
                    </button>
                </div>
            </div>

            {/* Strategy Type Toggle */}
            <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Strategy Type</label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => {
                            setStrategyType("long-only");
                            setMinWeight("0");
                        }}
                        className={`py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${strategyType === "long-only"
                            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                            : "bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600"
                            }`}
                    >
                        Long Only
                    </button>
                    <button
                        onClick={() => {
                            setStrategyType("long-short");
                            setMinWeight("-100");
                        }}
                        className={`py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${strategyType === "long-short"
                            ? "bg-purple-500 text-white shadow-lg shadow-purple-500/30"
                            : "bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600"
                            }`}
                    >
                        Long-Short
                    </button>
                </div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-700/50"></div>

            {/* Optimization Method */}
            <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Optimization Objective</label>
                <div className="grid grid-cols-1 gap-2">
                    {optimizationMethods.map((method) => {
                        const Icon = method.icon;
                        const isSelected = selectedMethod === method.id;

                        return (
                            <div
                                key={method.id}
                                onClick={() => setSelectedMethod(method.id)}
                                className={`relative p-3 rounded-lg border cursor-pointer transition-all duration-200 ${isSelected
                                    ? 'bg-blue-500/10 border-blue-500'
                                    : 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    {/* Icon */}
                                    <div className={`p-2 rounded-lg transition-colors ${isSelected ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700/50 text-slate-400'
                                        }`}>
                                        <Icon className="w-4 h-4" />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className={`font-medium text-sm ${isSelected ? 'text-blue-300' : 'text-white'}`}>
                                            {method.name}
                                        </h3>
                                        <p className="text-xs text-slate-500">{method.description}</p>
                                    </div>

                                    {/* Info Icon with Tooltip */}
                                    <div
                                        className="relative"
                                        onMouseEnter={() => setTooltipVisible(method.id)}
                                        onMouseLeave={() => setTooltipVisible(null)}
                                    >
                                        <Info className={`w-3.5 h-3.5 transition-colors ${isSelected ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
                                            }`} />

                                        {/* Tooltip */}
                                        {tooltipVisible === method.id && (
                                            <div className="absolute right-0 top-6 w-56 p-2.5 rounded-lg bg-slate-900 border border-slate-700 shadow-xl z-50">
                                                <p className="text-xs text-slate-300 leading-relaxed">
                                                    {method.detail}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Radio indicator */}
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-blue-500' : 'border-slate-600'
                                        }`}>
                                        {isSelected && (
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Advanced Options */}
            <div className="space-y-3">
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:border-slate-600 transition-all text-sm font-medium text-slate-300"
                >
                    <span>Advanced Options</span>
                    {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                <AnimatePresence>
                    {showAdvanced && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="overflow-hidden"
                        >
                            <div className="space-y-4 p-4 rounded-lg bg-slate-800/20 border border-slate-700/30">
                                {/* Benchmark */}
                                <div>
                                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 block">
                                        Benchmark (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={benchmark}
                                        onChange={(e) => setBenchmark(e.target.value.toUpperCase())}
                                        placeholder="e.g., SPY"
                                        className="w-full px-4 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                    <p className="text-xs text-slate-500 mt-1.5">For alpha, beta, and tracking error calculations</p>
                                </div>

                                {/* Starting Value */}
                                <div>
                                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 block">
                                        Portfolio Starting Value
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                                        <input
                                            type="number"
                                            value={startingValue}
                                            onChange={(e) => setStartingValue(e.target.value)}
                                            className="w-full pl-8 pr-4 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1.5">Initial portfolio value for backtesting</p>
                                </div>

                                {/* Weight Bounds */}
                                <div>
                                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 block">
                                        Weight Bounds (Per Asset)
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-slate-500 mb-1.5 block">Min %</label>
                                            <input
                                                type="number"
                                                value={minWeight}
                                                onChange={(e) => setMinWeight(e.target.value)}
                                                min="0"
                                                max="100"
                                                className="w-full px-4 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 mb-1.5 block">Max %</label>
                                            <input
                                                type="number"
                                                value={maxWeight}
                                                onChange={(e) => setMaxWeight(e.target.value)}
                                                min="0"
                                                max="100"
                                                className="w-full px-4 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1.5">Minimum and maximum allocation per asset</p>
                                </div>
                            </div>

                            {/* MAR Input (only for Sortino/Omega) */}
                            {optimizationMethods.find(m => m.id === selectedMethod)?.requiresMAR && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="space-y-3"
                                >
                                    <label className="text-sm font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-2">
                                        <Target className="w-4 h-4" />
                                        Minimum Acceptable Return (MAR)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={mar}
                                            onChange={(e) => setMar(e.target.value)}
                                            step="0.5"
                                            min="0"
                                            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all pr-12"
                                            placeholder="0.0"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">%</span>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        Threshold return for downside calculations. Common values: 0% (no loss) or ~4.5% (risk-free rate).
                                    </p>
                                </motion.div>
                            )}

                            {/* Rebalancing Frequency */}
                            <div className="space-y-3 p-4 rounded-lg bg-slate-800/20 border border-slate-700/30 mt-4">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">
                                    Rebalancing Strategy
                                </label>
                                <select
                                    value={rebalanceFreq}
                                    onChange={(e) => setRebalanceFreq(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                                >
                                    <option value="never">Buy & Hold (No Rebalancing)</option>
                                    <option value="monthly">Monthly Rebalancing</option>
                                    <option value="quarterly">Quarterly Rebalancing</option>
                                    <option value="annual">Annual Rebalancing</option>
                                </select>
                                <p className="text-xs text-slate-500">
                                    Compare buy-and-hold vs. periodic rebalancing. Transaction costs: 0.1% per trade.
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Optimize Button */}
            <button
                onClick={handleOptimize}
                disabled={isOptimizing || assets.length < 2}
                className={`w-full py-4 rounded-xl font-semibold shadow-lg transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center gap-2 ${isOptimizing || assets.length < 2
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed shadow-none hover:scale-100'
                    : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-blue-500/30 hover:shadow-blue-500/50'
                    }`}
            >
                {isOptimizing ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Optimizing...
                    </>
                ) : (
                    "Optimize Portfolio"
                )}
            </button>

            {/* Info Note */}
            <div className="flex gap-3 p-3 rounded-lg bg-slate-800/20 border border-slate-700/30">
                <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-400 leading-relaxed">
                    Optimization requires at least 2 assets and valid date range. Results will display below.
                </p>
            </div>
        </div >
    );
}
