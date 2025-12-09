import React from 'react';

export default function LoadingSkeleton({ width = '100%', height = '1rem', className = '' }) {
    return (
        <div
            className={`skeleton-shimmer rounded ${className}`}
            style={{ width, height }}
        ></div>
    );
}
