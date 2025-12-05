"use client";

import { motion } from "framer-motion";

export default function Home() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex items-center justify-center min-h-screen"
        >
            <div className="text-center">
                <h1 className="text-4xl font-bold text-white mb-4">Portfolio Optimizer</h1>
                <div className="flex items-center justify-center gap-3 text-slate-500 text-sm">
                    <div className="flex gap-1">
                        <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-700 font-mono text-xs">←</kbd>
                        <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-700 font-mono text-xs">→</kbd>
                    </div>
                    <span>Use arrow keys to navigate</span>
                </div>
            </div>
        </motion.div>
    );
}
