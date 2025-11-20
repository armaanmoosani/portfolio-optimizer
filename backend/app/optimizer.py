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

def negative_return(weights, mean_returns, cov_matrix, risk_free_rate, annualization_factor, returns_matrix=None, mar=None):
    """Negative expected return for maximizing return."""
    portfolio_return = np.sum(mean_returns * weights) * annualization_factor
    return -portfolio_return

def kelly_criterion(weights, mean_returns, cov_matrix, risk_free_rate, annualization_factor, returns_matrix, mar=None):
    """
    Kelly Criterion: Maximize expected log returns (geometric growth rate).
    
    This is the mathematically optimal strategy for long-term wealth growth.
    Formula: max E[log(1 + R_p)]
    """
    if returns_matrix is None:
        raise ValueError("Kelly Criterion requires historical returns matrix")
    
    portfolio_returns = returns_matrix.dot(weights)
    # Use log(1 + r) to handle returns properly
    # Add small epsilon to avoid log(0) in edge cases
    log_returns = np.log(1 + portfolio_returns + 1e-10)
    expected_log_return = np.mean(log_returns)
    
    return -expected_log_return  # Minimize negative

def negative_sortino(weights, mean_returns, cov_matrix, risk_free_rate, annualization_factor, returns_matrix, mar):
    """
    Sortino Ratio: Maximize (Return - MAR) / Downside Deviation.
    
    Like Sharpe ratio but only penalizes downside volatility.
    Formula: (E[R] - MAR) / sqrt(E[min(R - MAR, 0)^2])
    """
    if returns_matrix is None:
        raise ValueError("Sortino Ratio requires historical returns matrix")
    if mar is None:
        mar = 0.0
    
    portfolio_returns = returns_matrix.dot(weights)
    mean_return = np.mean(portfolio_returns) * annualization_factor
    
    # Calculate downside deviation (semi-deviation below MAR)
    mar_daily = mar / annualization_factor
    downside_returns = portfolio_returns - mar_daily
    downside_returns = downside_returns[downside_returns < 0]
    
    if len(downside_returns) == 0:
        # No downside - perfect scenario
        return -1e10
    
    downside_deviation = np.sqrt(np.mean(downside_returns**2)) * np.sqrt(annualization_factor)
    
    if downside_deviation < 1e-10:
        return -1e10
    
    sortino = (mean_return - mar) / downside_deviation
    return -sortino

def negative_omega(weights, mean_returns, cov_matrix, risk_free_rate, annualization_factor, returns_matrix, mar):
    """
    Omega Ratio: Maximize probability-weighted gains vs losses.
    
    Ratio of upside potential to downside risk relative to MAR.
    Formula: E[max(R - MAR, 0)] / E[max(MAR - R, 0)]
    """
    if returns_matrix is None:
        raise ValueError("Omega Ratio requires historical returns matrix")
    if mar is None:
        mar = 0.0
    
    portfolio_returns = returns_matrix.dot(weights) * annualization_factor
    
    # Upside: average of returns above MAR
    upside_returns = portfolio_returns[portfolio_returns > mar] - mar
    upside_potential = np.mean(upside_returns) if len(upside_returns) > 0 else 0
    
    # Downside: average of returns below MAR
    downside_returns = mar - portfolio_returns[portfolio_returns < mar]
    downside_risk = np.mean(downside_returns) if len(downside_returns) > 0 else 1e-10
    
    if downside_risk < 1e-10:
        # Almost no downside risk
        return -1e10
    
    omega = upside_potential / downside_risk
    return -omega

def optimize_portfolio(prices: pd.DataFrame, objective: str = "sharpe", risk_free_rate: float = 0.045, min_weight: float = 0.0, max_weight: float = 1.0, annualization_factor: int = 252, mar: float = 0.0):
    """
    Run portfolio optimization based on the selected objective using Scipy.
    """
    # Calculate daily returns
    returns = prices.pct_change().dropna()
    mean_returns = returns.mean()
    cov_matrix = returns.cov()
    returns_matrix = returns.values  # Convert to numpy array for objective functions
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
        args = (mean_returns, cov_matrix, risk_free_rate, annualization_factor, returns_matrix, mar)
    elif objective == "kelly":
        obj_fun = kelly_criterion
        args = (mean_returns, cov_matrix, risk_free_rate, annualization_factor, returns_matrix, mar)
    elif objective == "sortino":
        obj_fun = negative_sortino
        args = (mean_returns, cov_matrix, risk_free_rate, annualization_factor, returns_matrix, mar)
    elif objective == "omega":
        obj_fun = negative_omega
        args = (mean_returns, cov_matrix, risk_free_rate, annualization_factor, returns_matrix, mar)
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

