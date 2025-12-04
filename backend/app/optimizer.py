import numpy as np
import pandas as pd
from scipy.optimize import minimize

def ledoit_wolf_shrinkage(returns: pd.DataFrame):
    """
    Ledoit-Wolf covariance matrix shrinkage estimator.
    
    Shrinks the sample covariance matrix toward a structured estimator (constant correlation)
    to reduce estimation error, especially important for portfolios with many assets.
    
    Reference:
    Ledoit, O., & Wolf, M. (2003). "Improved estimation of the covariance matrix of stock returns 
    with an application to portfolio selection." Journal of Empirical Finance, 10(5), 603-621.
    
    Used by:
    - Institutional asset managers (BlackRock, Vanguard)
    - Risk management systems (MSCI Barra, Axioma)
    - Recommended by CFA Institute for portfolios with >20 assets
    
    Args:
        returns: DataFrame of asset returns (T x N, where T = time periods, N = assets)
    
    Returns:
        Shrunk covariance matrix (N x N)
    """
    T, N = returns.shape  # T = number of observations, N = number of assets
    
    # Sample covariance matrix
    sample_cov = returns.cov().values
    
    # Mean variance (average of diagonal elements)
    mean_var = np.trace(sample_cov) / N
    
    # Target matrix: Constant correlation model
    # F = mean_var * I + mean_cov * (1 - I)
    # This is a diagonal matrix with mean variance on diagonal
    sample_corr = returns.corr().values
    mean_corr = (np.sum(sample_corr) - N) / (N * (N - 1))  # Average off-diagonal correlation
    
    # Construct target
    std_devs = np.sqrt(np.diag(sample_cov))
    target = mean_corr * np.outer(std_devs, std_devs)
    np.fill_diagonal(target, np.diag(sample_cov))  # Keep variances
    
    # Calculate optimal shrinkage intensity (delta)
    # Ledoit-Wolf formula for shrinkage intensity
    delta_num = 0
    delta_den = 0
    
    for t in range(T):
        r_t = returns.iloc[t].values.reshape(-1, 1)
        centered = r_t - returns.mean().values.reshape(-1, 1)
        sample_cov_t = centered @ centered.T
        
        delta_num += np.sum((sample_cov_t - sample_cov) ** 2)
    
    delta_num /= T
    delta_den = np.sum((sample_cov - target) ** 2)
    
    # Shrinkage intensity (clamped between 0 and 1)
    delta = min(1, max(0, delta_num / delta_den)) if delta_den > 0 else 0
    
    # Shrunk covariance: delta * target + (1 - delta) * sample
    shrunk_cov = delta * target + (1 - delta) * sample_cov
    
    return shrunk_cov, delta

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
    
    # Calculate portfolio daily returns
    portfolio_returns = returns_matrix.dot(weights)
    
    # Annualized return (Geometric for accuracy, or Arithmetic * 252)
    # Using Arithmetic * 252 to match standard Sharpe optimization convention
    mean_return = np.mean(portfolio_returns) * annualization_factor
    
    # Convert annual MAR to daily geometric MAR for accurate downside comparison
    # (1 + MAR_annual) = (1 + MAR_daily)^252
    mar_daily = (1 + mar) ** (1 / annualization_factor) - 1
    
    # Calculate downside deviation relative to daily MAR
    downside_returns = portfolio_returns - mar_daily
    downside_returns = downside_returns[downside_returns < 0]
    
    if len(downside_returns) == 0:
        return -1e10  # No downside
    
    # LPM2 (Lower Partial Moment order 2)
    # Sum of squared shortfalls / Total observations (not just downside observations)
    downside_variance = np.sum(downside_returns**2) / len(portfolio_returns)
    downside_deviation = np.sqrt(downside_variance) * np.sqrt(annualization_factor)
    
    if downside_deviation < 1e-10:
        return -1e10
    
    sortino = (mean_return - mar) / downside_deviation
    return -sortino

