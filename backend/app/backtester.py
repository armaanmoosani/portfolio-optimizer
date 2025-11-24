import pandas as pd
import numpy as np

def run_backtest_with_rebalancing(prices: pd.DataFrame, weights: dict, initial_capital: float = 10000.0, rebalance_frequency: str = "quarterly", transaction_cost_pct: float = 0.001):
    """
    Run backtest with periodic rebalancing.
    
    Args:
        prices: Historical price data
        weights: Target portfolio weights
        initial_capital: Starting capital
        rebalance_frequency: "monthly", "quarterly", "annual", or "never"
        transaction_cost_pct: Transaction cost as decimal (0.001 = 0.1%)
    
    Returns:
        dict with rebalanced portfolio performance and transaction costs
    """
    tickers = prices.columns.tolist()
    weight_vector = np.array([weights.get(t, 0) for t in tickers])
    
    # Initialize holdings in shares
    asset_prices = prices.iloc[0]
    initial_dollars = weight_vector * initial_capital
    shares = initial_dollars / asset_prices  # Shares of each asset
    
    # Track portfolio value over time
    portfolio_values = []
    transaction_costs_incurred = []
    rebalance_dates = []
    
    # Determine rebalance frequency
    if rebalance_frequency == "monthly":
        resample_freq = "M"
    elif rebalance_frequency == "quarterly":
        resample_freq = "Q"
    elif rebalance_frequency == "annual":
        resample_freq = "Y"
    else:  # "never" or buy-and-hold
        resample_freq = None
    
    # Get rebalance dates
    if resample_freq:
        rebalance_periods = prices.resample(resample_freq).last().index
    else:
        rebalance_periods = []
    
    total_transaction_costs = 0
    
    for date, row in prices.iterrows():
        # Calculate current portfolio value
        current_value = (shares * row).sum()
        portfolio_values.append(current_value)
        
        # Check if we should rebalance
        if date in rebalance_periods:
            # Calculate current weights
            current_dollars = shares * row
            current_weights = current_dollars / current_value
            
            # Calculate target dollars
            target_dollars = weight_vector * current_value
            
            # Calculate rebalancing trades
            trade_dollars = abs(target_dollars - current_dollars)
            transaction_cost = trade_dollars.sum() * transaction_cost_pct
            total_transaction_costs += transaction_cost
            transaction_costs_incurred.append({"date": date, "cost": transaction_cost})
            rebalance_dates.append(date.strftime("%Y-%m-%d"))
            
            # Update shares after rebalancing & transaction costs
            net_value = current_value - transaction_cost
            new_dollars = weight_vector * net_value
            shares = new_dollars / row
    
    # Create DataFrame
    portfolio_series = pd.Series(portfolio_values, index=prices.index)
    
    # Calculate returns
    returns = portfolio_series.pct_change().dropna()
    total_return = (portfolio_series.iloc[-1] / initial_capital) - 1
    
    return {
        "portfolio_value": portfolio_series,
        "returns": returns,
        "total_return": float(total_return),
        "total_transaction_costs": float(total_transaction_costs),
        "transaction_cost_pct_of_initial": float(total_transaction_costs / initial_capital),
        "num_rebalances": len(rebalance_dates),
        "rebalance_dates": rebalance_dates,
    }

