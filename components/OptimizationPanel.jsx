import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Shield, Target, PieChart, Sliders, Info, Calendar, ChevronDown, ChevronUp, Loader2, Activity } from "lucide-react";
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
    },
    {
        id: "treynor",
        name: "Max Treynor Ratio",
        description: "Maximize systematic risk-adjusted returns",
        icon: Activity,
        detail: "Like Sharpe but uses beta (market risk) instead of total risk. Best when portfolio is part of larger holdings or comparing against benchmark."
    }
];

export default function OptimizationPanel({ assets = [], onOptimizationComplete, onOptimizationStart }) {
    const toast = useToast();
    const router = useRouter();

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
    const [optimizationProgress, setOptimizationProgress] = useState("");

    // Progress stages for visual feedback
    const progressStages = [
        "Fetching historical data...",
        "Calculating covariance matrix...",
        "Running optimization...",
        "Computing efficient frontier...",
        "Backtesting portfolio...",
        "Generating results..."
    ];

    // Configuration state
    const [startYear, setStartYear] = useState("1985");
    const currentYear = new Date().getFullYear();
    const [endYear, setEndYear] = useState(String(currentYear));
    const [frequency, setFrequency] = useState("daily");
    const [strategyType, setStrategyType] = useState("long-only");
    const [benchmark, setBenchmark] = useState("SPY");
    const [startingValue, setStartingValue] = useState("10000");
    const [minWeight, setMinWeight] = useState("0");
    const [maxWeight, setMaxWeight] = useState("100");
    const [mar, setMar] = useState("0");  // Minimum Acceptable Return (%) for Sortino/Omega
    const [rebalanceFreq, setRebalanceFreq] = useState("never");  // Rebalancing frequency


    // Generate years array from 1985 to current year
    const years = Array.from({ length: currentYear - 1985 + 1 }, (_, i) => 1985 + i);

    const handleOptimize = async () => {
        if (assets.length < 2) {
            showToast("Please add at least 2 assets to optimize", "warning");
            return;
        }

        if (parseInt(startYear) >= parseInt(endYear)) {
            showToast("Start year must be before end year", "error");
            return;
        }

        if (onOptimizationStart) onOptimizationStart();
        setIsOptimizing(true);
        setOptimizationProgress(progressStages[0]);

        // Cycle through progress stages while waiting
        let progressIndex = 0;
        const progressInterval = setInterval(() => {
            progressIndex = (progressIndex + 1) % progressStages.length;
            setOptimizationProgress(progressStages[progressIndex]);
        }, 2000); // Change every 2 seconds

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

            // Check for warnings
            if (data.warnings && data.warnings.length > 0) {
                data.warnings.forEach(warning => {
                    showToast(warning, "warning");
                });
            }

            // Transform backend data to frontend format
            const results = {
                metrics: {
                    // USE OPTIMIZATION METRICS (Expected) for return, vol, Sharpe to match Charts tab
                    expectedReturn: (data.optimization.metrics.expected_return || 0) * 100,
                    volatility: (data.optimization.metrics.volatility || 0) * 100,
                    sharpeRatio: data.optimization.metrics.sharpe_ratio || 0,

                    // USE BACKTEST METRICS (Realized) for other historical metrics
                    realizedCAGR: (data.backtest.metrics.annualized_return || 0) * 100,  // Actual CAGR from backtest
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
                    treynor_ratio: (data.backtest.metrics.treynor_ratio || 0) * 100,

                    // Advanced Risk Metrics
                    calmar_ratio: data.backtest.metrics.calmar_ratio || 0,
                    var_95_daily: data.backtest.metrics.var_95_daily || 0,
                    var_99_daily: data.backtest.metrics.var_99_daily || 0,
                    cvar_95_daily: data.backtest.metrics.cvar_95_daily || 0,
                    cvar_99_daily: data.backtest.metrics.cvar_99_daily || 0,
                    var_95_annual: data.backtest.metrics.var_95_annual || 0,
                    var_99_annual: data.backtest.metrics.var_99_annual || 0,
                    skewness: data.backtest.metrics.skewness || 0,
                    kurtosis: data.backtest.metrics.kurtosis || 0,

                    // Benchmark Metrics
                    information_ratio: data.backtest.metrics.information_ratio || 0,
                    up_capture: data.backtest.metrics.up_capture || 0,
                    down_capture: data.backtest.metrics.down_capture || 0,
                    r_squared: data.backtest.metrics.r_squared || 0
                },
                weights: Object.entries(data.optimization.weights || {}).map(([asset, weight]) => ({
                    asset,
                    weight: weight * 100,
                    color: `hsl(${Math.random() * 360}, 70%, 50%)`
                })),
                benchmark: benchmark, // Pass selected benchmark to results
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
                efficientFrontier: data.efficient_frontier || null,
                risk_contributions: data.backtest?.risk_contributions || {},
                rebalancing: data.rebalancing || null
            };

            onOptimizationComplete(results);

            // Show toast after results section is rendered
            setTimeout(() => {
                toast.success("Portfolio optimized successfully! Click to view results.", 4000, () => {
                    // Navigate to portfolio page first
                    router.push('/portfolio');
                    // Then scroll after a short delay to ensure page has loaded
                    setTimeout(() => {
                        document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
                    }, 300);
                });
            }, 100);
        } catch (error) {
            console.error("Optimization error:", error);
            showToast(error.message || "Failed to optimize portfolio", "error");
        } finally {
            clearInterval(progressInterval);
            setOptimizationProgress("");
            setIsOptimizing(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Configuration</h2>
                <p className="text-slate-400">Set up your optimization parameters and constraints.</p>
            </div>

            {/* Main Configuration Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Time Period */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        Time Period
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="relative">
                            <select
                                value={startYear}
                                onChange={(e) => setStartYear(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer appearance-none hover:bg-slate-800/80"
                            >
                                {years.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                        </div>
                        <div className="relative">
                            <select
                                value={endYear}
                                onChange={(e) => setEndYear(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer appearance-none hover:bg-slate-800/80"
                            >
                                {years.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Data Frequency */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Activity className="w-3 h-3" />
                        Data Frequency
                    </label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <button
                            onClick={() => setFrequency("daily")}
                            className={`py-2 px-4 rounded-lg font-medium text-sm transition-all ${frequency === "daily"
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            Daily
                        </button>
                        <button
                            onClick={() => setFrequency("monthly")}
                            className={`py-2 px-4 rounded-lg font-medium text-sm transition-all ${frequency === "monthly"
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            Monthly
                        </button>
                    </div>
                </div>
            </div>

            {/* Strategy Type */}
            <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="w-3 h-3" />
                    Strategy Type
                </label>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => {
                            setStrategyType("long-only");
                            setMinWeight("0");
                        }}
                        className={`relative p-4 rounded-xl border-2 text-left transition-all ${strategyType === "long-only"
                            ? "bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/20"
                            : "bg-slate-800/30 border-slate-700/50 hover:border-slate-600"
                            }`}
                    >
                        <div className={`font-bold mb-1 ${strategyType === "long-only" ? "text-emerald-400" : "text-white"}`}>Long Only</div>
                        <div className="text-xs text-slate-500">Traditional buy & hold strategy. No short selling allowed.</div>
                        {strategyType === "long-only" && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
                    </button>
                    <button
                        onClick={() => {
                            setStrategyType("long-short");
                            setMinWeight("-100");
                        }}
                        className={`relative p-4 rounded-xl border-2 text-left transition-all ${strategyType === "long-short"
                            ? "bg-purple-500/10 border-purple-500/50 ring-1 ring-purple-500/20"
                            : "bg-slate-800/30 border-slate-700/50 hover:border-slate-600"
                            }`}
                    >
                        <div className={`font-bold mb-1 ${strategyType === "long-short" ? "text-purple-400" : "text-white"}`}>Long-Short</div>
                        <div className="text-xs text-slate-500">Allow short positions to hedge risk or leverage views.</div>
                        {strategyType === "long-short" && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />}
                    </button>
                </div>
            </div>

            <div className="border-t border-slate-700/50"></div>

            {/* Optimization Method */}
            <div className="space-y-4">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Target className="w-3 h-3" />
                    Optimization Objective
                </label>
                <div className="grid grid-cols-1 gap-3">
                    {optimizationMethods.map((method) => {
                        const Icon = method.icon;
                        const isSelected = selectedMethod === method.id;

                        return (
                            <div
                                key={method.id}
                                onClick={() => setSelectedMethod(method.id)}
                                className={`relative p-4 rounded-xl border cursor-pointer transition-all duration-200 group ${isSelected
                                    ? 'bg-blue-500/10 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                                    : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/50'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-2.5 rounded-xl transition-colors ${isSelected ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700/30 text-slate-400 group-hover:text-slate-300'
                                        }`}>
                                        <Icon className="w-5 h-5" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h3 className={`font-bold text-sm mb-0.5 ${isSelected ? 'text-blue-300' : 'text-white'}`}>
                                            {method.name}
                                        </h3>
                                        <p className="text-xs text-slate-500">{method.description}</p>
                                    </div>

                                    <div
                                        className="relative p-2 -mr-2 hover:bg-white/5 rounded-full transition-colors"
                                        onMouseEnter={() => setTooltipVisible(method.id)}
                                        onMouseLeave={() => setTooltipVisible(null)}
                                    >
                                        <Info className={`w-4 h-4 transition-colors ${isSelected ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
                                            }`} />

                                        <AnimatePresence>
                                            {tooltipVisible === method.id && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.95, x: 10 }}
                                                    animate={{ opacity: 1, scale: 1, x: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    className="absolute right-full top-1/2 -translate-y-1/2 mr-3 w-64 p-3 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl z-50 backdrop-blur-xl"
                                                >
                                                    <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-slate-900 border-t border-r border-slate-700 rotate-45 transform"></div>
                                                    <p className="text-xs text-slate-300 leading-relaxed relative z-10">
                                                        {method.detail}
                                                    </p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-blue-500' : 'border-slate-600 group-hover:border-slate-500'
                                        }`}>
                                        {isSelected && (
                                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
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
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-800/30 border border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/50 transition-all text-sm font-bold text-slate-300 group"
                >
                    <span className="flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-slate-500 group-hover:text-slate-400 transition-colors" />
                        Advanced Options
                    </span>
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
                            <div className="space-y-6 p-6 rounded-xl bg-slate-800/20 border border-slate-700/30 mt-2">
                                {/* Benchmark */}
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                                        Benchmark (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={benchmark}
                                        onChange={(e) => setBenchmark(e.target.value.toUpperCase())}
                                        placeholder="e.g., SPY"
                                        className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                    <p className="text-xs text-slate-500 mt-2">Used for calculating Alpha, Beta, and Tracking Error.</p>
                                </div>

                                {/* Starting Value */}
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                                        Initial Capital
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                                        <input
                                            type="number"
                                            value={startingValue}
                                            onChange={(e) => setStartingValue(e.target.value)}
                                            className="w-full pl-8 pr-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono"
                                        />
                                    </div>
                                </div>

                                {/* Weight Bounds */}
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                                        Asset Weight Limits
                                    </label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-slate-500 mb-1.5 block">Minimum %</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={minWeight}
                                                    onChange={(e) => setMinWeight(e.target.value)}
                                                    min="0"
                                                    max="100"
                                                    className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono"
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 mb-1.5 block">Maximum %</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={maxWeight}
                                                    onChange={(e) => setMaxWeight(e.target.value)}
                                                    min="0"
                                                    max="100"
                                                    className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono"
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* MAR Input (only for Sortino/Omega) */}
                                {optimizationMethods.find(m => m.id === selectedMethod)?.requiresMAR && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="pt-2"
                                    >
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <Target className="w-3 h-3" />
                                            Minimum Acceptable Return (MAR)
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={mar}
                                                onChange={(e) => setMar(e.target.value)}
                                                step="0.5"
                                                min="0"
                                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all pr-12 font-mono"
                                                placeholder="0.0"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">%</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-2">
                                            Threshold return for downside calculations (e.g., Risk-Free Rate ~4.5%).
                                        </p>
                                    </motion.div>
                                )}

                                {/* Rebalancing Frequency */}
                                <div className="pt-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                                        Rebalancing Strategy
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={rebalanceFreq}
                                            onChange={(e) => setRebalanceFreq(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer hover:bg-slate-800/80"
                                        >
                                            <option value="never">Buy & Hold (No Rebalancing)</option>
                                            <option value="monthly">Monthly Rebalancing</option>
                                            <option value="quarterly">Quarterly Rebalancing</option>
                                            <option value="annual">Annual Rebalancing</option>
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Optimize Button */}
            <button
                onClick={handleOptimize}
                disabled={isOptimizing || assets.length < 2}
                className={`w-full py-5 rounded-2xl font-bold text-lg shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 ${isOptimizing || assets.length < 2
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none hover:scale-100 border border-slate-700'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40'
                    }`}
            >
                {isOptimizing ? (
                    <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="min-w-[200px] text-center">{optimizationProgress || "Optimizing..."}</span>
                    </>
                ) : (
                    <>
                        <TrendingUp className="w-6 h-6" />
                        Optimize Portfolio
                    </>
                )}
            </button>

            {/* Info Note */}
            {assets.length < 2 && (
                <div className="flex gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-200/80 leading-relaxed">
                        Add at least <strong>{2 - assets.length} more asset{2 - assets.length > 1 ? 's' : ''}</strong> to enable optimization.
                    </p>
                </div>
            )}
        </div >
    );
}
