import numpy as np
import pandas as pd
from scipy.optimize import minimize

def calculate_portfolio_performance(weights, mean_returns, cov_matrix, risk_free_rate=0.045):
    """
    Calculate portfolio return, volatility, and Sharpe ratio.
    """
    returns = np.sum(mean_returns * weights) * 252
    std = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights))) * np.sqrt(252)
    sharpe = (returns - risk_free_rate) / std
    return returns, std, sharpe

def negative_sharpe(weights, mean_returns, cov_matrix, risk_free_rate):
    """Objective function for Max Sharpe Ratio"""
    r, s, sharpe = calculate_portfolio_performance(weights, mean_returns, cov_matrix, risk_free_rate)
    return -sharpe

def portfolio_volatility(weights, mean_returns, cov_matrix, risk_free_rate):
    """Objective function for Minimum Variance"""
    r, s, sharpe = calculate_portfolio_performance(weights, mean_returns, cov_matrix, risk_free_rate)
    return s

def optimize_portfolio(prices: pd.DataFrame, objective: str = "sharpe", risk_free_rate: float = 0.045, min_weight: float = 0.0, max_weight: float = 1.0):
    """
    Run portfolio optimization based on the selected objective.
    """
    # Calculate daily returns
    returns = prices.pct_change().dropna()
    mean_returns = returns.mean()
    cov_matrix = returns.cov()
    num_assets = len(mean_returns)
    tickers = prices.columns.tolist()

    # Constraints: Sum of weights = 1
    constraints = ({'type': 'eq', 'fun': lambda x: np.sum(x) - 1})
    
    # Bounds: min_weight <= w <= max_weight
    bounds = tuple((min_weight, max_weight) for _ in range(num_assets))
    
    # Initial guess: Equal weights
    initial_guess = num_assets * [1. / num_assets,]

    # Select objective function
    if objective == "sharpe":
        obj_fun = negative_sharpe
        args = (mean_returns, cov_matrix, risk_free_rate)
    elif objective == "min_vol":
        obj_fun = portfolio_volatility
        args = (mean_returns, cov_matrix, risk_free_rate)
    elif objective == "max_return":
        # For max return, we minimize negative return
        # This is a simplified version; usually requires a target risk constraint
        # Here we just find the single asset with highest return if no risk constraint
        # Better approach: Maximize return subject to volatility <= target_vol
        # For now, let's default to Sharpe if not fully specified
        obj_fun = negative_sharpe
        args = (mean_returns, cov_matrix, risk_free_rate)
    else:
        # Default to Sharpe
        obj_fun = negative_sharpe
        args = (mean_returns, cov_matrix, risk_free_rate)

    # Run optimization
    result = minimize(obj_fun, initial_guess, args=args, method='SLSQP', bounds=bounds, constraints=constraints)

    # Extract results
    optimal_weights = result.x
    
    # Calculate final metrics
    opt_return, opt_vol, opt_sharpe = calculate_portfolio_performance(optimal_weights, mean_returns, cov_matrix, risk_free_rate)

    return {
        "weights": dict(zip(tickers, optimal_weights)),
        "metrics": {
            "expected_return": opt_return,
            "volatility": opt_vol,
            "sharpe_ratio": opt_sharpe
        },
        "success": result.success,
        "message": result.message
    }
