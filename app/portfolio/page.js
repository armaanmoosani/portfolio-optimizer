"use client";

import { motion, AnimatePresence } from "framer-motion";
import PortfolioBuilder from "@/components/PortfolioBuilder";
import OptimizationPanel from "@/components/OptimizationPanel";
import PortfolioResults from "@/components/PortfolioResults";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { useGlobalState } from "@/app/context/GlobalState";

export default function PortfolioPage() {
    const {
        assets,
        addAsset,
        removeAsset,
        optimizationResults,
        isOptimizing,
        startOptimization,
        completeOptimization
    } = useGlobalState();

    const handleOptimizationComplete = (results) => {
        completeOptimization(results);
        // Scroll to results
        setTimeout(() => {
            document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="container mx-auto px-4 py-8 max-w-7xl space-y-8"
        >
            {/* Input Section */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
            >
                <div className="text-center mb-8">
                    <p className="text-slate-400">Build your portfolio, configure optimization parameters, and analyze results</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Portfolio Builder - Takes 2 columns on large screens */}
                    <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-md shadow-xl">
                        <PortfolioBuilder
                            assets={assets}
                            onAddAsset={addAsset}
                            onRemoveAsset={removeAsset}
                        />
                    </div>

                    {/* Optimization Panel */}
                    <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-md shadow-xl">
                        <OptimizationPanel
                            assets={assets}
                            onOptimizationComplete={handleOptimizationComplete}
                            onOptimizationStart={startOptimization}
                        />
                    </div>
                </div>
            </motion.div>

            {/* Results Section */}
            <AnimatePresence mode="wait">
                {isOptimizing && (
                    <motion.div
                        key="skeleton"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="border-t border-slate-700/50 pt-8"
                    >
                        <LoadingSkeleton />
                    </motion.div>
                )}

                {!isOptimizing && optimizationResults && (
                    <motion.div
                        key="results"
                        id="results-section"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-slate-700/50 pt-8"
                    >
                        <h2 className="text-2xl font-bold text-white mb-6">Optimization Results</h2>
                        <PortfolioResults data={optimizationResults} />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
