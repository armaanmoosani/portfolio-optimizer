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
            
        # Handle missing data
        # 1. Forward fill (propagate last valid observation forward)
        data = data.ffill()
        # 2. Backward fill (use next valid observation to fill gaps at start)
        data = data.bfill()
        # 3. Drop any remaining rows with NaNs (e.g., if a stock didn't exist yet)
        data = data.dropna()
        
        if data.empty:
            raise ValueError("No data available after cleaning.")
            
        return data
    except Exception as e:
        raise ValueError(f"Error fetching data: {str(e)}")

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
        data = data.ffill().bfill().dropna()
        
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