def calculate_efficient_frontier(prices: pd.DataFrame, risk_free_rate: float = 0.045, min_weight: float = 0.0, max_weight: float = 1.0, annualization_factor: int = 252, num_portfolios: int = 50):
    """
    Calculate the efficient frontier by optimizing portfolios across a range of target returns.
    
    Returns:
        - frontier_points: List of {volatility, return} points forming the efficient frontier
        - individual_assets: List of {name, volatility, return} for each asset
        - optimal_portfolio: The max Sharpe ratio portfolio coordinates
    """
    # Calculate returns
    returns = prices.pct_change().dropna()
    mean_returns = returns.mean()
    cov_matrix = returns.cov()
    num_assets = len(mean_returns)
    tickers = prices.columns.tolist()
    
    # Calculate individual asset statistics
    individual_assets = []
    for ticker in tickers:
        asset_return = float(mean_returns[ticker] * annualization_factor)
        asset_vol = float(returns[ticker].std() * np.sqrt(annualization_factor))
        individual_assets.append({
            "name": ticker,
            "return": asset_return,
            "volatility": asset_vol
        })
    
    # Find minimum and maximum achievable returns
    # Min return: minimum variance portfolio
    # Max return: maximum return portfolio
    constraints = ({'type': 'eq', 'fun': lambda x: np.sum(x) - 1})
    bounds = tuple((min_weight, max_weight) for _ in range(num_assets))
    initial_guess = num_assets * [1. / num_assets,]
    
    # Get min and max returns
    min_ret_result = minimize(
        lambda w: np.sum(mean_returns * w) * annualization_factor,
        initial_guess,
        method='SLSQP',
        bounds=bounds,
        constraints=constraints
    )
    
    max_ret_result = minimize(
        lambda w: -np.sum(mean_returns * w) * annualization_factor,
        initial_guess,
        method='SLSQP',
        bounds=bounds,
        constraints=constraints
    )
    
    min_return = float(np.sum(mean_returns * min_ret_result.x) * annualization_factor)
    max_return = float(np.sum(mean_returns * max_ret_result.x) * annualization_factor)
    
    # Generate target returns
    target_returns = np.linspace(min_return, max_return, num_portfolios)
    
    # Calculate efficient frontier points
    frontier_points = []
    
    for target_ret in target_returns:
        # Add constraint for target return
        constraints_with_return = (
            {'type': 'eq', 'fun': lambda x: np.sum(x) - 1},
            {'type': 'eq', 'fun': lambda x, tr=target_ret: np.sum(mean_returns * x) * annualization_factor - tr}
        )
        
        # Minimize volatility for this target return
        result = minimize(
            portfolio_volatility,
            initial_guess,
            args=(mean_returns, cov_matrix, risk_free_rate, annualization_factor),
            method='SLSQP',
            bounds=bounds,
            constraints=constraints_with_return,
            options={'maxiter': 1000}
        )
        
        if result.success:
            weights = result.x
            
            # Use the same performance calculation function for consistency and accuracy
            portfolio_return, portfolio_vol, portfolio_sharpe = calculate_portfolio_performance(
                weights, mean_returns, cov_matrix, risk_free_rate, annualization_factor
            )
            
            # Create weights dictionary
            weights_dict = {ticker: float(w) for ticker, w in zip(tickers, weights)}
            
            frontier_points.append({
                "volatility": float(portfolio_vol),
                "return": float(portfolio_return),
                "sharpe_ratio": float(portfolio_sharpe),
                "weights": weights_dict
            })
    
    # Calculate optimal (max Sharpe) portfolio
    sharpe_result = minimize(
        negative_sharpe,
        initial_guess,
        args=(mean_returns, cov_matrix, risk_free_rate, annualization_factor),
        method='SLSQP',
        bounds=bounds,
        constraints=constraints
    )
    
    if sharpe_result.success:
        opt_ret, opt_vol, opt_sharpe = calculate_portfolio_performance(
            sharpe_result.x, mean_returns, cov_matrix, risk_free_rate, annualization_factor
        )
        weights_dict = {ticker: float(w) for ticker, w in zip(tickers, sharpe_result.x)}
        optimal_portfolio = {
            "volatility": float(opt_vol),
            "return": float(opt_ret),
            "sharpe_ratio": float(opt_sharpe),
            "weights": weights_dict
        }
    else:
        optimal_portfolio = None
    
    return {
        "frontier_points": frontier_points,
        "individual_assets": individual_assets,
        "optimal_portfolio": optimal_portfolio
    }
