import yfinance as yf
import pandas as pd

def check_earnings(ticker):
    stock = yf.Ticker(ticker)
    print(f"--- Calendar for {ticker} ---")
    try:
        print(stock.calendar)
    except Exception as e:
        print(e)
        
    print(f"\n--- Earnings Dates for {ticker} ---")
    try:
        # earnings_dates usually has Surprise
        print("Columns:", stock.earnings_dates.columns)
        print(stock.earnings_dates.head())
    except Exception as e:
        print(e)

    print(f"\n--- Info for {ticker} ---")
    keys = [k for k in stock.info.keys() if 'earn' in k.lower() or 'rev' in k.lower()]
    for k in keys:
        print(f"{k}: {stock.info[k]}")

    print(f"\n--- Analysis for {ticker} ---")
    try:
        # analysis might have revenue estimates
        # It's often a dataframe
        if hasattr(stock, 'analysis'):
             print(stock.analysis)
        else:
             print("No analysis property")
    except Exception as e:
        print(e)

    print(f"\n--- Financials for {ticker} ---")
    try:
        print(stock.quarterly_financials.columns)
    except Exception as e:
        print(e)

check_earnings("AAPL")
