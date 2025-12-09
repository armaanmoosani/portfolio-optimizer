import pandas as pd
import numpy as np

def calculate_risk_contributions(weights: dict, asset_returns: pd.DataFrame, annualization_factor: int = 252):
    """
    Calculate detailed risk contributions (MCR, PCR, VaR Contribution).
    
    Args:
        weights: Dictionary of asset weights
        asset_returns: DataFrame of daily asset returns
        annualization_factor: Annualization factor (default 252)
        
    Returns:
        DataFrame with risk metrics for each asset
    """
    tickers = asset_returns.columns.tolist()
    w = np.array([weights.get(t, 0) for t in tickers])
    
    cov_matrix = asset_returns.cov() * annualization_factor
    
    port_vol = np.sqrt(np.dot(w.T, np.dot(cov_matrix, w)))
    
    if port_vol < 1e-8:
        port_vol = 1e-8

    mcr = np.dot(cov_matrix, w) / port_vol
    
    acr = w * mcr
    
    pcr = acr / port_vol
    
    port_returns = asset_returns.dot(w)
    
    var_95 = np.percentile(port_returns, 5)
    
    
    tail_indices = port_returns <= var_95
    if tail_indices.sum() > 0:
        avg_tail_returns = asset_returns[tail_indices].mean()
        cvar_contrib = w * avg_tail_returns
        port_cvar = port_returns[tail_indices].mean()
    else:
        cvar_contrib = np.zeros(len(tickers))
        port_cvar = 0
        
    z_score = 1.645 
    var_param_contrib = acr * z_score
    
    results = pd.DataFrame({
        "Ticker": tickers,
        "Weight": w,
        "MCR": mcr,
        "Contribution_to_Vol": acr,
        "PCR": pcr,
        "Parametric_VaR_Contrib": var_param_contrib,
        "CVaR_Contrib": cvar_contrib
    })
    
    return results.set_index("Ticker").to_dict(orient="index")

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
    
    asset_prices = prices.iloc[0]
    initial_dollars = weight_vector * initial_capital
    shares = initial_dollars / asset_prices  
    
    portfolio_values = []
    transaction_costs_incurred = []
    rebalance_dates = []
    
    if rebalance_frequency == "monthly":
        resample_freq = "M"
    elif rebalance_frequency == "quarterly":
        resample_freq = "Q"
    elif rebalance_frequency == "annual":
        resample_freq = "Y"
    else:  
        resample_freq = None
    
    if resample_freq:
        rebalance_periods = prices.resample(resample_freq).last().index
    else:
        rebalance_periods = []
    
    total_transaction_costs = 0
    
    for date, row in prices.iterrows():
        current_value = (shares * row).sum()
        portfolio_values.append(current_value)
        
        if date in rebalance_periods:
            current_dollars = shares * row
            current_weights = current_dollars / current_value
            
            target_dollars = weight_vector * current_value
            
            trade_dollars = abs(target_dollars - current_dollars)
            transaction_cost = trade_dollars.sum() * transaction_cost_pct
            total_transaction_costs += transaction_cost
            transaction_costs_incurred.append({"date": date, "cost": transaction_cost})
            rebalance_dates.append(date.strftime("%Y-%m-%d"))
            
            net_value = current_value - transaction_cost
            new_dollars = weight_vector * net_value
            shares = new_dollars / row
    
    portfolio_series = pd.Series(portfolio_values, index=prices.index)
    
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
    tickers = prices.columns.tolist()
    weight_vector = np.array([weights.get(t, 0) for t in tickers])
    
    asset_returns = prices.pct_change().dropna()
    
    portfolio_returns = asset_returns.dot(weight_vector)
    
    cumulative_returns = (1 + portfolio_returns).cumprod()
    portfolio_value = initial_capital * cumulative_returns
    
    rolling_max = portfolio_value.cummax()
    drawdown = (portfolio_value - rolling_max) / rolling_max
    max_drawdown = drawdown.min()
    
    total_return = cumulative_returns.iloc[-1] - 1
    
    days = len(portfolio_returns)
    if days < 1:
        return {"metrics": {}, "chart_data": []}
        
    years = days / annualization_factor
    annualized_return = (1 + total_return) ** (1 / years) - 1 if years > 0 else 0
    
    daily_volatility = portfolio_returns.std()
    annualized_volatility = daily_volatility * np.sqrt(annualization_factor)
    
    sharpe_ratio = (annualized_return - risk_free_rate) / annualized_volatility if annualized_volatility != 0 else 0
    
    target_return = mar if mar is not None else risk_free_rate
    target_daily = (1 + target_return) ** (1/annualization_factor) - 1
    
    downside_diff = portfolio_returns - target_daily
    downside_diff = downside_diff[downside_diff < 0]
    
    downside_variance = (downside_diff ** 2).sum() / len(portfolio_returns)
    downside_deviation = np.sqrt(downside_variance) * np.sqrt(annualization_factor)
    
    sortino_ratio = (annualized_return - target_return) / downside_deviation if downside_deviation != 0 else 0
    
    beta = 0
    alpha = 0
    tracking_error = 0
    information_ratio = 0
    up_capture = 0
    down_capture = 0
    r_squared = 0
    
    if benchmark_data is not None and not benchmark_data.empty:
        common_dates = portfolio_returns.index.intersection(benchmark_data.index)
        
        if len(common_dates) > 10:  
            bench_returns_all = benchmark_data.pct_change().dropna()
            
            common_dates = portfolio_returns.index.intersection(bench_returns_all.index)
            
            if len(common_dates) > 10:
                port_rets_aligned = portfolio_returns.loc[common_dates]
                bench_rets_aligned = bench_returns_all.loc[common_dates]
            
                covariance = np.cov(port_rets_aligned, bench_rets_aligned)[0][1]
                variance = np.var(bench_rets_aligned)
                beta = covariance / variance if variance != 0 else 1
                
                bench_total_ret = (1 + bench_rets_aligned).cumprod().iloc[-1] - 1
                bench_ann_ret = (1 + bench_total_ret) ** (annualization_factor / len(bench_rets_aligned)) - 1
                alpha = annualized_return - (risk_free_rate + beta * (bench_ann_ret - risk_free_rate))
                
                
                active_returns = port_rets_aligned - bench_rets_aligned
                tracking_error = float(active_returns.std() * np.sqrt(annualization_factor))
                
                information_ratio = float(alpha / tracking_error) if tracking_error != 0 else 0
                
                up_periods = bench_rets_aligned > 0
                if up_periods.sum() > 0:
                    port_up = port_rets_aligned[up_periods].mean()
                    bench_up = bench_rets_aligned[up_periods].mean()
                    up_capture = float((port_up / bench_up) * 100) if bench_up != 0 else 0
                
                down_periods = bench_rets_aligned < 0
                if down_periods.sum() > 0:
                    port_down = port_rets_aligned[down_periods].mean()
                    bench_down = bench_rets_aligned[down_periods].mean()
                    down_capture = float((port_down / bench_down) * 100) if bench_down != 0 else 0
                
                from scipy.stats import linregress
                slope, intercept, r_value, p_value, std_err = linregress(bench_rets_aligned, port_rets_aligned)
                r_squared = float(r_value ** 2)

    
    
    monthly_returns_series = portfolio_returns.resample('M').apply(lambda x: (1 + x).prod() - 1)
    
    arithmetic_mean_annualized = float(portfolio_returns.mean() * annualization_factor)
    arithmetic_mean_monthly = float(monthly_returns_series.mean()) if not monthly_returns_series.empty else 0.0
    
    geometric_mean_annualized = float(annualized_return)
    if not monthly_returns_series.empty:
        geo_mean_monthly = (1 + monthly_returns_series).prod() ** (1 / len(monthly_returns_series)) - 1
        geometric_mean_monthly = float(geo_mean_monthly)
    else:
        geometric_mean_monthly = 0.0
    
    std_dev_annualized = float(portfolio_returns.std() * np.sqrt(annualization_factor))
    std_dev_monthly = float(monthly_returns_series.std()) if not monthly_returns_series.empty else 0.0
    
    if not monthly_returns_series.empty:
        monthly_downside = monthly_returns_series[monthly_returns_series < 0]
        if len(monthly_downside) > 0:
            monthly_downside_var = (monthly_downside ** 2).sum() / len(monthly_returns_series)
            downside_dev_monthly = float(np.sqrt(monthly_downside_var))
        else:
            downside_dev_monthly = 0.0
    else:
        downside_dev_monthly = 0.0
    
    benchmark_correlation = 0.0
    if benchmark_data is not None and not benchmark_data.empty:
        bench_returns_all = benchmark_data.pct_change().dropna()
        common_dates = portfolio_returns.index.intersection(bench_returns_all.index)
        
        if len(common_dates) > 10:
            port_rets_aligned = portfolio_returns.loc[common_dates]
            bench_rets_aligned = bench_returns_all.loc[common_dates]
            benchmark_correlation = float(np.corrcoef(port_rets_aligned, bench_rets_aligned)[0, 1])
    
    treynor_ratio = float((annualized_return - risk_free_rate) / beta) if beta != 0 else 0.0

    
    var_95_daily = float(np.percentile(portfolio_returns, 5))
    var_99_daily = float(np.percentile(portfolio_returns, 1))
    
    var_95_annual = var_95_daily * np.sqrt(annualization_factor)
    var_99_annual = var_99_daily * np.sqrt(annualization_factor)
    
    returns_below_var_95 = portfolio_returns[portfolio_returns <= var_95_daily]
    cvar_95_daily = float(returns_below_var_95.mean()) if len(returns_below_var_95) > 0 else var_95_daily
    cvar_95_annual = cvar_95_daily * np.sqrt(annualization_factor)
    
    returns_below_var_99 = portfolio_returns[portfolio_returns <= var_99_daily]
    cvar_99_daily = float(returns_below_var_99.mean()) if len(returns_below_var_99) > 0 else var_99_daily
    cvar_99_annual = cvar_99_daily * np.sqrt(annualization_factor)
    
    calmar_ratio = float(annualized_return / abs(max_drawdown)) if max_drawdown != 0 else 0.0
    
    from scipy.stats import skew, kurtosis
    return_skewness = float(skew(portfolio_returns))
    return_kurtosis = float(kurtosis(portfolio_returns, fisher=False))  



    annual_returns = portfolio_returns.resample('Y').apply(lambda x: (1 + x).prod() - 1)
    best_year = float(annual_returns.max()) if not annual_returns.empty else 0.0
    worst_year = float(annual_returns.min()) if not annual_returns.empty else 0.0

    def get_trailing_return(days):
        if len(portfolio_returns) >= days:
            return float((1 + portfolio_returns.iloc[-days:]).prod() - 1)
        return None

    trailing_returns = {
        "3M": get_trailing_return(63),  
        "1Y": get_trailing_return(252),
        "3Y": get_trailing_return(252 * 3),
        "5Y": get_trailing_return(252 * 5),
        "YTD": float((1 + portfolio_returns[portfolio_returns.index.year == portfolio_returns.index[-1].year]).prod() - 1) if not portfolio_returns.empty else 0.0
    }

    monthly_returns = portfolio_returns.resample('M').apply(lambda x: (1 + x).prod() - 1)
    monthly_matrix = {}
    for date, value in monthly_returns.items():
        year = date.year
        month = date.month
        if year not in monthly_matrix:
            monthly_matrix[year] = {}
        monthly_matrix[year][month] = float(value)

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
    
    top_drawdowns = sorted(drawdown_periods, key=lambda x: x['depth'])[:5]

    correlation_matrix = asset_returns.corr().to_dict()
    
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

    chart_data = []
    for date, value in portfolio_value.items():
        chart_data.append({
            "date": date.strftime("%Y-%m-%d"),
            "value": float(round(value, 2)),
            "drawdown": float(round(drawdown.loc[date] * 100, 2))
        })

    risk_contributions = calculate_risk_contributions(weights, asset_returns, annualization_factor)

    result = {
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
            "arithmetic_mean_monthly": arithmetic_mean_monthly,
            "arithmetic_mean_annualized": arithmetic_mean_annualized,
            "geometric_mean_monthly": geometric_mean_monthly,
            "geometric_mean_annualized": geometric_mean_annualized,
            "std_dev_monthly": std_dev_monthly,
            "std_dev_annualized": std_dev_annualized,
            "downside_dev_monthly": downside_dev_monthly,
            "benchmark_correlation": benchmark_correlation,
            "treynor_ratio": treynor_ratio,
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
            "tracking_error": tracking_error,
            "information_ratio": information_ratio,
            "up_capture": up_capture,
            "down_capture": down_capture,
            "r_squared": r_squared,
        },
        "risk_contributions": risk_contributions,
        "trailing_returns": trailing_returns,
        "monthly_returns": monthly_matrix,
        "drawdowns": top_drawdowns,
        "correlations": correlation_matrix,
        "asset_metrics": asset_metrics,
        "chart_data": chart_data,
    }
    if rebalance_freq != "never":
        rebalanced_results = run_backtest_with_rebalancing(
            prices, weights, initial_capital, rebalance_freq, transaction_cost_pct=0.001
        )
        
        bh_final = portfolio_value.iloc[-1]
        rb_final = rebalanced_results["portfolio_value"].iloc[-1]
        
        result["rebalancing"] = {
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
    
    return result
