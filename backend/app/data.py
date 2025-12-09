import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def fetch_historical_data(tickers: list[str], start_date: str, end_date: str, interval: str = "1d") -> pd.DataFrame:
    try:
        raw_data = yf.download(tickers, start=start_date, end=end_date, interval=interval, progress=False)
        
        if raw_data.empty:
            raise ValueError("No data found for the provided tickers and date range.")

        if 'Adj Close' in raw_data.columns:
            data = raw_data['Adj Close']
        elif 'Close' in raw_data.columns:
            data = raw_data['Close']
        else:
            raise ValueError("Could not find 'Adj Close' or 'Close' price data.")
        
        if isinstance(data, pd.Series):
            data = data.to_frame()
            if len(tickers) == 1:
                data.columns = tickers
            
        data.index = pd.to_datetime(data.index)
        if data.index.tz is not None:
            data.index = data.index.tz_localize(None)
            
        initial_missing = data.isna().sum().sum()
        
        data = data.ffill()
        data = data.dropna()
        
        if initial_missing > 0:
            missing_pct = initial_missing / (len(data) * len(data.columns)) * 100
            print(f"INFO: Filled {initial_missing} missing values ({missing_pct:.2f}%) using forward/backward fill")
        
        if data.empty:
            raise ValueError("No data available after cleaning.")
        
        validation = validate_price_data(data)
        if not validation["valid"]:
            raise ValueError(f"Data validation failed: {validation['warnings']}")
        
        if validation["warnings"]:
            print("\n=== DATA QUALITY WARNINGS ===")
            for warning in validation["warnings"]:
                print(f"  ⚠️  {warning}")
            print("=== END WARNINGS ===\n")
            
        return data
    except Exception as e:
        print(f"Error: yfinance fetch failed for {tickers}: {e}")
        raise ValueError(f"Failed to fetch market data: {str(e)}")

def fetch_benchmark_data(start_date: str, end_date: str, benchmark_ticker: str = "SPY") -> pd.Series:
    try:
        raw_data = yf.download(benchmark_ticker, start=start_date, end=end_date, progress=False)
        
        if 'Adj Close' in raw_data.columns:
            data = raw_data['Adj Close']
        elif 'Close' in raw_data.columns:
            data = raw_data['Close']
        else:
            return pd.Series()
        
        if isinstance(data, pd.DataFrame):
            data = data.iloc[:, 0]
            
        data.index = pd.to_datetime(data.index)
        if data.index.tz is not None:
            data.index = data.index.tz_localize(None)
        
        data = data.ffill().dropna()
        
        return data
    except Exception as e:
        print(f"Warning: Failed to fetch benchmark data: {e}")
        return pd.Series()

def validate_price_data(prices: pd.DataFrame, min_days: int = 60) -> dict:
    warnings = []
    
    num_days = len(prices)
    if num_days < min_days:
        return {
            "valid": False,
            "warnings": [f"Insufficient data: {num_days} days (minimum: {min_days} required for stable covariance matrix)"],
            "stats": {"days": num_days}
        }
    
    returns = prices.pct_change().dropna()
    
    for col in returns.columns:
        extreme_moves = returns[col][abs(returns[col]) > 0.5]
        if len(extreme_moves) > 0:
            warnings.append(f"{col}: {len(extreme_moves)} extreme moves (>50%) detected on {extreme_moves.index.tolist()}")
    
    missing_pct = prices.isna().sum() / len(prices)
    for col in prices.columns:
        if missing_pct[col] > 0.1:  
            warnings.append(f"{col}: {missing_pct[col]:.1%} missing data")
    
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
    try:
        tnx = yf.Ticker("^IRX")
        hist = tnx.history(period="5d")
        if not hist.empty:
            return hist['Close'].iloc[-1] / 100
        return 0.045  
    except:
        return 0.045  

