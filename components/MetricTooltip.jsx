import React from 'react';
import { HelpCircle } from 'lucide-react';

const MetricTooltip = ({ title, description, formula, align = 'left' }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [position, setPosition] = React.useState({ top: 0, left: 0 });
    const buttonRef = React.useRef(null);

    const updatePosition = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            // Default to showing below the button
            let top = rect.bottom + 10;
            let left = rect.left;

            // Adjust for alignment
            if (align === 'right') {
                left = rect.right - 320; // 320px is w-80
            }

            // Prevent going off screen (right edge)
            if (left + 320 > window.innerWidth) {
                left = window.innerWidth - 340;
            }
            // Prevent going off screen (left edge)
            if (left < 10) {
                left = 10;
            }

            setPosition({ top, left });
        }
    };

    React.useEffect(() => {
        if (isOpen) {
            updatePosition();
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
        }
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen]);

    return (
        <div className="relative inline-block">
            <button
                ref={buttonRef}
                onMouseEnter={() => {
                    updatePosition();
                    setIsOpen(true);
                }}
                onMouseLeave={() => setIsOpen(false)}
                className="ml-2 text-slate-500 hover:text-slate-300 transition-colors"
            >
                <HelpCircle className="w-4 h-4" />
            </button>

            {isOpen && (
                <div
                    className="fixed z-[9999] w-80 p-4 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                    style={{ top: position.top, left: position.left }}
                >
                    <div className="space-y-2">
                        <h4 className="font-semibold text-white text-sm">{title}</h4>
                        <p className="text-xs text-slate-300 leading-relaxed">{description}</p>
                        {formula && (
                            <div className="mt-3 p-2 bg-slate-900/50 rounded border border-slate-700">
                                <p className="text-xs text-slate-400 font-mono">{formula}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MetricTooltip;
