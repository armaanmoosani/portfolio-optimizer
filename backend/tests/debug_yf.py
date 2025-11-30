import yfinance as yf
import pandas as pd

def test_download():
    tickers = ["NVDA", "AMD", "SPY"]
    start_date = "2007-10-01"
    end_date = "2009-03-01"
    
    print(f"Downloading {tickers} from {start_date} to {end_date}...")
    
    try:
        data = yf.download(tickers, start=start_date, end=end_date, progress=False)
        print("\nDownload complete.")
        print(f"Shape: {data.shape}")
        print(f"Columns: {data.columns}")
        
        if 'Adj Close' in data:
            print("\n'Adj Close' found.")
            adj_close = data['Adj Close']
            print(adj_close.head())
        else:
            print("\n❌ 'Adj Close' NOT found in columns!")
            
    except Exception as e:
        print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    test_download()
