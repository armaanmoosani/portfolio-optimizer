"use client";

import { useEffect, useRef, useState } from "react";

export default function FadeInSection({ children, delay = 0, className = "" }) {
    const [isVisible, setIsVisible] = useState(false);
    const domRef = useRef();

    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                // Trigger only once when it becomes visible
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    // Optional: Unobserve after triggering to save resources
                    // observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.05, // Trigger almost immediately
            rootMargin: "0px 0px 100px 0px" // Trigger 100px BEFORE it enters the viewport (eager load)
        });

        const currentRef = domRef.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, []);

    return (
        <div
            ref={domRef}
            className={`transition-all duration-1000 ease-out transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'} ${className}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
}
