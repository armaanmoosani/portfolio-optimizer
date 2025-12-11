import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const Digit = ({ value }) => {
    return (
        <div className="relative h-[1em] w-[0.6em] overflow-hidden inline-block">
            <span className="invisible absolute top-0 left-0">8</span>
            <motion.div
                className="absolute top-0 left-0 flex flex-col items-center w-full"
                initial={{ y: 0 }}
                animate={{ y: `-${value * 10}%` }}
                transition={{
                    type: "spring",
                    stiffness: 1000,
                    damping: 50
                }}
            >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                    <span key={i} className="h-[1em] flex items-center justify-center">
                        {i}
                    </span>
                ))}
            </motion.div>
        </div>
    );
};

export default function AnimatedPrice({ value, className = "" }) {
    const formatted = Math.abs(value).toFixed(2);
    const parts = formatted.split('');

    return (
        <div className={`flex items-center overflow-hidden h-[1.2em] ${className}`}>
            {parts.map((char, index) => {
                if (!isNaN(parseInt(char))) {
                    return <Digit key={index} value={parseInt(char)} />;
                }
                return (
                    <span key={index} className="inline-block">
                        {char}
                    </span>
                );
            })}
        </div>
    );
}
