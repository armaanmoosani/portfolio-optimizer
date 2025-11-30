import pandas as pd
import numpy as np
from datetime import datetime
import yfinance as yf

class StressTester:
    """
    Professional Stress Testing Module.
    
    Simulates portfolio performance during specific historical crisis periods.
    Comparisons are made against a benchmark (default: SPY).
    """
    
    SCENARIOS = {
        "2008_financial_crisis": {
            "name": "2008 Financial Crisis",
            "start_date": "2007-10-01",
            "end_date": "2009-03-01",
            "description": "Global financial crisis triggered by the subprime mortgage collapse."
        },
        "2011_euro_debt": {
            "name": "2011 Euro Debt Crisis",
            "start_date": "2011-04-01",
            "end_date": "2011-09-01",
            "description": "Sovereign debt crisis in the Eurozone leading to market volatility."
        },
        "2018_trade_war": {
            "name": "2018 Trade War / Rate Hike",
            "start_date": "2018-10-01",
            "end_date": "2018-12-31",
            "description": "Market correction driven by US-China trade tensions and Fed rate hikes."
        },
        "2020_covid_crash": {
            "name": "2020 Covid-19 Crash",
            "start_date": "2020-02-19",
            "end_date": "2020-03-23",
            "description": "Rapid market collapse due to the onset of the global Covid-19 pandemic."
        },
        "2022_inflation_bear": {
            "name": "2022 Inflation Bear Market",
            "start_date": "2022-01-03",
            "end_date": "2022-10-14",
            "description": "Bear market caused by high inflation and aggressive Fed tightening."
        }
    }

    @staticmethod
    def run_stress_test(weights: dict, benchmark_ticker: str = "SPY"):
        """
        Run stress tests for all defined scenarios.
        
        Args:
            weights: Dictionary of {ticker: weight}
            benchmark_ticker: Ticker for benchmark comparison
            
        Returns:
            List of scenario results
        """
        tickers = list(weights.keys())
        results = []
        
        for key, scenario in StressTester.SCENARIOS.items():
            try:
                # 1. Fetch Data for this specific period
                # Add buffer to start date for valid return calculation
                start_dt = datetime.strptime(scenario["start_date"], "%Y-%m-%d")
                buffer_start = (start_dt - pd.Timedelta(days=5)).strftime("%Y-%m-%d")
                
                data = yf.download(
                    tickers + [benchmark_ticker], 
                    start=buffer_start, 
                    end=scenario["end_date"], 
                    progress=False
                )
                
                # Handle different yfinance return structures
                if isinstance(data, pd.DataFrame):
                    if 'Adj Close' in data.columns:
                        data = data['Adj Close']
                    elif 'Close' in data.columns:
                        data = data['Close']
                    elif isinstance(data.columns, pd.MultiIndex):
                        # Try to find the price level
                        if 'Adj Close' in data.columns.get_level_values(0):
                             data = data.xs('Adj Close', axis=1, level=0)
                        elif 'Close' in data.columns.get_level_values(0):
                             data = data.xs('Close', axis=1, level=0)
                
                # Handle single ticker case (Series -> DataFrame)
                if isinstance(data, pd.Series):
                    data = data.to_frame()
                    if len(tickers) + 1 == 1:
                        data.columns = tickers + [benchmark_ticker]

                # Check if we have data for all assets
                # If an asset didn't exist (all NaNs), we can't run this scenario accurately
                if data.empty or data.isna().all().any():
                    results.append({
                        "id": key,
                        "name": scenario["name"],
                        "description": scenario["description"],
                        "available": False,
                        "reason": "Insufficient historical data for one or more assets."
                    })
                    continue

                # Fill missing data (standard practice)
                data = data.ffill().bfill().dropna()
                
                if data.empty:
                     results.append({
                        "id": key,
                        "name": scenario["name"],
                        "description": scenario["description"],
                        "available": False,
                        "reason": "No overlapping data found."
                    })
                     continue

                # 2. Calculate Returns
                returns = data.pct_change().dropna()
                
                # Filter to exact scenario dates
                mask = (returns.index >= scenario["start_date"]) & (returns.index <= scenario["end_date"])
                period_returns = returns.loc[mask]
                
                if period_returns.empty:
                    results.append({
                        "id": key,
                        "name": scenario["name"],
                        "description": scenario["description"],
                        "available": False,
                        "reason": "No data within scenario dates."
                    })
                    continue

                # Portfolio Return
                # Align weights vector
                w_vector = np.array([weights.get(t, 0) for t in tickers])
                
                # Calculate portfolio daily returns: R_p = w1*R1 + ...
                # Note: We must exclude benchmark column from dot product
                asset_cols = [c for c in period_returns.columns if c in tickers]
                
                # Verify we have all assets
                if len(asset_cols) != len(tickers):
                     # Some tickers might be missing in this period (e.g. crypto in 2008)
                     # In professional systems, we might re-normalize weights or skip
                     # Here we skip to be safe/strict
                    results.append({
                        "id": key,
                        "name": scenario["name"],
                        "description": scenario["description"],
                        "available": False,
                        "reason": "One or more assets did not exist during this period."
                    })
                    continue

                port_daily_ret = period_returns[asset_cols].dot(w_vector)
                
                # Benchmark Return
                bench_daily_ret = period_returns[benchmark_ticker] if benchmark_ticker in period_returns else pd.Series(0, index=period_returns.index)

                # Calculate Performance Metrics
                total_return = (1 + port_daily_ret).prod() - 1
                benchmark_return = (1 + bench_daily_ret).prod() - 1
                
                # Max Drawdown
                cumulative = (1 + port_daily_ret).cumprod()
                peak = cumulative.cummax()
                drawdown = (cumulative - peak) / peak
                max_drawdown = drawdown.min()
                
                # Stress Volatility (Annualized)
                stress_vol = port_daily_ret.std() * np.sqrt(252)
                bench_vol = bench_daily_ret.std() * np.sqrt(252)
                
                # Stress Correlation
                stress_corr = port_daily_ret.corr(bench_daily_ret)
                
                # Stress Beta
                # Beta = Corr * (PortVol / BenchVol)
                if bench_vol > 0 and not np.isnan(stress_corr):
                    stress_beta = stress_corr * (stress_vol / bench_vol)
                else:
                    stress_beta = 0.0
                
                # Stress VaR (95%)
                # 5th percentile of daily returns
                stress_var_95 = np.percentile(port_daily_ret, 5)
                
                results.append({
                    "id": key,
                    "name": scenario["name"],
                    "description": scenario["description"],
                    "available": True,
                    "start_date": scenario["start_date"],
                    "end_date": scenario["end_date"],
                    "metrics": {
                        "portfolio_return": float(total_return),
                        "benchmark_return": float(benchmark_return),
                        "difference": float(total_return - benchmark_return),
                        "max_drawdown": float(max_drawdown),
                        "stress_volatility": float(stress_vol),
                        "stress_correlation": float(stress_corr) if not np.isnan(stress_corr) else 0.0,
                        "stress_beta": float(stress_beta),
                        "stress_var_95": float(stress_var_95)
                    }
                })

            except Exception as e:
                print(f"Error running stress test {key}: {e}")
                results.append({
                    "id": key,
                    "name": scenario["name"],
                    "description": scenario["description"],
                    "available": False,
                    "reason": f"Calculation error: {str(e)}"
                })
        
        return results

    @staticmethod
    def run_hypothetical_test(weights: dict, benchmark_ticker: str = "SPY"):
        """
        Run hypothetical stress tests based on factor sensitivities (Beta).
        
        Scenarios:
        1. Market Crash (-20%)
        2. Market Rally (+20%)
        3. Rates Rise 1% (Approx TLT -17%)
        4. Rates Fall 1% (Approx TLT +17%)
        """
        tickers = list(weights.keys())
        results = []
        
        try:
            # Fetch recent data (1 year) to calculate current sensitivities
            end_date = datetime.now().strftime("%Y-%m-%d")
            start_date = (datetime.now() - pd.Timedelta(days=365)).strftime("%Y-%m-%d")
            
            # We need Benchmark (SPY) and Rates Proxy (TLT)
            factors = [benchmark_ticker, "TLT"]
            all_tickers = list(set(tickers + factors))
            
            data = yf.download(all_tickers, start=start_date, end=end_date, progress=False)
            
            # Handle different yfinance return structures
            if isinstance(data, pd.DataFrame):
                if 'Adj Close' in data.columns:
                    data = data['Adj Close']
                elif 'Close' in data.columns:
                    data = data['Close']
                elif isinstance(data.columns, pd.MultiIndex):
                    if 'Adj Close' in data.columns.get_level_values(0):
                         data = data.xs('Adj Close', axis=1, level=0)
                    elif 'Close' in data.columns.get_level_values(0):
                         data = data.xs('Close', axis=1, level=0)
            
            if isinstance(data, pd.Series):
                data = data.to_frame()
            
            # Fill missing
            data = data.ffill().bfill().dropna()
            
            if data.empty:
                return []

            # Calculate Returns
            returns = data.pct_change()
            
            # 1. Market Beta
            # Subset to tickers + benchmark
            market_cols = [c for c in returns.columns if c in tickers or c == benchmark_ticker]
            market_returns = returns[market_cols].dropna()
            
            if not market_returns.empty and benchmark_ticker in market_returns.columns:
                # Align vector
                valid_tickers = [c for c in market_returns.columns if c in tickers]
                if valid_tickers:
                    # Re-weight for available assets
                    sub_weights = {t: weights.get(t, 0) for t in valid_tickers}
                    total_w = sum(sub_weights.values())
                    if total_w > 0:
                        w_vector = np.array([sub_weights[t]/total_w for t in valid_tickers])
                        port_ret = market_returns[valid_tickers].dot(w_vector)
                        bench_ret = market_returns[benchmark_ticker]
                        
                        cov_matrix = np.cov(port_ret, bench_ret)
                        market_beta = cov_matrix[0][1] / cov_matrix[1][1] if cov_matrix[1][1] != 0 else 0
                    else:
                        market_beta = 0
                else:
                    market_beta = 0
            else:
                market_beta = 0 # Default if no data
            
            # 2. Rate Beta (vs TLT)
            if "TLT" in returns.columns:
                rate_cols = [c for c in returns.columns if c in tickers or c == "TLT"]
                rate_returns = returns[rate_cols].dropna()
                
                if not rate_returns.empty and "TLT" in rate_returns.columns:
                     valid_tickers = [c for c in rate_returns.columns if c in tickers]
                     if valid_tickers:
                        sub_weights = {t: weights.get(t, 0) for t in valid_tickers}
                        total_w = sum(sub_weights.values())
                        if total_w > 0:
                            w_vector = np.array([sub_weights[t]/total_w for t in valid_tickers])
                            port_ret = rate_returns[valid_tickers].dot(w_vector)
                            tlt_ret = rate_returns["TLT"]
                            
                            cov_matrix = np.cov(port_ret, tlt_ret)
                            rate_beta = cov_matrix[0][1] / cov_matrix[1][1] if cov_matrix[1][1] != 0 else 0
                        else:
                            rate_beta = 0
                     else:
                        rate_beta = 0
                else:
                    rate_beta = 0
            else:
                rate_beta = 0

            # Define Shocks
            scenarios = [
                {
                    "name": "Market Crash (-20%)",
                    "description": f"Hypothetical {benchmark_ticker} drop of 20%",
                    "shock_factor": -0.20,
                    "beta_used": market_beta,
                    "beta_name": f"Beta to {benchmark_ticker}"
                },
                {
                    "name": "Market Rally (+20%)",
                    "description": f"Hypothetical {benchmark_ticker} rise of 20%",
                    "shock_factor": 0.20,
                    "beta_used": market_beta,
                    "beta_name": f"Beta to {benchmark_ticker}"
                },
                {
                    "name": "Interest Rates Rise 1%",
                    "description": "Approx. 17% drop in Long-Term Treasuries (TLT)",
                    "shock_factor": -0.17, # TLT drops ~17% for 1% rate rise (Duration ~17)
                    "beta_used": rate_beta,
                    "beta_name": "Beta to TLT"
                },
                {
                    "name": "Interest Rates Fall 1%",
                    "description": "Approx. 17% rise in Long-Term Treasuries (TLT)",
                    "shock_factor": 0.17,
                    "beta_used": rate_beta,
                    "beta_name": "Beta to TLT"
                }
            ]
            
            for s in scenarios:
                # Projected Return = Beta * Shock
                projected_return = s["beta_used"] * s["shock_factor"]
                
                results.append({
                    "id": f"hypo_{s['name'].replace(' ', '_').lower()}",
                    "name": s["name"],
                    "description": s["description"],
                    "type": "hypothetical",
                    "available": True,
                    "metrics": {
                        "portfolio_return": float(projected_return),
                        "benchmark_return": float(s["shock_factor"] if "Market" in s["name"] else 0), # Only show benchmark return for market shocks
                        "difference": float(projected_return - (s["shock_factor"] if "Market" in s["name"] else 0)),
                        "beta_used": float(s["beta_used"])
                    }
                })
                
        except Exception as e:
            print(f"Hypothetical stress test error: {e}")
            
        return results
