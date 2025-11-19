"use client";

import { motion } from "framer-motion";
import StockViewer from "@/components/StockViewer";

export default function StocksPage() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="min-h-screen pt-24 pb-12"
        >
            <div className="text-center mb-12">
                <p className="text-slate-400">
                    Real-time data and AI-powered insights for any ticker.
                </p>
            </div>
            <StockViewer />
        </motion.div>
    );
}