def negative_omega(weights, mean_returns, cov_matrix, risk_free_rate, annualization_factor, returns_matrix, mar):
    """
    Omega Ratio: Maximize probability-weighted gains vs losses.
    
    Ratio of upside potential to downside risk relative to MAR.
    Formula: Sum(max(R - MAR, 0)) / Sum(max(MAR - R, 0))
    """
    if returns_matrix is None:
        raise ValueError("Omega Ratio requires historical returns matrix")
    if mar is None:
        mar = 0.0
    
    # Calculate portfolio daily returns
    portfolio_returns = returns_matrix.dot(weights)
    
    # Convert annual MAR to daily geometric MAR
    mar_daily = (1 + mar) ** (1 / annualization_factor) - 1
    
    # Calculate excess returns relative to MAR
    excess_returns = portfolio_returns - mar_daily
    
    # Upside: Sum of positive excess returns
    upside_sum = np.sum(excess_returns[excess_returns > 0])
    
    # Downside: Sum of absolute negative excess returns
    downside_sum = np.abs(np.sum(excess_returns[excess_returns < 0]))
    
    if downside_sum < 1e-10:
        return -1e10
    
    omega = upside_sum / downside_sum
    return -omega

def negative_treynor(weights, mean_returns, cov_matrix, risk_free_rate, annualization_factor, returns_matrix, benchmark_returns, mar=None):
    """
    Treynor Ratio: Maximize (Return - Risk_Free_Rate) / Beta.
    
    Measures excess return per unit of systematic (market) risk.
    Beta represents the portfolio's sensitivity to benchmark movements.
    
    Preferred when:
    - Portfolio is part of a larger, well-diversified portfolio
    - Comparing multiple portfolios against the same benchmark
    - Systematic risk (beta) is the primary concern
    
    Reference:
    Treynor, J. L. (1965). "How to Rate Management of Investment Funds."
    Harvard Business Review, 43(1), 63-75.
    
    Used by:
    - Mutual fund managers comparing performance vs market
    - Portfolio managers with mandated benchmark tracking
    - Academic research on market-adjusted performance
    
    Args:
        benchmark_returns: Benchmark returns (e.g., SPY) aligned with portfolio period
    """
    if returns_matrix is None:
        raise ValueError("Treynor Ratio requires historical returns matrix")
    if benchmark_returns is None:
        raise ValueError("Treynor Ratio requires benchmark returns")
    
    # Calculate portfolio returns
    portfolio_returns = returns_matrix.dot(weights)
    
    # Ensure same length
    min_len = min(len(portfolio_returns), len(benchmark_returns))
    portfolio_returns = portfolio_returns[:min_len]
    benchmark_returns = benchmark_returns[:min_len]
    
    # Calculate beta using covariance formula
    # β = Cov(R_p, R_m) / Var(R_m)
    covariance = np.cov(portfolio_returns, benchmark_returns)[0, 1]
    benchmark_variance = np.var(benchmark_returns, ddof=1)
    
    if benchmark_variance < 1e-10:
        return 1e10  # Penalize if benchmark has no variance
    
    beta = covariance / benchmark_variance
    
    # Penalize zero or negative beta (negative beta is valid but rare)
    if abs(beta) < 1e-10:
        return 1e10  # Near-zero beta means no systematic risk exposure
    
    # Calculate annualized portfolio return
    mean_return = np.mean(portfolio_returns) * annualization_factor
    
    # Treynor ratio: (E[R] - R_f) / β
    treynor = (mean_return - risk_free_rate) / beta
    
    return -treynor

def negative_calmar(weights, mean_returns, cov_matrix, risk_free_rate, annualization_factor, returns_matrix, mar):
    """
    Calmar Ratio: Maximize Annualized Return / Max Drawdown.
    
    Measures return per unit of maximum drawdown risk.
    Preferred by hedge funds and CTA strategies.
    """
    if returns_matrix is None:
        raise ValueError("Calmar Ratio requires historical returns matrix")
    
    # Calculate portfolio daily returns
    portfolio_returns = returns_matrix.dot(weights)
    
    # Calculate cumulative returns
    cum_returns = (1 + portfolio_returns).cumprod()
    
    # Calculate Max Drawdown
    peak = np.maximum.accumulate(cum_returns)
    drawdown = (cum_returns - peak) / peak
    max_drawdown = np.abs(np.min(drawdown))
    
    if max_drawdown < 1e-10:
        return -1e10  # Avoid division by zero (or infinite ratio)
    
    # Annualized Return
    # Using Arithmetic mean * 252 for consistency with other metrics in this file
    # though Calmar often uses CAGR. We'll stick to the standard here.
    mean_return = np.mean(portfolio_returns) * annualization_factor
    
    calmar = mean_return / max_drawdown
    return -calmar

