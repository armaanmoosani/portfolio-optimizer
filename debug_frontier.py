import sys
import os
import pandas as pd
import numpy as np
import yfinance as yf

# Add backend/app to path
sys.path.append(os.path.join(os.getcwd(), 'backend/app'))

from optimizer import optimize_portfolio, calculate_efficient_frontier

def test_frontier_weights():
    tickers = ['NVDA', 'AMD']
    start_date = '2023-01-01'
    end_date = '2023-12-31'
    
    print(f"Using dummy data for {tickers}...")
    # Create dummy prices
    dates = pd.date_range(start=start_date, end=end_date, freq='B')
    np.random.seed(42)
    price_data = {
        'NVDA': 100 * (1 + np.random.normal(0.001, 0.02, len(dates))).cumprod(),
        'AMD': 50 * (1 + np.random.normal(0.001, 0.02, len(dates))).cumprod()
    }
    prices = pd.DataFrame(price_data, index=dates)
    
    # 1. Run Optimization
    print("\nRunning optimize_portfolio...")
    opt_result = optimize_portfolio(
        prices,
        objective="sharpe",
        risk_free_rate=0.045,
        min_weight=0.0,
        max_weight=1.0
    )
    
    print("Optimization Result Weights:")
    print(opt_result['weights'])
    
    # 2. Run Efficient Frontier with passed weights
    print("\nRunning calculate_efficient_frontier with passed weights...")
    frontier_result = calculate_efficient_frontier(
        prices,
        optimal_weights=opt_result['weights'],
        risk_free_rate=0.045,
        min_weight=0.0,
        max_weight=1.0,
        num_portfolios=10
    )
    
    print("Frontier Optimal Portfolio Weights:")
    print(frontier_result['optimal_portfolio']['weights'])
    
    # Check for mismatch
    opt_weights = opt_result['weights']
    frontier_weights = frontier_result['optimal_portfolio']['weights']
    
    mismatch = False
    for t in tickers:
        if abs(opt_weights.get(t, 0) - frontier_weights.get(t, 0)) > 1e-6:
            mismatch = True
            print(f"MISMATCH for {t}: Opt={opt_weights.get(t, 0)}, Frontier={frontier_weights.get(t, 0)}")
            
    if not mismatch:
        print("\nSUCCESS: Weights match perfectly.")
    else:
        print("\nFAILURE: Weights do not match.")

if __name__ == "__main__":
    test_frontier_weights()
