"use client";

import { createContext, useContext, useState, useEffect } from 'react';

const GlobalStateContext = createContext();

export function GlobalStateProvider({ children }) {
    // --- Portfolio State ---
    const [assets, setAssets] = useState([]);
    const [optimizationResults, setOptimizationResults] = useState(null);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [portfolioLoaded, setPortfolioLoaded] = useState(false);

    // --- Stock Viewer State ---
    const [stockViewerState, setStockViewerState] = useState({
        ticker: "",
        stockData: null,
        news: [],
        aiSummary: "",
        loading: false,
        chartData: [],
        timeRange: '1D',
        timestamp: 0,
        stockInfo: null
    });

    // Load Portfolio Data from LocalStorage on Mount
    useEffect(() => {
        const savedAssets = localStorage.getItem('portfolioAssets');
        const savedResults = localStorage.getItem('portfolioResults');

        if (savedAssets) {
            try {
                setAssets(JSON.parse(savedAssets));
            } catch (e) {
                console.error("Failed to parse saved assets", e);
            }
        }

        if (savedResults) {
            try {
                setOptimizationResults(JSON.parse(savedResults));
            } catch (e) {
                console.error("Failed to parse saved results", e);
            }
        }
        setPortfolioLoaded(true);
    }, []);

    // Save Portfolio Data to LocalStorage
    useEffect(() => {
        if (portfolioLoaded) {
            localStorage.setItem('portfolioAssets', JSON.stringify(assets));
        }
    }, [assets, portfolioLoaded]);

    useEffect(() => {
        if (portfolioLoaded && optimizationResults) {
            localStorage.setItem('portfolioResults', JSON.stringify(optimizationResults));
        }
    }, [optimizationResults, portfolioLoaded]);

    // Load Stock Viewer Data from LocalStorage on Mount
    useEffect(() => {
        const savedTicker = localStorage.getItem('lastViewedTicker');
        const savedData = localStorage.getItem('stockViewerData');

        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                // Only use cached data if it's less than 1 hour old
                if (Date.now() - parsedData.timestamp < 3600000) {
                    setStockViewerState(prev => ({ ...prev, ...parsedData }));
                }
            } catch (e) {
                console.error("Failed to parse saved stock data", e);
            }
        } else if (savedTicker) {
            setStockViewerState(prev => ({ ...prev, ticker: savedTicker }));
        }
    }, []);

    // Save Stock Viewer Data to LocalStorage
    useEffect(() => {
        if (stockViewerState.stockData && stockViewerState.stockData.symbol) {
            localStorage.setItem('lastViewedTicker', stockViewerState.stockData.symbol);
            localStorage.setItem('stockViewerData', JSON.stringify({
                ...stockViewerState,
                timestamp: Date.now()
            }));
        }
    }, [stockViewerState]);

    // --- Actions ---

    // Portfolio Actions
    const addAsset = (symbol, description) => {
        if (!assets.find(asset => asset.symbol === symbol)) {
            setAssets([...assets, { symbol, description, weight: 0 }]);
        }
    };

    const removeAsset = (symbol) => {
        setAssets(assets.filter(asset => asset.symbol !== symbol));
    };

    const startOptimization = () => {
        setIsOptimizing(true);
        setOptimizationResults(null);
    };

    const completeOptimization = (results) => {
        setOptimizationResults(results);
        setIsOptimizing(false);
    };

    // Stock Viewer Actions
    const updateStockState = (newState) => {
        setStockViewerState(prev => ({ ...prev, ...newState }));
    };

    const value = {
        // Portfolio
        assets,
        optimizationResults,
        isOptimizing,
        addAsset,
        removeAsset,
        startOptimization,
        completeOptimization,

        // Stock Viewer
        stockViewerState,
        updateStockState
    };

    return (
        <GlobalStateContext.Provider value={value}>
            {children}
        </GlobalStateContext.Provider>
    );
}

export function useGlobalState() {
    const context = useContext(GlobalStateContext);
    if (!context) {
        throw new Error("useGlobalState must be used within a GlobalStateProvider");
    }
    return context;
}
