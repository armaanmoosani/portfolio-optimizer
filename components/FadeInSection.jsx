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
            threshold: 0.1, // Trigger when 10% visible
            rootMargin: "0px 0px -50px 0px" // Trigger slightly before it hits the bottom
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