def optimize_portfolio(prices: pd.DataFrame, objective: str = "sharpe", risk_free_rate: float = 0.045, min_weight: float = 0.0, max_weight: float = 1.0, annualization_factor: int = 252, mar: float = 0.0, benchmark_prices: pd.Series = None):
    """
    Run portfolio optimization based on the selected objective using Scipy.
    
    For portfolios with 20+ assets, automatically applies Ledoit-Wolf covariance shrinkage
    to improve estimation accuracy and reduce optimization instability.
    
    Args:
        benchmark_prices: Benchmark price series (required for Treynor optimization)
    """
    # Calculate daily returns
    returns = prices.pct_change().dropna()
    mean_returns = returns.mean()
    
    # Covariance Matrix with Automatic Shrinkage for Large Portfolios
    num_assets = len(mean_returns)
    if num_assets >= 20:
        # Apply Ledoit-Wolf shrinkage for better estimation
        cov_matrix, shrinkage_intensity = ledoit_wolf_shrinkage(returns)
        print(f"INFO: Applied Ledoit-Wolf covariance shrinkage (intensity: {shrinkage_intensity:.3f}) for {num_assets}-asset portfolio")
        print(f"      This improves estimation accuracy by reducing noise in the covariance matrix.")
        # Convert back to pandas with correct index/columns for consistency
        cov_matrix = pd.DataFrame(cov_matrix, index=returns.columns, columns=returns.columns)
    else:
        # Use sample covariance for smaller portfolios
        cov_matrix = returns.cov()
    
    returns_matrix = returns.values  # Convert to numpy array for objective functions
    tickers = prices.columns.tolist()
    
    # Process benchmark returns if provided (for Treynor)
    benchmark_returns = None
    if benchmark_prices is not None:
        benchmark_returns_series = benchmark_prices.pct_change().dropna()
        # Align benchmark with portfolio returns
        common_index = returns.index.intersection(benchmark_returns_series.index)
        returns_matrix = returns.loc[common_index].values
        benchmark_returns = benchmark_returns_series.loc[common_index].values.flatten()

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
    elif objective == "min_vol" or objective == "min_volatility": # Handle both for robustness
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
    elif objective == "calmar":
        obj_fun = negative_calmar
        args = (mean_returns, cov_matrix, risk_free_rate, annualization_factor, returns_matrix, mar)
    elif objective == "treynor":
        if benchmark_returns is None:
            raise ValueError("Treynor optimization requires benchmark_prices parameter")
        obj_fun = negative_treynor
        args = (mean_returns, cov_matrix, risk_free_rate, annualization_factor, returns_matrix, benchmark_returns, mar)
    else:
        # Default to Sharpe
        print(f"WARNING: Unknown objective '{objective}', defaulting to Sharpe Ratio")
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

