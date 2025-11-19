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
                <h1 className="text-4xl font-bold text-white mb-4">Welcome to Portfolio Optimizer</h1>
                <p className="text-slate-400">Navigate using the menu above to get started</p>
            </div>
        </motion.div>
    );
}
