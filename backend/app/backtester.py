import pandas as pd
import numpy as np

def run_backtest(prices: pd.DataFrame, weights: dict, benchmark_data: pd.Series = None, initial_capital: float = 10000.0, risk_free_rate: float = 0.045, annualization_factor: int = 252):
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
    
    # Sortino Ratio
    # Only penalize negative returns (downside deviation)
    negative_returns = portfolio_returns[portfolio_returns < 0]
    downside_deviation = negative_returns.std() * np.sqrt(annualization_factor)
    sortino_ratio = (annualized_return - risk_free_rate) / downside_deviation if downside_deviation != 0 else 0
    
    # Benchmark comparison (if provided)
    beta = 0
    alpha = 0
    if benchmark_data is not None and not benchmark_data.empty:
        # Align benchmark with portfolio dates
        common_dates = portfolio_returns.index.intersection(benchmark_data.index)
        
        if len(common_dates) > 10: # Need sufficient data for regression
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
        },
        "trailing_returns": trailing_returns,
        "monthly_returns": monthly_matrix,
        "drawdowns": top_drawdowns,
        "correlations": correlation_matrix,
        "asset_metrics": asset_metrics,
        "chart_data": chart_data
    }
