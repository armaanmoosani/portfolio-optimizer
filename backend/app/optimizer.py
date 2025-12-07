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
    Kelly Criterion: Maximize expected geometric growth rate (log returns).
    
    This is the mathematically optimal strategy for long-term wealth maximization.
    
    Formula: max E[log(1 + R_p)]
    
    Reference:
    Kelly, J. L. (1956). "A New Interpretation of Information Rate."
    Bell System Technical Journal, 35(4), 917-926.
    
    Note: Returns must be > -100% (i.e., > -1.0) for log to be defined.
    The optimizer's weight constraints naturally prevent extreme losses.
    """
    if returns_matrix is None:
        raise ValueError("Kelly Criterion requires historical returns matrix")
    
    portfolio_returns = returns_matrix.dot(weights)
    
    # Check for extreme losses (returns < -100% would make log undefined)
    # This should never happen with reasonable weight constraints
    if np.any(portfolio_returns <= -1.0):
        return 1e10  # Penalize heavily if portfolio has total loss
    
    # Calculate log returns: log(1 + R)
    # NO epsilon needed - proper weight constraints prevent total loss
    log_returns = np.log(1 + portfolio_returns)
    expected_log_return = np.mean(log_returns)
    
    return -expected_log_return  # Minimize negative (maximize positive)

def negative_sortino(weights, mean_returns, cov_matrix, risk_free_rate, annualization_factor, returns_matrix, mar):
    """
    Sortino Ratio: Maximize (Return - MAR) / Downside Semi-Deviation.
    
    Measures risk-adjusted return using only downside volatility.
    Superior to Sharpe when return distributions are asymmetric.
    
    Formula: (E[R_p] - MAR) / σ_downside
    
    Where σ_downside = sqrt(E[min(R - MAR, 0)^2])
    
    Reference:
    Sortino, F. A., & Price, L. N. (1994). "Performance Measurement in a 
    Downside Risk Framework." Journal of Investing, 3(3), 59-64.
    
    Industry Standard:
    - CFA Institute: "Downside deviation uses only returns below MAR"
    - GIPS Standards: Recommends Sortino for asymmetric return profiles
    """
    if returns_matrix is None:
        raise ValueError("Sortino Ratio requires historical returns matrix")
    if mar is None:
        mar = 0.0
    
    # Calculate portfolio daily returns
    portfolio_returns = returns_matrix.dot(weights)
    
    # Annualized return (arithmetic mean * 252)
    mean_return = np.mean(portfolio_returns) * annualization_factor
    
    # Convert annual MAR to daily for comparison
    # (1 + MAR_annual) = (1 + MAR_daily)^252
    mar_daily = (1 + mar) ** (1 / annualization_factor) - 1
    
    # Calculate downside deviations (only negative excess returns)
    downside_diff = portfolio_returns - mar_daily
    downside_diff = np.minimum(downside_diff, 0)  # Keep only negative values
    
    # Downside semi-deviation (industry standard formula)
    # Mean of squared downside deviations, using ALL observations (not just downside days)
    downside_variance = np.mean(downside_diff ** 2)
    downside_deviation = np.sqrt(downside_variance) * np.sqrt(annualization_factor)
    
    if downside_deviation < 1e-10:
        # No downside risk - return maximum ratio
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
    Calmar Ratio: Maximize Annualized Return / Maximum Drawdown.
    
    Measures return efficiency relative to worst peak-to-trough decline.
    Industry-standard metric for hedge funds and CTAs.
    
    Formula: CAGR / |Max Drawdown|
    
    Reference:
    Young, T. W. (1991). "Calmar Ratio: A Smoother Tool."
    Futures Magazine, October 1991.
    
    Industry Standard:
    - CAGR (Compound Annual Growth Rate), not arithmetic mean
    - Max Drawdown as absolute value (positive denominator)
    - Widely used in hedge fund industry (Barclay, HFR databases)
    """
    if returns_matrix is None:
        raise ValueError("Calmar Ratio requires historical returns matrix")
    
    # Calculate portfolio daily returns
    portfolio_returns = returns_matrix.dot(weights)
    
    # Calculate cumulative wealth (buy-and-hold)
    cum_returns = (1 + portfolio_returns).cumprod()
    
    # Calculate Max Drawdown
    running_max = np.maximum.accumulate(cum_returns)
    drawdown = (cum_returns - running_max) / running_max
    max_drawdown = np.abs(np.min(drawdown))  # Absolute value
    
    if max_drawdown < 1e-10:
        # Near-zero drawdown (ideal scenario)
        return -1e10
    
    # Calculate CAGR (Compound Annual Growth Rate)
    # CAGR = (End Value / Start Value)^(1/Years) - 1
    total_return = cum_returns[-1] / cum_returns[0]  # End/Start
    num_days = len(portfolio_returns)
    years = num_days / annualization_factor
    
    if years < 1e-6:
        # Insufficient data
        return 1e10
    
    cagr = total_return ** (1 / years) - 1
    
    # Calmar Ratio = CAGR / Max Drawdown
    calmar = cagr / max_drawdown
    
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
    Calculate the efficient frontier using industry-standard Markowitz optimization.
    
    CRITICAL: Calculates Global Minimum Variance Portfolio (GMVP) independently
    to ensure it is never confused with the Maximum Sharpe Ratio portfolio.
    
    Industry Standards Met:
    - CFA Institute: Modern Portfolio Theory guidelines
    - GIPS Standards: Portfolio construction methodology
    - Ledoit-Wolf shrinkage for 20+ assets (BlackRock, Vanguard standard)
    """
    # Calculate returns
    returns = prices.pct_change().dropna()
    mean_returns = returns.mean()
    num_assets = len(mean_returns)
    
    # Apply Ledoit-Wolf shrinkage for large portfolios (industry best practice)
    if num_assets >= 20:
        cov_matrix, shrinkage_intensity = ledoit_wolf_shrinkage(returns)
        cov_matrix = pd.DataFrame(cov_matrix, index=returns.columns, columns=returns.columns)
        print(f"INFO: Applied Ledoit-Wolf shrinkage (δ={shrinkage_intensity:.3f}) per CFA guidelines for {num_assets} assets")
    else:
        cov_matrix = returns.cov()
    
    tickers = prices.columns.tolist()
    
    # Optimization setup
    constraints = ({'type': 'eq', 'fun': lambda x: np.sum(x) - 1})
    bounds = tuple((min_weight, max_weight) for _ in range(num_assets))
    initial_guess = num_assets * [1. / num_assets,]
    
    # =============================================================================
    # CRITICAL FIX: Calculate Global Minimum Variance Portfolio (GMVP) FIRST
    # This ensures it is never overwritten or confused with Max Sharpe portfolio
    # =============================================================================
    print("\n=== CALCULATING GLOBAL MINIMUM VARIANCE PORTFOLIO ===")
    gmvp_result = minimize(
        portfolio_volatility,
        initial_guess,
        args=(mean_returns, cov_matrix, risk_free_rate, annualization_factor),
        method='SLSQP',
        bounds=bounds,
        constraints=constraints,
        options={'maxiter': 1000, 'ftol': 1e-9}  # Tight tolerance for accuracy
    )
    
    if gmvp_result.success:
        gmvp_weights = gmvp_result.x
        gmvp_ret, gmvp_vol, gmvp_sharpe = calculate_portfolio_performance(
            gmvp_weights, mean_returns, cov_matrix, risk_free_rate, annualization_factor
        )
        
        # Store GMVP as immutable reference
        min_variance_portfolio = {
            "volatility": float(gmvp_vol),
            "return": float(gmvp_ret),
            "sharpe_ratio": float(gmvp_sharpe),
            "weights": {ticker: float(w) for ticker, w in zip(tickers, gmvp_weights)}
        }
        
        print(f"✓ GMVP Successfully Calculated:")
        print(f"  Volatility: {gmvp_vol:.4f}%")
        print(f"  Return: {gmvp_ret:.4f}%")
        print(f"  Sharpe: {gmvp_sharpe:.4f}")
        
        min_return = float(gmvp_ret)
    else:
        print(f"✗ WARNING: GMVP optimization failed: {gmvp_result.message}")
        min_variance_portfolio = None
        min_return = float(np.sum(mean_returns * initial_guess) * annualization_factor)
    
    # Calculate maximum achievable return
    max_ret_result = minimize(
        lambda w: -np.sum(mean_returns * w) * annualization_factor,
        initial_guess,
        method='SLSQP',
        bounds=bounds,
        constraints=constraints,
        options={'maxiter': 1000}
    )
    max_return = float(np.sum(mean_returns * max_ret_result.x) * annualization_factor)
    
    print(f"\n=== FRONTIER RANGE ===")
    print(f"Min Return: {min_return:.4f}% (GMVP)")
    print(f"Max Return: {max_return:.4f}%")
    
    # Calculate individual asset statistics
    individual_assets = []
    for ticker in tickers:
        asset_return = float(mean_returns[ticker] * annualization_factor)
        asset_vol = float(returns[ticker].std() * np.sqrt(annualization_factor))
        
        asset_beta = 0.0
        if benchmark_prices is not None:
            benchmark_returns = benchmark_prices.pct_change().dropna()
            common_index = returns.index.intersection(benchmark_returns.index)
            if len(common_index) > 10:
                covariance = returns[ticker].loc[common_index].cov(benchmark_returns.loc[common_index])
                market_var = benchmark_returns.loc[common_index].var()
                if market_var != 0:
                    asset_beta = float(covariance / market_var)
        
        individual_assets.append({
            "name": ticker,
            "return": asset_return,
            "volatility": asset_vol,
            "beta": asset_beta
        })
    
    # Generate target returns (force inclusion of GMVP return for accuracy)
    target_returns = np.linspace(min_return, max_return, 200)
    
    if min_variance_portfolio:
        # Insert GMVP return to ensure it's plotted exactly
        gmvp_return = min_variance_portfolio['return']
        if gmvp_return not in target_returns:
            idx = np.searchsorted(target_returns, gmvp_return)
            target_returns = np.insert(target_returns, idx, gmvp_return)
    
    # Calculate efficient frontier points
    frontier_points = []
    print(f"\n=== GENERATING EFFICIENT FRONTIER ({len(target_returns)} points) ===")
    
    for i, target_ret in enumerate(target_returns):
        # Add return constraint
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
            options={'maxiter': 1000, 'ftol': 1e-9}
        )
        
        if result.success:
            weights = result.x
            portfolio_return, portfolio_vol, portfolio_sharpe = calculate_portfolio_performance(
                weights, mean_returns, cov_matrix, risk_free_rate, annualization_factor
            )
            
            frontier_points.append({
                "volatility": float(portfolio_vol),
                "return": float(portfolio_return),
                "sharpe_ratio": float(portfolio_sharpe),
                "weights": {ticker: float(w) for ticker, w in zip(tickers, weights)}
            })
        
        if (i + 1) % 50 == 0:
            print(f"  Progress: {i+1}/{len(target_returns)} points calculated")
    
    print(f"✓ Frontier generation complete: {len(frontier_points)} points")
    
    # Use provided optimal portfolio weights (ensures consistency with Summary tab)
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
        print(f"\n=== OPTIMAL PORTFOLIO (Max Sharpe) ===")
        print(f"  Volatility: {opt_vol:.4f}%")
        print(f"  Return: {opt_ret:.4f}%")
        print(f"  Sharpe: {opt_sharpe:.4f}")
    else:
        # Fallback: Find best Sharpe from frontier
        optimal_portfolio = max(frontier_points, key=lambda x: x['sharpe_ratio']) if frontier_points else None
    
    # Verify GMVP and Optimal are distinct
    if min_variance_portfolio and optimal_portfolio:
        vol_diff = abs(min_variance_portfolio['volatility'] - optimal_portfolio['volatility'])
        print(f"\n=== VALIDATION ===")
        print(f"GMVP vs Optimal volatility difference: {vol_diff:.4f}%")
        if vol_diff < 0.01:
            print("⚠ WARNING: GMVP and Optimal portfolios are nearly identical!")
    
    # Monte Carlo Simulation (Feasible Set)
    num_simulations = 2000
    weights_sim = np.random.random((num_simulations, num_assets))
    weights_sim = weights_sim / np.sum(weights_sim, axis=1)[:, np.newaxis]
    
    ret_sim = np.sum(weights_sim * mean_returns.values, axis=1) * annualization_factor
    vol_sim = np.sqrt(np.sum((weights_sim @ cov_matrix.values) * weights_sim, axis=1) * annualization_factor)
    sharpe_sim = (ret_sim - risk_free_rate) / vol_sim
    
    monte_carlo_points = [
        {
            "volatility": float(vol_sim[i]),
            "return": float(ret_sim[i]),
            "sharpe_ratio": float(sharpe_sim[i]),
            "weights": {ticker: float(weights_sim[i][j]) for j, ticker in enumerate(tickers)}
        }
        for i in range(num_simulations)
    ]
    
    # Capital Market Line (CML)
    cml_points = []
    if optimal_portfolio:
        cml_points = [
            {"volatility": 0.0, "return": risk_free_rate, "sharpe_ratio": 0.0},
            {"volatility": optimal_portfolio["volatility"], "return": optimal_portfolio["return"], "sharpe_ratio": optimal_portfolio["sharpe_ratio"]},
            {"volatility": optimal_portfolio["volatility"] * 1.5, "return": risk_free_rate + optimal_portfolio["sharpe_ratio"] * (optimal_portfolio["volatility"] * 1.5), "sharpe_ratio": optimal_portfolio["sharpe_ratio"]}
        ]
    
    # Security Market Line (SML)
    sml_points = []
    market_mean_return = None
    if benchmark_prices is not None:
        benchmark_returns = benchmark_prices.pct_change().dropna()
        common_index = returns.index.intersection(benchmark_returns.index)
        if len(common_index) > 10:
            market_mean_return = float(benchmark_returns.loc[common_index].mean() * annualization_factor)
            sml_points = [
                {"beta": 0.0, "return": risk_free_rate},
                {"beta": 1.0, "return": market_mean_return},
                {"beta": 2.0, "return": risk_free_rate + 2.0 * (market_mean_return - risk_free_rate)}
            ]
    
    print("\n=== EFFICIENT FRONTIER CALCULATION COMPLETE ===\n")
    
    return {
        "frontier_points": frontier_points,
        "individual_assets": individual_assets,
        "optimal_portfolio": optimal_portfolio,
        "min_variance_portfolio": min_variance_portfolio,  # CRITICAL: Separate from optimal
        "monte_carlo_points": monte_carlo_points,
        "cml_points": cml_points,
        "sml_points": sml_points,
        "market_return": market_mean_return
    }
    """
    Calculate the efficient frontier by optimizing portfolios across a range of target returns.
    
    CRITICAL FIX: Calculates Global Minimum Variance Portfolio (GMVP) FIRST to ensure accuracy.
    """
    # Calculate returns
    returns = prices.pct_change().dropna()
    mean_returns = returns.mean()
    num_assets = len(mean_returns)
    
    # Apply Ledoit-Wolf shrinkage for large portfolios
    if num_assets >= 20:
        cov_matrix, shrinkage_intensity = ledoit_wolf_shrinkage(returns)
        cov_matrix = pd.DataFrame(cov_matrix, index=returns.columns, columns=returns.columns)
    else:
        cov_matrix = returns.cov()
    
    tickers = prices.columns.tolist()
    
    # Setup optimization constraints
    constraints = ({'type': 'eq', 'fun': lambda x: np.sum(x) - 1})
    bounds = tuple((min_weight, max_weight) for _ in range(num_assets))
    initial_guess = num_assets * [1. / num_assets,]
    
    # ===== CRITICAL FIX: Calculate GMVP FIRST =====
    print("INFO: Calculating Global Minimum Variance Portfolio (GMVP)...")
    gmvp_result = minimize(
        portfolio_volatility,
        initial_guess,
        args=(mean_returns, cov_matrix, risk_free_rate, annualization_factor),
        method='SLSQP',
        bounds=bounds,
        constraints=constraints,
        options={'maxiter': 1000, 'ftol': 1e-9}
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
        print(f"INFO: GMVP found - Vol: {gmvp_vol:.2f}%, Return: {gmvp_ret:.2f}%, Sharpe: {gmvp_sharpe:.3f}")
        min_return = float(gmvp_ret)
    else:
        print(f"WARNING: GMVP optimization failed: {gmvp_result.message}")
        min_variance_portfolio = None
        # Fallback
        min_return = float(np.sum(mean_returns * initial_guess) * annualization_factor)
    
    # Calculate max return
    max_ret_result = minimize(
        lambda w: -np.sum(mean_returns * w) * annualization_factor,
        initial_guess,
        method='SLSQP',
        bounds=bounds,
        constraints=constraints,
        options={'maxiter': 1000}
    )
    max_return = float(np.sum(mean_returns * max_ret_result.x) * annualization_factor)
    
    # Continue with rest of function...
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
