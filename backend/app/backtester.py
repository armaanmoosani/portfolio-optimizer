import pandas as pd
import numpy as np

def run_backtest(prices: pd.DataFrame, weights: dict, benchmark_data: pd.Series = None, initial_capital: float = 10000.0):
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
        
    years = days / 252
    annualized_return = (1 + total_return) ** (1 / years) - 1 if years > 0 else 0
    
    daily_volatility = portfolio_returns.std()
    annualized_volatility = daily_volatility * np.sqrt(252)
    
    # Sharpe Ratio (assuming constant risk-free rate for backtest simplification)
    # Industry standard often uses 0 or a fixed rate for simple backtests if historical RF not available
    rf_rate = 0.045 
    sharpe_ratio = (annualized_return - rf_rate) / annualized_volatility if annualized_volatility != 0 else 0
    
    # Sortino Ratio
    # Only penalize negative returns (downside deviation)
    negative_returns = portfolio_returns[portfolio_returns < 0]
    downside_deviation = negative_returns.std() * np.sqrt(252)
    sortino_ratio = (annualized_return - rf_rate) / downside_deviation if downside_deviation != 0 else 0
    
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
            bench_ann_ret = (1 + bench_total_ret) ** (252 / len(bench_rets_aligned)) - 1
            alpha = annualized_return - (rf_rate + beta * (bench_ann_ret - rf_rate))

    # Prepare chart data
    chart_data = []
    for date, value in portfolio_value.items():
        chart_data.append({
            "date": date.strftime("%Y-%m-%d"),
            "value": round(value, 2),
            "drawdown": round(drawdown.loc[date] * 100, 2)
        })

    return {
        "metrics": {
            "total_return": total_return,
            "annualized_return": annualized_return,
            "annualized_volatility": annualized_volatility,
            "sharpe_ratio": sharpe_ratio,
            "sortino_ratio": sortino_ratio,
            "max_drawdown": max_drawdown,
            "beta": beta,
            "alpha": alpha
        },
        "chart_data": chart_data
    }