def calculate_efficient_frontier(prices: pd.DataFrame, optimal_weights: dict = None, risk_free_rate: float = 0.045, min_weight: float = 0.0, max_weight: float = 1.0, annualization_factor: int = 252, num_portfolios: int = 100, benchmark_prices: pd.Series = None):
    """
    Calculate the efficient frontier by optimizing portfolios across a range of target returns.
    
    For portfolios with 20+ assets, applies Ledoit-Wolf shrinkage for better covariance estimation.
    
    Args:
        optimal_weights: Pre-calculated optimal portfolio weights from main optimization (ensures consistency)
    
    Returns:
        - frontier_points: List of {volatility, return} points forming the efficient frontier
        - individual_assets: List of {name, volatility, return} for each asset
        - optimal_portfolio: The max Sharpe ratio portfolio coordinates (from provided optimal_weights)
    """
    # Calculate returns
    returns = prices.pct_change().dropna()
    mean_returns = returns.mean()
    num_assets = len(mean_returns)
    
    # Apply Ledoit-Wolf shrinkage for large portfolios (consistency with main optimization)
    if num_assets >= 20:
        cov_matrix, shrinkage_intensity = ledoit_wolf_shrinkage(returns)
        cov_matrix = pd.DataFrame(cov_matrix, index=returns.columns, columns=returns.columns)
    else:
        cov_matrix = returns.cov()
    
    tickers = prices.columns.tolist()
    
    # Calculate Market Stats for Beta if benchmark provided
    market_mean_return = None
    market_variance = None
    aligned_benchmark = None
    
    if benchmark_prices is not None:
        benchmark_returns = benchmark_prices.pct_change().dropna()
        # Align dates
        common_index = returns.index.intersection(benchmark_returns.index)
        if len(common_index) > 10:
            aligned_returns = returns.loc[common_index]
            aligned_benchmark = benchmark_returns.loc[common_index]
            
            market_mean_return = float(aligned_benchmark.mean() * annualization_factor)
            market_variance = float(aligned_benchmark.var() * annualization_factor)
    
    # Calculate individual asset statistics
    individual_assets = []
    for ticker in tickers:
        asset_return = float(mean_returns[ticker] * annualization_factor)
        asset_vol = float(returns[ticker].std() * np.sqrt(annualization_factor))
        
        asset_beta = 0.0
        if aligned_benchmark is not None:
            # Calculate Beta: Cov(Ra, Rm) / Var(Rm)
            # Note: Annualization factor cancels out in the division, so we can use raw returns
            covariance = aligned_returns[ticker].cov(aligned_benchmark)
            market_var_raw = aligned_benchmark.var()
            
            if market_var_raw != 0:
                asset_beta = float(covariance / market_var_raw)
        
        individual_assets.append({
            "name": ticker,
            "return": asset_return,
            "volatility": asset_vol,
            "beta": asset_beta
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

    # --- NEW: Explicit Global Minimum Variance Portfolio (GMVP) Calculation ---
    # We calculate this explicitly to ensure we have the exact "nose" of the bullet
    # and to fix the bug where it was duplicating the Max Sharpe stats.
    gmvp_result = minimize(
        portfolio_volatility,
        initial_guess,
        args=(mean_returns, cov_matrix, risk_free_rate, annualization_factor),
        method='SLSQP',
        bounds=bounds,
        constraints=constraints, # Only sum(w)=1 constraint, no return constraint
        options={'maxiter': 1000}
    )
    
    if gmvp_result.success:
        gmvp_weights = gmvp_result.x
        gmvp_ret, gmvp_vol, gmvp_sharpe = calculate_portfolio_performance(
            gmvp_weights, mean_returns, cov_matrix, risk_free_rate, annualization_factor
        )
        min_variance_portfolio = {
            "volatility": float(gmvp_vol),
            "return": float(gmvp_ret),
            "sharpe_ratio": float(gmvp_sharpe),
            "weights": {ticker: float(w) for ticker, w in zip(tickers, gmvp_weights)}
        }
    else:
        # Fallback (should rarely happen)
        min_variance_portfolio = None

    # Generate target returns
    # We want the full Minimum Variance Frontier (bullet shape)
    # Range: Min Possible Return -> Max Possible Return
    # We also force the inclusion of the GMVP return to ensure the nose is plotted
    target_returns = np.linspace(min_return, max_return, 200) # Increased resolution
    
    if min_variance_portfolio:
        # Insert GMVP return into the array to ensure it's sampled
        # Find where it fits to keep array sorted
        idx = np.searchsorted(target_returns, min_variance_portfolio['return'])
        target_returns = np.insert(target_returns, idx, min_variance_portfolio['return'])

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
    
    # Use the provided optimal portfolio weights if available (from main optimization)
    # This ensures the Max Sharpe point matches exactly with the Summary tab
    if optimal_weights is not None:
        opt_weights_array = np.array([optimal_weights.get(t, 0.0) for t in tickers])
        opt_ret, opt_vol, opt_sharpe = calculate_portfolio_performance(
            opt_weights_array, mean_returns, cov_matrix, risk_free_rate, annualization_factor
        )
        optimal_portfolio = {
            "volatility": float(opt_vol),
            "return": float(opt_ret),
            "sharpe_ratio": float(opt_sharpe),
            "weights": optimal_weights
        }
    elif frontier_points:
        # Fallback: Pick best point from the generated frontier
        optimal_portfolio = max(frontier_points, key=lambda x: x['sharpe_ratio'])
    else:
        # Fallback if frontier generation failed (unlikely)
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
            optimal_portfolio = {
                "volatility": float(opt_vol),
                "return": float(opt_ret),
                "sharpe_ratio": float(opt_sharpe),
                "weights": {k: float(v) for k, v in zip(tickers, sharpe_result.x)}
            }
        else:
            optimal_portfolio = None
    
    # --- NEW: Monte Carlo Simulation (Feasible Set) ---
    # Generate random portfolios to show the "cloud" of possible outcomes
    num_simulations = 2000
    
    # NOTE: min_variance_portfolio is already calculated explicitly above.
    # We do NOT overwrite it here.
    if min_variance_portfolio is None and frontier_points:
         min_variance_portfolio = min(frontier_points, key=lambda x: x['volatility'])
    
    monte_carlo_points = []
    
    # Vectorized Monte Carlo for speed
    # Generate random weights
    weights_sim = np.random.random((num_simulations, num_assets))
    weights_sim = weights_sim / np.sum(weights_sim, axis=1)[:, np.newaxis]
    
    # Calculate returns and volatilities
    ret_sim = np.sum(weights_sim * mean_returns.values, axis=1) * annualization_factor
    
    # Diagonalize covariance calculation for speed: w * Cov * w.T
    # (N_sim, N_assets) @ (N_assets, N_assets) -> (N_sim, N_assets)
    # Then element-wise mult with weights and sum
    # This is faster than a loop
    vol_sim = np.sqrt(np.sum((weights_sim @ cov_matrix.values) * weights_sim, axis=1) * annualization_factor)
    
    sharpe_sim = (ret_sim - risk_free_rate) / vol_sim
    
    for i in range(num_simulations):
        # Create weights dict for this simulation
        sim_weights = {ticker: float(weights_sim[i][j]) for j, ticker in enumerate(tickers)}
        
        monte_carlo_points.append({
            "volatility": float(vol_sim[i]),
            "return": float(ret_sim[i]),
            "sharpe_ratio": float(sharpe_sim[i]),
            "weights": sim_weights
        })
        
    # --- NEW: Capital Market Line (CML) ---
    # Line from Risk-Free Rate tangent to the Max Sharpe portfolio
    cml_points = []
    if optimal_portfolio:
        # Point 1: Risk Free Rate (0 volatility)
        cml_points.append({
            "volatility": 0.0,
            "return": risk_free_rate,
            "sharpe_ratio": 0.0
        })
        
        # Point 2: Tangency Portfolio (Max Sharpe)
        cml_points.append({
            "volatility": optimal_portfolio["volatility"],
            "return": optimal_portfolio["return"],
            "sharpe_ratio": optimal_portfolio["sharpe_ratio"]
        })
        
        # Point 3: Extension (1.5x volatility of tangency)
        # y = mx + c => Return = Sharpe * Vol + RiskFree
        max_vol_cml = optimal_portfolio["volatility"] * 1.5
        max_ret_cml = risk_free_rate + optimal_portfolio["sharpe_ratio"] * max_vol_cml
        
        cml_points.append({
            "volatility": max_vol_cml,
            "return": max_ret_cml,
            "sharpe_ratio": optimal_portfolio["sharpe_ratio"]
        })

    # --- NEW: Security Market Line (SML) ---
    sml_points = []
    if market_mean_return is not None:
        # Point 1: Risk Free Rate (Beta = 0)
        sml_points.append({
            "beta": 0.0,
            "return": risk_free_rate
        })
        
        # Point 2: Market Portfolio (Beta = 1)
        sml_points.append({
            "beta": 1.0,
            "return": market_mean_return
        })
        
        # Point 3: Extension (Beta = 2.0)
        # CAPM: E(Ri) = Rf + Beta * (Rm - Rf)
        beta_ext = 2.0
        ret_ext = risk_free_rate + beta_ext * (market_mean_return - risk_free_rate)
        
        sml_points.append({
            "beta": beta_ext,
            "return": ret_ext
        })

    # Debug Logging
    print(f"DEBUG: Optimal Portfolio: {optimal_portfolio}")
    print(f"DEBUG: Min Variance Portfolio: {min_variance_portfolio}")

    return {
        "frontier_points": frontier_points,
        "individual_assets": individual_assets,
        "optimal_portfolio": optimal_portfolio,
        "min_variance_portfolio": min_variance_portfolio,
        "monte_carlo_points": monte_carlo_points,
        "cml_points": cml_points,
        "sml_points": sml_points,
        "market_return": market_mean_return
    }