def get_chart_data(ticker: str, period: str = "1mo", interval: str = "1d") -> list[dict]:
    try:
        stock = yf.Ticker(ticker)
        include_prepost = period == "1d"
        hist = stock.history(period=period, interval=interval, prepost=include_prepost)
        
        if hist.empty:
            return []
            
        hist = hist.reset_index()
        
        
        results = []
        for _, row in hist.iterrows():
            date_col = 'Date' if 'Date' in hist.columns else 'Datetime'
            date_val = row[date_col]
            
            is_regular = True
            if interval in ['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h']:
                if isinstance(date_val, pd.Timestamp):
                    if date_val.tzinfo is not None:
                        date_et = date_val.tz_convert('America/New_York')
                    else:
                        date_et = date_val
                        
                    current_time = date_et.time()
                    market_open = datetime.strptime("09:30", "%H:%M").time()
                    market_close = datetime.strptime("16:00", "%H:%M").time()
                    
                    if current_time < market_open or current_time >= market_close:
                        is_regular = False

                date_str = date_val.strftime('%Y-%m-%d %H:%M')
            else:
                date_str = date_val.strftime('%Y-%m-%d')
                
            results.append({
                "date": date_str,
                "price": row['Close'],
                "open": row['Open'],
                "high": row['High'],
                "low": row['Low'],
                "close": row['Close'],
                "volume": row.get('Volume', 0),
                "isRegularMarket": is_regular
            })
            
        return results
    except Exception as e:
        print(f"Error fetching chart data for {ticker}: {e}")
        return []

