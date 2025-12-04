import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def fetch_historical_data(tickers: list[str], start_date: str, end_date: str, interval: str = "1d") -> pd.DataFrame:
    """
    Fetch historical adjusted close prices for the given tickers.
    """
    try:
        # Download data
        # group_by='ticker' ensures we get a MultiIndex if multiple tickers, or we handle it
        raw_data = yf.download(tickers, start=start_date, end=end_date, interval=interval, progress=False)
        
        if raw_data.empty:
            raise ValueError("No data found for the provided tickers and date range.")

        # Handle 'Adj Close' vs 'Close'
        if 'Adj Close' in raw_data.columns:
            data = raw_data['Adj Close']
        elif 'Close' in raw_data.columns:
            data = raw_data['Close']
        else:
            raise ValueError("Could not find 'Adj Close' or 'Close' price data.")
        
        # Handle single ticker case (returns Series instead of DataFrame)
        if isinstance(data, pd.Series):
            data = data.to_frame()
            if len(tickers) == 1:
                data.columns = tickers
            
        # Ensure index is datetime and remove timezone if present
        data.index = pd.to_datetime(data.index)
        if data.index.tz is not None:
            data.index = data.index.tz_localize(None)
            
        # Handle missing data with professional-grade forward/backward fill
        # This approach is standard in institutional risk systems (Bloomberg, FactSet)
        initial_missing = data.isna().sum().sum()
        
        # 1. Forward fill (propagate last valid observation forward)
        data = data.ffill()
        # 2. Drop any remaining rows with NaNs (e.g., if a stock didn't exist yet)
        # We DO NOT bfill() because that would fabricate history before an asset existed.
        data = data.dropna()
        
        # Log data quality warnings for audit trails
        if initial_missing > 0:
            missing_pct = initial_missing / (len(data) * len(data.columns)) * 100
            print(f"INFO: Filled {initial_missing} missing values ({missing_pct:.2f}%) using forward/backward fill")
        
        if data.empty:
            raise ValueError("No data available after cleaning.")
        
        # Validate data quality
        validation = validate_price_data(data)
        if not validation["valid"]:
            raise ValueError(f"Data validation failed: {validation['warnings']}")
        
        # Log warnings for quality issues (non-fatal)
        if validation["warnings"]:
            print("\n=== DATA QUALITY WARNINGS ===")
            for warning in validation["warnings"]:
                print(f"  ⚠️  {warning}")
            print("=== END WARNINGS ===\n")
            
        return data
    except Exception as e:
        # STRICT MODE: No synthetic data allowed.
        # If fetching fails, we must fail loudly to maintain professional integrity.
        print(f"Error: yfinance fetch failed for {tickers}: {e}")
        raise ValueError(f"Failed to fetch market data: {str(e)}")

def fetch_benchmark_data(start_date: str, end_date: str, benchmark_ticker: str = "SPY") -> pd.Series:
    """
    Fetch historical data for the benchmark (default SPY).
    """
    try:
        raw_data = yf.download(benchmark_ticker, start=start_date, end=end_date, progress=False)
        
        if 'Adj Close' in raw_data.columns:
            data = raw_data['Adj Close']
        elif 'Close' in raw_data.columns:
            data = raw_data['Close']
        else:
            return pd.Series()
        
        # Ensure we have a Series
        if isinstance(data, pd.DataFrame):
            data = data.iloc[:, 0]
            
        # Ensure index is datetime and remove timezone
        data.index = pd.to_datetime(data.index)
        if data.index.tz is not None:
            data.index = data.index.tz_localize(None)
        
        # Fill missing values
        data = data.ffill().dropna()
        
        return data
    except Exception as e:
        print(f"Warning: Failed to fetch benchmark data: {e}")
        return pd.Series()

