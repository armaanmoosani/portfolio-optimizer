"use client";

import { motion } from "framer-motion";

export default function AboutPage() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="container mx-auto px-4 py-24 max-w-4xl"
        >
            <div className="text-center">
                <h1 className="text-4xl font-bold text-white mb-4">About</h1>
                <p className="text-slate-400 text-lg mb-8">
                </p>
                <div className="p-8 rounded-2xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-md">
                    <p className="text-slate-300 leading-relaxed">
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