def run_backtest(prices: pd.DataFrame, weights: dict, benchmark_data: pd.Series = None, initial_capital: float = 10000.0, risk_free_rate: float = 0.045, annualization_factor: int = 252, mar: float = None, rebalance_freq: str = "never"):
    """
    Run a historical backtest of the optimized portfolio.
    """
    # Align weights with price columns
    tickers = prices.columns.tolist()
    weight_vector = np.array([weights.get(t, 0) for t in tickers])
    
    # Calculate daily returns of assets
    asset_returns = prices.pct_change().dropna()
    
    # Calculate portfolio daily returns
    # R_p = w1*R1 + w2*R2 + ...
    portfolio_returns = asset_returns.dot(weight_vector)
    
    # Calculate cumulative returns
    cumulative_returns = (1 + portfolio_returns).cumprod()
    portfolio_value = initial_capital * cumulative_returns
    
    # Calculate Drawdown
    rolling_max = portfolio_value.cummax()
    drawdown = (portfolio_value - rolling_max) / rolling_max
    max_drawdown = drawdown.min()
    
    # Calculate Metrics
    total_return = cumulative_returns.iloc[-1] - 1
    
    # CAGR (Compound Annual Growth Rate)
    # Ensure we have enough data points
    days = len(portfolio_returns)
    if days < 1:
        return {"metrics": {}, "chart_data": []}
        
    years = days / annualization_factor
    annualized_return = (1 + total_return) ** (1 / years) - 1 if years > 0 else 0
    
    daily_volatility = portfolio_returns.std()
    annualized_volatility = daily_volatility * np.sqrt(annualization_factor)
    
    # Sharpe Ratio
    sharpe_ratio = (annualized_return - risk_free_rate) / annualized_volatility if annualized_volatility != 0 else 0
    
    # Sortino Ratio & Downside Deviation
    # Use Lower Partial Moment (LPM) of order 2 for professional accuracy
    # Target return (MAR) defaults to Risk Free Rate if not provided
    target_return = mar if mar is not None else risk_free_rate
    target_daily = (1 + target_return) ** (1/annualization_factor) - 1
    
    # Calculate downside deviation relative to target
    downside_diff = portfolio_returns - target_daily
    downside_diff = downside_diff[downside_diff < 0]
    
    # LPM2 = sqrt(mean(min(R - T, 0)^2))
    # We use the full length of portfolio_returns for the mean to penalize frequency of losses correctly
    downside_variance = (downside_diff ** 2).sum() / len(portfolio_returns)
    downside_deviation = np.sqrt(downside_variance) * np.sqrt(annualization_factor)
    
    sortino_ratio = (annualized_return - target_return) / downside_deviation if downside_deviation != 0 else 0
    
    # Benchmark comparison (if provided)
    beta = 0
    alpha = 0
    tracking_error = 0
    information_ratio = 0
    up_capture = 0
    down_capture = 0
    r_squared = 0
    
    if benchmark_data is not None and not benchmark_data.empty:
        # Align benchmark with portfolio dates
        common_dates = portfolio_returns.index.intersection(benchmark_data.index)
        
        if len(common_dates) > 10:  # Need sufficient data for regression
            port_rets_aligned = portfolio_returns.loc[common_dates]
            bench_rets_aligned = benchmark_data.pct_change().dropna().loc[common_dates]
            
            # Calculate Beta (Covariance / Variance)
            covariance = np.cov(port_rets_aligned, bench_rets_aligned)[0][1]
            variance = np.var(bench_rets_aligned)
            beta = covariance / variance if variance != 0 else 1
            
            # Calculate Alpha (Jensen's Alpha)
            # Alpha = R_p - (R_f + Beta * (R_m - R_f))
            bench_total_ret = (1 + bench_rets_aligned).cumprod().iloc[-1] - 1
            bench_ann_ret = (1 + bench_total_ret) ** (annualization_factor / len(bench_rets_aligned)) - 1
            alpha = annualized_return - (risk_free_rate + beta * (bench_ann_ret - risk_free_rate))
            
            # --- ENHANCED BENCHMARK METRICS ---
            
            # 1. Tracking Error (Active Risk)
            # Standard deviation of difference between portfolio and benchmark returns
            active_returns = port_rets_aligned - bench_rets_aligned
            tracking_error = float(active_returns.std() * np.sqrt(annualization_factor))
            
            # 2. Information Ratio
            # Measures risk-adjusted active return (alpha) per unit of tracking error
            # IR = Alpha / Tracking Error
            information_ratio = float(alpha / tracking_error) if tracking_error != 0 else 0
            
            # 3. Up Capture Ratio
            # Portfolio return / Benchmark return when benchmark is positive
            # > 100% means portfolio captures more upside than benchmark
            up_periods = bench_rets_aligned > 0
            if up_periods.sum() > 0:
                port_up = port_rets_aligned[up_periods].mean()
                bench_up = bench_rets_aligned[up_periods].mean()
                up_capture = float((port_up / bench_up) * 100) if bench_up != 0 else 0
            
            # 4. Down Capture Ratio
            # Portfolio return / Benchmark return when benchmark is negative  
            # < 100% means portfolio captures less downside than benchmark (good)
            down_periods = bench_rets_aligned < 0
            if down_periods.sum() > 0:
                port_down = port_rets_aligned[down_periods].mean()
                bench_down = bench_rets_aligned[down_periods].mean()
                down_capture = float((port_down / bench_down) * 100) if bench_down != 0 else 0
            
            # 5. R-squared
            # Proportion of portfolio variance explained by benchmark
            # R² = 1 - (Residual Variance / Total Variance)
            from scipy.stats import linregress
            slope, intercept, r_value, p_value, std_err = linregress(bench_rets_aligned, port_rets_aligned)
            r_squared = float(r_value ** 2)

    # --- COMPREHENSIVE PROFESSIONAL METRICS ---
    
    # --- COMPREHENSIVE PROFESSIONAL METRICS ---
    
    # Calculate true monthly returns series for monthly metrics
    # Resample to month end, compounding daily returns
    monthly_returns_series = portfolio_returns.resample('M').apply(lambda x: (1 + x).prod() - 1)
    
    # 1. Arithmetic Mean
    # Annualized: derived from daily for precision (Daily Mean * 252)
    arithmetic_mean_annualized = float(portfolio_returns.mean() * annualization_factor)
    # Monthly: derived from actual monthly returns
    arithmetic_mean_monthly = float(monthly_returns_series.mean()) if not monthly_returns_series.empty else 0.0
    
    # 2. Geometric Mean (Compounded Growth Rate)
    # Annualized: CAGR formula (already calculated as annualized_return)
    geometric_mean_annualized = float(annualized_return)
    # Monthly: Geometric mean of monthly returns
    if not monthly_returns_series.empty:
        geo_mean_monthly = (1 + monthly_returns_series).prod() ** (1 / len(monthly_returns_series)) - 1
        geometric_mean_monthly = float(geo_mean_monthly)
    else:
        geometric_mean_monthly = 0.0
    
    # 3. Standard Deviation (Volatility)
    # Annualized: derived from daily for precision (Daily Std * sqrt(252))
    std_dev_annualized = float(portfolio_returns.std() * np.sqrt(annualization_factor))
    # Monthly: Standard deviation of monthly returns
    std_dev_monthly = float(monthly_returns_series.std()) if not monthly_returns_series.empty else 0.0
    
    # 4. Downside Deviation
    # Monthly: Calculated on monthly returns with 0% threshold
    if not monthly_returns_series.empty:
        monthly_downside = monthly_returns_series[monthly_returns_series < 0]
        if len(monthly_downside) > 0:
            # LPM2 on monthly data
            monthly_downside_var = (monthly_downside ** 2).sum() / len(monthly_returns_series)
            downside_dev_monthly = float(np.sqrt(monthly_downside_var))
        else:
            downside_dev_monthly = 0.0
    else:
        downside_dev_monthly = 0.0
    
    # Benchmark Correlation
    benchmark_correlation = 0.0
    if benchmark_data is not None and not benchmark_data.empty:
        common_dates = portfolio_returns.index.intersection(benchmark_data.index)
        if len(common_dates) > 10:
            port_rets_aligned = portfolio_returns.loc[common_dates]
            bench_rets_aligned = benchmark_data.pct_change().dropna().loc[common_dates]
            benchmark_correlation = float(np.corrcoef(port_rets_aligned, bench_rets_aligned)[0, 1])
    
    # Treynor Ratio: (Return - Risk-Free Rate) / Beta
    # Measures excess return per unit of systematic risk
    treynor_ratio = float((annualized_return - risk_free_rate) / beta) if beta != 0 else 0.0

    # --- CRITICAL RISK METRICS ---
    
    # 1. Value at Risk (VaR) - 95% and 99% confidence
    # Represents the maximum loss not exceeded with X% confidence over 1 day
    var_95_daily = float(np.percentile(portfolio_returns, 5))
    var_99_daily = float(np.percentile(portfolio_returns, 1))
    # Annualize using square root of time (assumes normal distribution)
    var_95_annual = var_95_daily * np.sqrt(annualization_factor)
    var_99_annual = var_99_daily * np.sqrt(annualization_factor)
    
    # 2. Conditional Value at Risk (CVaR / Expected Shortfall)
    # Expected loss given that loss exceeds VaR (tail risk)
    returns_below_var_95 = portfolio_returns[portfolio_returns <= var_95_daily]
    cvar_95_daily = float(returns_below_var_95.mean()) if len(returns_below_var_95) > 0 else var_95_daily
    cvar_95_annual = cvar_95_daily * np.sqrt(annualization_factor)
    
    returns_below_var_99 = portfolio_returns[portfolio_returns <= var_99_daily]
    cvar_99_daily = float(returns_below_var_99.mean()) if len(returns_below_var_99) > 0 else var_99_daily
    cvar_99_annual = cvar_99_daily * np.sqrt(annualization_factor)
    
    #  3. Calmar Ratio: Annualized Return / |Max Drawdown|
    # Higher is better - reward-to-risk using drawdown instead of volatility
    calmar_ratio = float(annualized_return / abs(max_drawdown)) if max_drawdown != 0 else 0.0
    
    # 4. Skewness & Kurtosis (Distribution Shape)
    # Skewness: Asymmetry of returns (negative = left tail risk)
    # Kurtosis: Tail heaviness (>3 = fat tails, higher crash risk)
    from scipy.stats import skew, kurtosis
    return_skewness = float(skew(portfolio_returns))
    return_kurtosis = float(kurtosis(portfolio_returns, fisher=False))  # Pearson's (not excess)

    # Maximum Drawdown already calculated above as max_drawdown

    # Prepare chart data
    # --- Advanced Analytics ---

    # 1. Annual Returns & Best/Worst Year
    annual_returns = portfolio_returns.resample('Y').apply(lambda x: (1 + x).prod() - 1)
    best_year = float(annual_returns.max()) if not annual_returns.empty else 0.0
    worst_year = float(annual_returns.min()) if not annual_returns.empty else 0.0

    # 2. Trailing Returns
    def get_trailing_return(days):
        if len(portfolio_returns) >= days:
            return float((1 + portfolio_returns.iloc[-days:]).prod() - 1)
        return None

    trailing_returns = {
        "3M": get_trailing_return(63),  # Approx 3 months
        "1Y": get_trailing_return(252),
        "3Y": get_trailing_return(252 * 3),
        "5Y": get_trailing_return(252 * 5),
        "YTD": float((1 + portfolio_returns[portfolio_returns.index.year == portfolio_returns.index[-1].year]).prod() - 1) if not portfolio_returns.empty else 0.0
    }

    # 3. Monthly Returns Matrix
    monthly_returns = portfolio_returns.resample('M').apply(lambda x: (1 + x).prod() - 1)
    monthly_matrix = {}
    for date, value in monthly_returns.items():
        year = date.year
        month = date.month
        if year not in monthly_matrix:
            monthly_matrix[year] = {}
        monthly_matrix[year][month] = float(value)

    # 4. Top Drawdowns
    # Calculate drawdown series
    drawdown_series = drawdown
    drawdown_periods = []
    is_drawdown = False
    start_date = None
    trough_date = None
    max_dd_in_period = 0

    for date, dd in drawdown_series.items():
        if dd < 0:
            if not is_drawdown:
                is_drawdown = True
                start_date = date
                max_dd_in_period = dd
                trough_date = date
            else:
                if dd < max_dd_in_period:
                    max_dd_in_period = dd
                    trough_date = date
        elif is_drawdown:
            is_drawdown = False
            end_date = date
            drawdown_periods.append({
                "start": start_date.strftime("%Y-%m-%d"),
                "end": end_date.strftime("%Y-%m-%d"),
                "trough": trough_date.strftime("%Y-%m-%d"),
                "depth": float(max_dd_in_period),
                "recovery_days": (end_date - start_date).days
            })
    
    # Sort by depth (ascending because they are negative) and take top 5
    top_drawdowns = sorted(drawdown_periods, key=lambda x: x['depth'])[:5]

    # 5. Asset Correlations
    correlation_matrix = asset_returns.corr().to_dict()
    # Clean up for JSON (convert keys to strings if needed, though tickers are strings)
    
    # 6. Individual Asset Metrics
    asset_metrics = {}
    for ticker in tickers:
        ret = asset_returns[ticker]
        ann_ret = (1 + ret.mean()) ** annualization_factor - 1
        ann_vol = ret.std() * np.sqrt(annualization_factor)
        asset_metrics[ticker] = {
            "annualized_return": float(ann_ret),
            "annualized_volatility": float(ann_vol),
            "max_drawdown": float(((1 + ret).cumprod() / (1 + ret).cumprod().cummax() - 1).min())
        }

    # Prepare chart data
    chart_data = []
    for date, value in portfolio_value.items():
        chart_data.append({
            "date": date.strftime("%Y-%m-%d"),
            "value": float(round(value, 2)),
            "drawdown": float(round(drawdown.loc[date] * 100, 2))
        })

    return {
        "metrics": {
            "total_return": float(total_return),
            "annualized_return": float(annualized_return),
            "annualized_volatility": float(annualized_volatility),
            "sharpe_ratio": float(sharpe_ratio),
            "sortino_ratio": float(sortino_ratio),
            "max_drawdown": float(max_drawdown),
            "beta": float(beta),
            "alpha": float(alpha),
            "best_year": best_year,
            "worst_year": worst_year,
            # New comprehensive metrics
            "arithmetic_mean_monthly": arithmetic_mean_monthly,
            "arithmetic_mean_annualized": arithmetic_mean_annualized,
            "geometric_mean_monthly": geometric_mean_monthly,
            "geometric_mean_annualized": geometric_mean_annualized,
            "std_dev_monthly": std_dev_monthly,
            "std_dev_annualized": std_dev_annualized,
            "downside_dev_monthly": downside_dev_monthly,
            "benchmark_correlation": benchmark_correlation,
            "treynor_ratio": treynor_ratio,
            # Critical risk metrics (Phase 1)
            "calmar_ratio": calmar_ratio,
            "var_95_daily":  var_95_daily,
            "var_99_daily": var_99_daily,
            "var_95_annual": var_95_annual,
            "var_99_annual": var_99_annual,
            "cvar_95_daily": cvar_95_daily,
            "cvar_99_daily": cvar_99_daily,
            "cvar_95_annual": cvar_95_annual,
            "cvar_99_annual": cvar_99_annual,
            "skewness": return_skewness,
            "kurtosis": return_kurtosis,
            # Enhanced benchmark metrics (Phase 3)
            "tracking_error": tracking_error,
            "information_ratio": information_ratio,
            "up_capture": up_capture,
            "down_capture": down_capture,
            "r_squared": r_squared,
        },
        "trailing_returns": trailing_returns,
        "monthly_returns": monthly_matrix,
        "drawdowns": top_drawdowns,
        "correlations": correlation_matrix,
        "asset_metrics": asset_metrics,
        "chart_data": chart_data
    }
    
    # Add rebalancing comparison (Phase 4)
    if rebalance_freq != "never":
        rebalanced_results = run_backtest_with_rebalancing(
            prices, weights, initial_capital, rebalance_freq, transaction_cost_pct=0.001
        )
        
        # Calculate performance difference
        bh_final = portfolio_value.iloc[-1]
        rb_final = rebalanced_results["portfolio_value"].iloc[-1]
        
        return_dict["rebalancing"] = {
            "buy_and_hold_final": float(bh_final),
            "rebalanced_final": float(rb_final),
            "difference": float(rb_final - bh_final),
            "difference_pct": float((rb_final - bh_final) / bh_final * 100),
            "rebalanced_return": rebalanced_results["total_return"],
            "transaction_costs": rebalanced_results["total_transaction_costs"],
            "transaction_cost_pct": rebalanced_results["transaction_cost_pct_of_initial"],
            "num_rebalances": rebalanced_results["num_rebalances"],
            "rebalance_dates": rebalanced_results["rebalance_dates"],
            "frequency": rebalance_freq,
        }
    
    return return_dict
