import React from 'react';
import { HelpCircle } from 'lucide-react';

const MetricTooltip = ({ title, description, formula, align = 'left' }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [position, setPosition] = React.useState({ top: 0, left: 0 });
    const buttonRef = React.useRef(null);
    const [placement, setPlacement] = React.useState('bottom'); // 'bottom' or 'top'

    const updatePosition = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();

            // Horizontal positioning
            let left = rect.left;
            if (align === 'right') {
                left = rect.right - 320;
            }
            // Prevent going off screen (right edge)
            if (left + 320 > window.innerWidth) {
                left = window.innerWidth - 340;
            }
            // Prevent going off screen (left edge)
            if (left < 10) {
                left = 10;
            }

            // Vertical positioning (Smart Flip)
            const spaceBelow = window.innerHeight - rect.bottom;
            let top = rect.bottom + 5;
            let newPlacement = 'bottom';

            // If less than 200px space below, flip to top
            if (spaceBelow < 200) {
                newPlacement = 'top';
                // For top placement, we'll use bottom style in the render
                // We store the anchor point (rect.top) in 'top' state variable for convenience
                top = rect.top - 5;
            }

            setPosition({ top, left });
            setPlacement(newPlacement);
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

    const timeoutRef = React.useRef(null);

    const handleMouseEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        updatePosition();
        setIsOpen(true);
    };

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => {
            setIsOpen(false);
        }, 200); // 200ms delay to allow moving to tooltip
    };

    React.useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return (
        <div className="relative inline-block">
            <button
                ref={buttonRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className="ml-2 text-slate-500 hover:text-slate-300 transition-colors cursor-help"
            >
                <HelpCircle className="w-4 h-4" />
            </button>

            {isOpen && (
                <div
                    className="fixed z-[9999] w-80 p-4 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                    style={{
                        left: position.left,
                        ...(placement === 'bottom'
                            ? { top: position.top }
                            : { bottom: window.innerHeight - position.top })
                    }}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
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
