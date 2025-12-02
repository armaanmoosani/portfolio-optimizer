import yfinance as yf

def check_new_stats(ticker):
    stock = yf.Ticker(ticker)
    info = stock.info
    
    fields = [
        'trailingEps', 'forwardEps', 
        'volume', 'regularMarketVolume', 'averageVolume', 'averageVolume10days',
        'beta'
    ]
    
    print(f"--- New Stats for {ticker} ---")
    for f in fields:
        print(f"{f}: {info.get(f)}")

check_new_stats("KO")