def get_stock_info(ticker: str) -> dict:
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        
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
            "ipoDate": None,  
            "open": stock.fast_info.open,
            "dayHigh": stock.fast_info.day_high,
            "dayLow": stock.fast_info.day_low,
            "previousClose": stock.fast_info.previous_close
        }
        
        try:
            first_trade_epoch = info.get("firstTradeDateEpochUtc")
            if first_trade_epoch:
                from datetime import datetime
                result["ipoDate"] = datetime.utcfromtimestamp(first_trade_epoch).strftime("%Y-%m-%d")
        except Exception:
            pass  

        try:
            earnings_dates = stock.earnings_dates
            financials = stock.quarterly_financials
            
            history = []
            
            if earnings_dates is not None and not earnings_dates.empty:
                earnings_dates = earnings_dates.sort_index(ascending=False)
                
                recent_earnings = earnings_dates.head(8)
                
                for date, row in recent_earnings.iterrows():
                    if pd.isna(row.get("Reported EPS")):
                        continue
                        
                    month = date.month
                    year = date.year
                    quarter_label = "Q?"
                    
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
                    
                    if financials is not None and not financials.empty:
                        cols = pd.to_datetime(financials.columns)
                        potential_dates = [d for d in cols if d < date.replace(tzinfo=None)]
                        
                        if potential_dates:
                            closest_date = max(potential_dates)
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
            
            
            result["earningsHistory"] = history[::-1]
            
            next_earnings_date = None
            if earnings_dates is not None and not earnings_dates.empty:
                from datetime import datetime
                now = datetime.now()
                for date, row in earnings_dates.sort_index(ascending=True).iterrows():
                    if pd.isna(row.get("Reported EPS")) and date.replace(tzinfo=None) > now:
                        next_earnings_date = date.strftime("%Y-%m-%d")
                        break
            result["nextEarningsDate"] = next_earnings_date
            
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
                        "date": latest["date"] 
                    }
                }

        except Exception as e:
            print(f"Error fetching earnings for {ticker}: {e}")
            result["debug_earnings_error"] = str(e)

        except Exception as e:
            print(f"Error fetching earnings for {ticker}: {e}")

        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=5*365 + 20) 
            
            tickers_list = [ticker, "^GSPC"]
            data = yf.download(tickers_list, start=start_date, end=end_date, progress=False)['Adj Close']
            
            
            if not data.empty and isinstance(data, pd.DataFrame):
                if ticker not in data.columns:
                    pass 
                
                def get_return(period_days=None, is_ytd=False):
                    try:
                        if is_ytd:
                            start = datetime(end_date.year, 1, 1)
                        else:
                            start = end_date - timedelta(days=period_days)
                        
                        
                        latest_prices = data.iloc[-1]
                        
                        idx = data.index.get_indexer([start], method='nearest')[0]
                        start_prices = data.iloc[idx]
                        found_date = data.index[idx]
                        
                        if abs((found_date - start).days) > 10:
                            return None
                        
                        t_ret = ((latest_prices[ticker] - start_prices[ticker]) / start_prices[ticker]) * 100
                        s_ret = ((latest_prices["^GSPC"] - start_prices["^GSPC"]) / start_prices["^GSPC"]) * 100
                        
                        return {
                            "ticker": t_ret if not pd.isna(t_ret) else None,
                            "spy": s_ret if not pd.isna(s_ret) else None
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
            result["debug_returns_error"] = str(e)

        return result
    except Exception as e:
        print(f"Error fetching stock info for {ticker}: {e}")
        return {}

def get_analyst_ratings(ticker: str) -> dict:
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        
        targets = {
            "current": info.get("currentPrice"),
            "low": info.get("targetLowPrice"),
            "high": info.get("targetHighPrice"),
            "mean": info.get("targetMeanPrice"),
            "median": info.get("targetMedianPrice"),
            "numberOfAnalysts": info.get("numberOfAnalystOpinions")
        }
        
        
        recommendation = {
            "consensus": info.get("recommendationKey"), 
            "mean": info.get("recommendationMean"), 
        }
        
        return {
            "priceTargets": targets,
            "recommendation": recommendation
        }
    except Exception as e:
        print(f"Error fetching analyst ratings for {ticker}: {e}")
        return {}

def get_latest_price(ticker: str) -> dict:
    try:
        stock = yf.Ticker(ticker)
        
        hist = stock.history(period="1d", interval="1m", prepost=True)
        
        if hist.empty:
            fi = stock.fast_info
            current_price = fi.last_price
            prev_close = fi.previous_close
        else:
            current_price = hist['Close'].iloc[-1]
            
            prev_close = stock.fast_info.previous_close

        if prev_close and not pd.isna(prev_close):
            change = current_price - prev_close
            percent_change = (change / prev_close) * 100
        else:
            change = 0
            percent_change = 0
        
        return {
            "price": current_price,
            "change": change,
            "percent_change": percent_change
        }

    except Exception as e:
        print(f"Error fetching latest price for {ticker}: {e}")
        return {"price": 0, "change": 0, "percent_change": 0}


def calculate_whatif(ticker: str, start_date: str, amount: float) -> dict:
    from datetime import datetime, timedelta
    
    if amount <= 0:
        return {"valid": False, "error": "Amount must be greater than 0"}
    
    try:
        target_date = datetime.strptime(start_date, "%Y-%m-%d")
    except ValueError:
        return {"valid": False, "error": "Invalid date format. Use YYYY-MM-DD"}
    
    today = datetime.now()
    if target_date >= today:
        return {"valid": False, "error": "Date must be in the past"}
    
    try:
        stock = yf.Ticker(ticker)
        
        end_search = target_date + timedelta(days=10)
        hist = stock.history(start=target_date.strftime("%Y-%m-%d"), 
                            end=end_search.strftime("%Y-%m-%d"))
        
        if hist.empty:
            max_hist = stock.history(period="max")
            if max_hist.empty:
                return {"valid": False, "error": f"No data available for {ticker}"}
            
            first_date = max_hist.index[0].strftime("%Y-%m-%d")
            return {"valid": False, "error": f"Date is before available data. Earliest: {first_date}"}
        
        actual_buy_date = hist.index[0]
        buy_price = hist.iloc[0]['Close']
        
        shares = amount / buy_price
        
        current_hist = stock.history(period="1d")
        if current_hist.empty:
            fi = stock.fast_info
            current_price = fi.last_price
        else:
            current_price = current_hist.iloc[-1]['Close']
        
        current_value = shares * current_price
        gain = current_value - amount
        gain_percent = (gain / amount) * 100
        
        holding_days = (today - actual_buy_date.replace(tzinfo=None)).days
        holding_years = holding_days / 365.25
        
        if holding_years > 0:
            annualized_return = ((current_value / amount) ** (1 / holding_years) - 1) * 100
        else:
            annualized_return = gain_percent
        
        years = holding_days // 365
        months = (holding_days % 365) // 30
        if years > 0 and months > 0:
            holding_str = f"{years}y {months}m"
        elif years > 0:
            holding_str = f"{years}y"
        else:
            holding_str = f"{months}m" if months > 0 else f"{holding_days}d"
        
        return {
            "valid": True,
            "error": None,
            "buyDate": actual_buy_date.strftime("%Y-%m-%d"),
            "buyPrice": round(buy_price, 2),
            "shares": round(shares, 4),
            "currentPrice": round(current_price, 2),
            "currentValue": round(current_value, 2),
            "gain": round(gain, 2),
            "gainPercent": round(gain_percent, 2),
            "annualizedReturn": round(annualized_return, 2),
            "holdingDays": holding_days,
            "holdingPeriod": holding_str,
            "splitAdjusted": True
        }
        
    except Exception as e:
        print(f"Error calculating whatif for {ticker}: {e}")
        return {"valid": False, "error": str(e)}
