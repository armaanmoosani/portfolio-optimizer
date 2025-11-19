import numpy as np
import pandas as pd
from scipy.optimize import minimize

def calculate_portfolio_performance(weights, mean_returns, cov_matrix, risk_free_rate=0.045, annualization_factor=252):
    """
    Calculate portfolio return, volatility, and Sharpe ratio.
    """
    returns = np.sum(mean_returns * weights) * annualization_factor
    std = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights))) * np.sqrt(annualization_factor)
    sharpe = (returns - risk_free_rate) / std
    return returns, std, sharpe

def negative_sharpe(weights, mean_returns, cov_matrix, risk_free_rate, annualization_factor):
    """Objective function for Max Sharpe Ratio"""
    r, s, sharpe = calculate_portfolio_performance(weights, mean_returns, cov_matrix, risk_free_rate, annualization_factor)
    return -sharpe

def portfolio_volatility(weights, mean_returns, cov_matrix, risk_free_rate, annualization_factor):
    """Objective function for Minimum Variance"""
    r, s, sharpe = calculate_portfolio_performance(weights, mean_returns, cov_matrix, risk_free_rate, annualization_factor)
    return s

def negative_return(weights, mean_returns, cov_matrix, risk_free_rate, annualization_factor):
    """Objective function for Max Return"""
    r, s, sharpe = calculate_portfolio_performance(weights, mean_returns, cov_matrix, risk_free_rate, annualization_factor)
    return -r

def optimize_portfolio(prices: pd.DataFrame, objective: str = "sharpe", risk_free_rate: float = 0.045, min_weight: float = 0.0, max_weight: float = 1.0, annualization_factor: int = 252):
    """
    Run portfolio optimization based on the selected objective using Scipy.
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
        args = (mean_returns, cov_matrix, risk_free_rate, annualization_factor)
    elif objective == "min_vol":
        obj_fun = portfolio_volatility
        args = (mean_returns, cov_matrix, risk_free_rate, annualization_factor)
    elif objective == "max_return":
        obj_fun = negative_return
        args = (mean_returns, cov_matrix, risk_free_rate, annualization_factor)
    else:
        # Default to Sharpe
        obj_fun = negative_sharpe
        args = (mean_returns, cov_matrix, risk_free_rate, annualization_factor)

    # Run optimization
    result = minimize(obj_fun, initial_guess, args=args, method='SLSQP', bounds=bounds, constraints=constraints)

    # Extract results
    optimal_weights = result.x
    
    # Calculate final metrics
    opt_return, opt_vol, opt_sharpe = calculate_portfolio_performance(optimal_weights, mean_returns, cov_matrix, risk_free_rate, annualization_factor)

    return {
        "weights": {k: float(v) for k, v in zip(tickers, optimal_weights)},
        "metrics": {
            "expected_return": float(opt_return),
            "volatility": float(opt_vol),
            "sharpe_ratio": float(opt_sharpe)
        },
        "success": bool(result.success),
        "message": str(result.message)
    }
