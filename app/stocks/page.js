"use client";

import { motion } from "framer-motion";
import StockViewer from "@/components/StockViewer";

export default function StocksPage() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="min-h-screen pt-12 pb-12"
        >
            <StockViewer />
        </motion.div>
    );
}
