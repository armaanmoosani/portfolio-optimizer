import yfinance as yf
# Force git update
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
    Fetch detailed stock information including Market Cap, P/E, 52-wk High/Low, Dividends.
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
            "earnings": None
        }

        # Fetch Earnings Data
        try:
            earnings_dates = stock.earnings_dates
            financials = stock.quarterly_financials
            
            history = []
            
            if earnings_dates is not None and not earnings_dates.empty:
                # Filter for rows with valid data
                # Sort by date descending
                earnings_dates = earnings_dates.sort_index(ascending=False)
                
                # Get last 4 quarters (approx)
                # We look at the last 8 entries and pick the ones that have data
                recent_earnings = earnings_dates.head(8)
                
                for date, row in recent_earnings.iterrows():
                    # Skip if no reported EPS (future date)
                    if pd.isna(row.get("Reported EPS")):
                        continue
                        
                    # Determine Quarter Label
                    month = date.month
                    year = date.year
                    quarter_label = "Q?"
                    # Fiscal year logic is complex, we'll use calendar quarters for simplicity
                    # or try to align with standard "Q3 FY24" format if possible.
                    # Usually:
                    # Jan/Feb/Mar report -> Q4 Prev Year
                    # Apr/May/Jun report -> Q1 Curr Year
                    # Jul/Aug/Sep report -> Q2 Curr Year
                    # Oct/Nov/Dec report -> Q3 Curr Year
                    
                    fy_year = year
                    if month in [1, 2, 3]:
                        q_num = 4
                        fy_year = year - 1
                    elif month in [4, 5, 6]:
                        q_num = 1
                    elif month in [7, 8, 9]:
                        q_num = 2
                    elif month in [10, 11, 12]:
                        q_num = 3
                        
                    quarter_label = f"Q{q_num} FY{str(fy_year)[2:]}"
                    
                    entry = {
                        "quarter": quarter_label,
                        "date": date.strftime("%Y-%m-%d"),
                        "epsEstimate": row.get("EPS Estimate"),
                        "epsReported": row.get("Reported EPS"),
                        "revenue": None,
                        "earnings": None
                    }
                    
                    # Try to match with financials (Revenue/Net Income)
                    if financials is not None and not financials.empty:
                        # Financials columns are dates (quarter end)
                        # Earnings report date is usually 1-3 months AFTER quarter end
                        # So we look for a financial date that is BEFORE the report date
                        cols = pd.to_datetime(financials.columns)
                        potential_dates = [d for d in cols if d < date.replace(tzinfo=None)]
                        
                        if potential_dates:
                            closest_date = max(potential_dates)
                            # Check if it's within reasonable range (e.g. < 4 months)
                            if (date.replace(tzinfo=None) - closest_date).days < 120:
                                col_idx = list(cols).index(closest_date)
                                orig_col = financials.columns[col_idx]
                                
                                if "Total Revenue" in financials.index:
                                    entry["revenue"] = financials.loc["Total Revenue", orig_col]
                                if "Net Income" in financials.index:
                                    entry["earnings"] = financials.loc["Net Income", orig_col]
                    
                    history.append(entry)
                    
                    if len(history) >= 4:
                        break
            
            # Reverse to chronological order for charts (Oldest -> Newest)
            result["earningsHistory"] = history[::-1]
            
            # Keep the "earnings" field for backward compatibility (most recent)
            if history:
                latest = history[-1]
                result["earnings"] = {
                    "quarter": latest["quarter"],
                    "date": latest["date"],
                    "eps": {
                        "estimate": latest["epsEstimate"],
                        "reported": latest["epsReported"],
                        "surprise": ((latest["epsReported"] - latest["epsEstimate"]) / abs(latest["epsEstimate"]) * 100) if latest["epsEstimate"] else 0
                    },
                    "revenue": {
                        "reported": latest["revenue"],
                        "date": latest["date"] # Approx
                    }
                }

        except Exception as e:
            print(f"Error fetching earnings for {ticker}: {e}")
            result["debug_earnings_error"] = str(e)

        # Fetch Returns Comparison (YTD, 1Y, 3Y, 5Y) vs S&P 500
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=5*365 + 20)
            
            # Fetch each ticker separately to avoid MultiIndex complexity
            ticker_data = yf.download(ticker, start=start_date, end=end_date, progress=False)
            spy_data = yf.download("^GSPC", start=start_date, end=end_date, progress=False)
            
            # Get Close prices (use Close, not Adj Close for compatibility)
            ticker_prices = ticker_data.get('Close', ticker_data.get('Adj Close'))
            spy_prices = spy_data.get('Close', spy_data.get('Adj Close'))
            
            if ticker_prices is not None and spy_prices is not None and len(ticker_prices) > 0 and len(spy_prices) > 0:
                def get_return(period_days=None, is_ytd=False):
                    try:
                        if is_ytd:
                            start = datetime(end_date.year, 1, 1)
                        else:
                            start = end_date - timedelta(days=period_days)
                        
                        # Get latest prices
                        t_latest = float(ticker_prices.iloc[-1])
                        s_latest = float(spy_prices.iloc[-1])
                        
                        # Find closest start date
                        t_idx = ticker_prices.index.get_indexer([start], method='nearest')[0]
                        s_idx = spy_prices.index.get_indexer([start], method='nearest')[0]
                        
                        t_start = float(ticker_prices.iloc[t_idx])
                        s_start = float(spy_prices.iloc[s_idx])
                        
                        t_ret = ((t_latest - t_start) / t_start) * 100
                        s_ret = ((s_latest - s_start) / s_start) * 100
                        
                        return {
                            "ticker": round(t_ret, 2),
                            "spy": round(s_ret, 2)
                        }
                    except Exception as ex:
                        return None

                result["returns"] = {
                    "ytd": get_return(is_ytd=True),
                    "1y": get_return(365),
                    "3y": get_return(365*3),
                    "5y": get_return(365*5)
                }
        except Exception as e:
            print(f"Error fetching returns comparison: {e}")

        return result
    except Exception as e:
        print(f"Error fetching stock info for {ticker}: {e}")
        return {}