def validate_price_data(prices: pd.DataFrame, min_days: int = 60) -> dict:
    """
    Validate price data quality for portfolio optimization.
    
    Returns:
        dict with 'valid' (bool), 'warnings' (list), 'stats' (dict)
    """
    warnings = []
    
    # Check minimum data requirement
    num_days = len(prices)
    if num_days < min_days:
        return {
            "valid": False,
            "warnings": [f"Insufficient data: {num_days} days (minimum: {min_days} required for stable covariance matrix)"],
            "stats": {"days": num_days}
        }
    
    # Calculate returns for outlier detection
    returns = prices.pct_change().dropna()
    
    # Detect extreme single-day moves (>50% - likely data errors or stock splits missed)
    for col in returns.columns:
        extreme_moves = returns[col][abs(returns[col]) > 0.5]
        if len(extreme_moves) > 0:
            warnings.append(f"{col}: {len(extreme_moves)} extreme moves (>50%) detected on {extreme_moves.index.tolist()}")
    
    # Check for excessive missing data
    missing_pct = prices.isna().sum() / len(prices)
    for col in prices.columns:
        if missing_pct[col] > 0.1:  # More than 10% missing
            warnings.append(f"{col}: {missing_pct[col]:.1%} missing data")
    
    # Calculate actual trading days per year for this dataset
    date_range = (prices.index[-1] - prices.index[0]).days
    years = date_range / 365.25
    actual_trading_days_per_year = num_days / years if years > 0 else 252
    
    return {
        "valid": True,
        "warnings": warnings,
        "stats": {
            "days": num_days,
            "years": round(years, 2),
            "actual_trading_days_per_year": round(actual_trading_days_per_year, 1)
        }
    }

def get_risk_free_rate() -> float:
    """
    Fetch the current 3-month Treasury Bill rate as a proxy for risk-free rate.
    Returns the annualized rate as a decimal (e.g., 0.045 for 4.5%).
    """
    try:
        # IRX is the ticker for 13-week Treasury Bill
        tnx = yf.Ticker("^IRX")
        hist = tnx.history(period="5d")
        if not hist.empty:
            # Rate is in percent, convert to decimal
            return hist['Close'].iloc[-1] / 100
        return 0.045  # Fallback to 4.5% if fetch fails
    except:
        return 0.045  # Fallback

def get_chart_data(ticker: str, period: str = "1mo", interval: str = "1d") -> list[dict]:
    """
    Fetch historical data for a single ticker formatted for frontend charts.
    Returns list of dicts: {'date': str, 'price': float}
    """
    try:
        stock = yf.Ticker(ticker)
        # Fetch pre/post market data for 1d view
        include_prepost = period == "1d"
        hist = stock.history(period=period, interval=interval, prepost=include_prepost)
        
        if hist.empty:
            return []
            
        # Reset index to get Date/Datetime as a column
        hist = hist.reset_index()
        
        # Ensure we have a timezone-aware datetime for comparison
        # yfinance usually returns Eastern time for US stocks, but let's be safe
        # We'll assume the index (Datetime) is already localized if it's intraday
        
        results = []
        for _, row in hist.iterrows():
            # Handle different date column names (Date vs Datetime)
            date_col = 'Date' if 'Date' in hist.columns else 'Datetime'
            date_val = row[date_col]
            
            # Determine if Regular Market (09:30 - 16:00 ET)
            is_regular = True
            if interval in ['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h']:
                # Intraday: Check time
                # Convert to datetime if it's not already
                if isinstance(date_val, pd.Timestamp):
                    # Check if it has timezone, if so convert to ET
                    if date_val.tzinfo is not None:
                        date_et = date_val.tz_convert('America/New_York')
                    else:
                        # Assume it's already local/ET if no tz (yfinance default)
                        date_et = date_val
                        
                    current_time = date_et.time()
                    market_open = datetime.strptime("09:30", "%H:%M").time()
                    market_close = datetime.strptime("16:00", "%H:%M").time()
                    
                    if current_time < market_open or current_time >= market_close:
                        is_regular = False

                # Format date
                date_str = date_val.strftime('%Y-%m-%d %H:%M')
            else:
                # Daily or larger: YYYY-MM-DD
                date_str = date_val.strftime('%Y-%m-%d')
                
            results.append({
                "date": date_str,
                "price": row['Close'],
                "isRegularMarket": is_regular
            })
            
        return results
    except Exception as e:
        print(f"Error fetching chart data for {ticker}: {e}")
        return []

