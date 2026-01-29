import React, { useState, useEffect, useRef } from 'react';
import { MANA_SVGS } from './ManaSymbols';
import './LoadingSpinner.css';

// WUBRG order
const MANA_ORDER = ['W', 'U', 'B', 'R', 'G'];

const LoadingSpinner = ({ size = 'md', text = 'Loading...', showText = false, className = '' }) => {
    // Start at a random position in WUBRG (useRef ensures it's set once per mount)
    const startIndex = useRef(Math.floor(Math.random() * MANA_ORDER.length));
    const [currentIndex, setCurrentIndex] = useState(startIndex.current);
    const sizeClass = `spinner-${size}`;

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % MANA_ORDER.length);
        }, 400); // Cycle every 400ms through WUBRG

        return () => clearInterval(interval);
    }, []);

    const currentMana = MANA_ORDER[currentIndex];

    return (
        <div className={`loading-spinner-container ${className}`}>
            <div className={`branded-spinner ${sizeClass}`} role="status">
                <div className="spinner-ring"></div>
                <div className="spinner-ring"></div>
                <div className="mana-symbol-container">
                    {MANA_SVGS[currentMana]}
                </div>
            </div>
            {showText && <p className="spinner-text">{text}</p>}
            <span className="visually-hidden">{text}</span>
        </div>
    );
};

export default LoadingSpinner;
