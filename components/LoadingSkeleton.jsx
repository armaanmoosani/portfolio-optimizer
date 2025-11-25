import React from 'react';

export default function LoadingSkeleton({ width = '100%', height = '1rem', className = '' }) {
    return (
        <div
            className={`bg-slate-700 animate-pulse rounded ${className}`}
            style={{ width, height }}
        ></div>
    );
}