def get_stock_info(ticker: str) -> dict:
    """
    Fetch detailed stock information including Market Cap, P/E, 52-wk High/Low, Dividends,
    Performance Metrics (YTD, 1Y, 3Y, 5Y), and Earnings History.
    """
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        
        # Extract relevant fields with safe defaults
        result = {
            "marketCap": info.get("marketCap"),
            "trailingPE": info.get("trailingPE"),
            "forwardPE": info.get("forwardPE"),
            "fiftyTwoWeekHigh": info.get("fiftyTwoWeekHigh"),
            "fiftyTwoWeekLow": info.get("fiftyTwoWeekLow"),
            "dividendRate": info.get("dividendRate"),
            "dividendYield": info.get("dividendYield"),
            "currency": info.get("currency", "USD"),
            "shortName": info.get("shortName"),
            "longName": info.get("longName"),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "exDividendDate": info.get("exDividendDate"),
            "lastDividendValue": info.get("lastDividendValue"),
            "trailingEps": info.get("trailingEps"),
            "volume": info.get("regularMarketVolume") or info.get("volume"),
            "averageVolume": info.get("averageVolume"),
            "beta": info.get("beta"),
            "earnings": None,
            "performance": {},
            "earningsHistory": []
        }

        # --- 1. Calculate Performance Metrics ---
        try:
            # Fetch 5 years of data for Ticker and Benchmark (SPY)
            end_date = datetime.now()
            start_date = end_date - timedelta(days=5*365 + 20) # Buffer
            
            # Helper to calculate return
            def calc_return(series, days_lookback=None, is_ytd=False):
                if series.empty: return None
                
                current_price = series.iloc[-1]
                start_price = None
                
                if is_ytd:
                    # Find last price of previous year
                    current_year = series.index[-1].year
                    prev_year_data = series[series.index.year < current_year]
                    if not prev_year_data.empty:
                        start_price = prev_year_data.iloc[-1]
                elif days_lookback:
                    target_date = series.index[-1] - timedelta(days=days_lookback)
                    # Find closest date on or before target
                    # Use searchsorted to find index
                    idx = series.index.searchsorted(target_date)
                    if idx < len(series) and idx > 0:
                         # Check if exact match or take previous
                         if series.index[idx] > target_date:
                             idx -= 1
                         start_price = series.iloc[idx]
                    elif idx == 0:
                         start_price = series.iloc[0]
                
                if start_price and start_price > 0:
                    return ((current_price - start_price) / start_price) * 100
                return None

            # Fetch Data
            hist = stock.history(period="5y")
            if not hist.empty:
                ticker_prices = hist['Close']
                
                # Fetch Benchmark (SPY)
                spy = yf.Ticker("SPY")
                spy_hist = spy.history(period="5y")
                spy_prices = spy_hist['Close'] if not spy_hist.empty else pd.Series()

                metrics = {
                    "ytd": {"days": None, "ytd": True},
                    "1y": {"days": 365, "ytd": False},
                    "3y": {"days": 3*365, "ytd": False},
                    "5y": {"days": 5*365, "ytd": False}
                }

                for key, params in metrics.items():
                    ticker_ret = calc_return(ticker_prices, params["days"], params["ytd"])
                    spy_ret = calc_return(spy_prices, params["days"], params["ytd"])
                    
                    result["performance"][key] = {
                        "ticker": ticker_ret,
                        "benchmark": spy_ret
                    }
        except Exception as e:
            print(f"Error calculating performance for {ticker}: {e}")

        # --- 2. Fetch Earnings History ---
        try:
            earnings_dates = stock.earnings_dates
            if earnings_dates is not None and not earnings_dates.empty:
                # Filter for rows with valid data (Estimate or Reported)
                # Sort by date descending
                earnings_dates = earnings_dates.sort_index(ascending=False)
                
                # Get last 4 reported quarters (where Reported EPS is not NaN)
                reported_earnings = earnings_dates[earnings_dates['Reported EPS'].notna()].head(4)
                
                # Also get next estimate if available
                future_earnings = earnings_dates[earnings_dates['Reported EPS'].isna()].tail(1)
                
                # Combine for chart (reverse to show chronological left-to-right)
                # Actually, let's just process the reported ones for now + 1 future if needed
                # The design shows 4 quarters. Let's try to get last 4.
                
                history = []
                
                # Process reported
                for date, row in reported_earnings.iterrows():
                    # Determine Quarter
                    result["earningsHistory"].append({
                        "date": date.strftime('%Y-%m-%d'),
                        "quarter": f"Q{(date.month - 1) // 3 + 1} {date.year}",
                        "epsEstimate": row['EPS Estimate'] if pd.notna(row['EPS Estimate']) else None,
                        "epsReported": row['Reported EPS'] if pd.notna(row['Reported EPS']) else None,
                        "surprise": row['Surprise(%)'] * 100 if pd.notna(row['Surprise(%)']) else None
                    })
                
                # Reverse to show oldest to newest
                result["earningsHistory"].reverse()

                # Add Revenue Data if available (often in financials or quarterly_financials)
                # yfinance 'earnings_dates' doesn't always have revenue. 
                # Let's try to get it from quarterly_financials for the same periods if possible
                try:
                    financials = stock.quarterly_financials
                    if not financials.empty and 'Total Revenue' in financials.index:
                        revenues = financials.loc['Total Revenue']
                        # Map revenues to the earnings history items by approximate date match
                        for item in result["earningsHistory"]:
                            # Parse item date
                            item_date = datetime.strptime(item['date'], '%Y-%m-%d')
                            # Find closest revenue date
                            # This is a bit loose, but revenue dates usually align with quarter ends
                            # Earnings report date is usually 1-2 months AFTER quarter end.
                            # So we look for a revenue date that is within 3 months BEFORE the report date.
                            
                            for rev_date, rev_val in revenues.items():
                                # Convert timestamp to datetime if needed
                                if isinstance(rev_date, pd.Timestamp):
                                    rev_date = rev_date.to_pydatetime()
                                
                                diff = (item_date - rev_date).days
                                if 0 <= diff <= 100: # Report is usually 0-90 days after quarter end
                                    item['revenue'] = rev_val
                                    break
                except Exception as e:
                    print(f"Error fetching revenue for {ticker}: {e}")

        except Exception as e:
            print(f"Error fetching earnings history for {ticker}: {e}")

        # --- 3. Fetch Analyst Recommendations ---
        try:
            recs = stock.recommendations_summary
            if recs is not None and not recs.empty:
                # yfinance returns columns: ['period', 'strongBuy', 'buy', 'hold', 'sell', 'strongSell']
                # We usually want the latest period (0m)
                latest_rec = recs.iloc[0] # The summary is usually just one row or small table
                # Check if it's the right format
                if 'strongBuy' in latest_rec:
                     result["recommendations"] = {
                        "strongBuy": int(latest_rec['strongBuy']),
                        "buy": int(latest_rec['buy']),
                        "hold": int(latest_rec['hold']),
                        "sell": int(latest_rec['sell']),
                        "strongSell": int(latest_rec['strongSell'])
                     }
        except Exception as e:
            print(f"Error fetching recommendations for {ticker}: {e}")

        return result
    except Exception as e:
        print(f"Error fetching stock info for {ticker}: {e}")
        return {}
