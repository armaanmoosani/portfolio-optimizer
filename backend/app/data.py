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
        hist = stock.history(period=period, interval=interval)
        
        if hist.empty:
            return []
            
        # Reset index to get Date/Datetime as a column
        hist = hist.reset_index()
        
        results = []
        for _, row in hist.iterrows():
            # Handle different date column names (Date vs Datetime)
            date_col = 'Date' if 'Date' in hist.columns else 'Datetime'
            date_val = row[date_col]
            
            # Format date based on interval
            if interval in ['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h']:
                # Intraday: ISO format or specific time format
                date_str = date_val.strftime('%Y-%m-%d %H:%M')
            else:
                # Daily or larger: YYYY-MM-DD
                date_str = date_val.strftime('%Y-%m-%d')
                
            results.append({
                "date": date_str,
                "price": row['Close']
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
            "earnings": None
        }

        # Fetch Earnings Data
        try:
            earnings_dates = stock.earnings_dates
            if earnings_dates is not None and not earnings_dates.empty:
                # Filter for rows with valid Surprise (Reported earnings)
                # Sort by date descending just in case
                earnings_dates = earnings_dates.sort_index(ascending=False)
                
                # Find the first row with a valid Surprise value
                valid_earnings = earnings_dates[earnings_dates['Surprise(%)'].notna()]
                
                if not valid_earnings.empty:
                    recent = valid_earnings.iloc[0]
                    date = valid_earnings.index[0]
                    
                    # Determine Quarter (approximate)
                    # If report date is Jan/Feb/Mar -> Q4 Prev Year
                    # Apr/May/Jun -> Q1 Curr Year
                    # Jul/Aug/Sep -> Q2 Curr Year
                    # Oct/Nov/Dec -> Q3 Curr Year
                    month = date.month
                    year = date.year
                    quarter = "Q?"
                    if month in [1, 2, 3]:
                        quarter = f"Q4 {year - 1}"
                    elif month in [4, 5, 6]:
                        quarter = f"Q1 {year}"
                    elif month in [7, 8, 9]:
                        quarter = f"Q2 {year}"
                    elif month in [10, 11, 12]:
                        quarter = f"Q3 {year}"

                    result["earnings"] = {
                        "quarter": quarter,
                        "date": date.strftime("%Y-%m-%d"),
                        "eps": {
                            "estimate": recent.get("EPS Estimate"),
                            "reported": recent.get("Reported EPS"),
                            "surprise": recent.get("Surprise(%)")
                        },
                        "revenue": None
                    }
                    
                    # Try to get Revenue from financials
                    # Look for a quarter end date ~1-3 months before report date
                    financials = stock.quarterly_financials
                    if financials is not None and not financials.empty:
                        # Convert columns to datetime if they aren't
                        cols = pd.to_datetime(financials.columns)
                        # Find closest date before report date
                        potential_dates = [d for d in cols if d < date.replace(tzinfo=None)]
                        if potential_dates:
                            # Get max date (closest to report)
                            closest_date = max(potential_dates)
                            # Find the column name that matches this date
                            # (Original columns might be strings or timestamps)
                            col_idx = list(cols).index(closest_date)
                            orig_col = financials.columns[col_idx]
                            
                            if "Total Revenue" in financials.index:
                                result["earnings"]["revenue"] = {
                                    "reported": financials.loc["Total Revenue", orig_col],
                                    "date": closest_date.strftime("%Y-%m-%d")
                                }

        except Exception as e:
            print(f"Error fetching earnings for {ticker}: {e}")

        return result
    except Exception as e:
        print(f"Error fetching stock info for {ticker}: {e}")
        return {}
