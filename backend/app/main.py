import sys
import os

# Add current directory to path to ensure imports work correctly in all environments (Vercel vs Local)
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
from datetime import datetime

# Use absolute imports now that path is fixed
from data import fetch_historical_data, fetch_benchmark_data, get_risk_free_rate
from optimizer import optimize_portfolio
from backtester import run_backtest
from stress_tester import StressTester

app = FastAPI(title="Portfolio Optimizer API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PortfolioRequest(BaseModel):
    tickers: list[str]
    start_date: str
    end_date: str
    objective: str
    initial_capital: float
    min_weight: float = 0.0
    max_weight: float = 1.0
    benchmark: str = "SPY"
    frequency: str = "daily"
    mar: float = 0.0  # Minimum Acceptable Return (annualized, as decimal)
    rebalance_freq: str = "never"  # Rebalancing frequency

@app.get("/")
def read_root():
    return {"status": "online", "message": "Portfolio Optimizer API is running"}

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

@app.post("/api/optimize")
async def optimize(request: PortfolioRequest):
    try:
        # Determine interval and annualization factor
        interval = "1d"
        annualization_factor = 252
        
        if request.frequency == "monthly":
            interval = "1mo"
            annualization_factor = 12

        # 1. Fetch Data
        print(f"Fetching data for {request.tickers} from {request.start_date} to {request.end_date} ({request.frequency})")
        prices = fetch_historical_data(request.tickers, request.start_date, request.end_date, interval=interval)
        
        if prices.empty:
            raise HTTPException(status_code=400, detail="No data found for the provided tickers and date range.")
        
        # Validate data quality
        from data import validate_price_data
        validation = validate_price_data(prices, min_days=60)
        
        if not validation["valid"]:
            raise HTTPException(status_code=400, detail=validation["warnings"][0])
        
        # Log warnings but continue
        if validation["warnings"]:
            print(f"Data quality warnings: {validation['warnings']}")
        
        # Use actual trading days from validation
        actual_ann_factor = validation["stats"].get("actual_trading_days_per_year", annualization_factor)
        print(f"Using actual annualization factor: {actual_ann_factor} (vs default {annualization_factor})")

        # 2. Get Risk Free Rate
        rf_rate = get_risk_free_rate()
        
        # 2b. Fetch benchmark data if Treynor optimization is selected
        benchmark_prices = None
        if request.objective == "treynor":
            print(f"Fetching benchmark data ({request.benchmark}) for Treynor optimization")
            benchmark_data = fetch_benchmark_data(request.start_date, request.end_date, request.benchmark)
            if benchmark_data.empty:
                raise HTTPException(status_code=400, detail=f"Could not fetch benchmark data for {request.benchmark}")
            benchmark_prices = benchmark_data['Close']
        
        # 3. Run Optimization
        print(f"Running optimization with objective: {request.objective}")
        optimization_result = optimize_portfolio(
            prices, 
            objective=request.objective, 
            risk_free_rate=rf_rate,
            min_weight=request.min_weight,
            max_weight=request.max_weight,
            annualization_factor=annualization_factor,
            mar=request.mar,
            benchmark_prices=benchmark_prices
        )
        
        if not optimization_result["success"]:
            raise HTTPException(status_code=500, detail=f"Optimization failed: {optimization_result['message']}")
        
        # 3b. Calculate Efficient Frontier
        print(f"Calculating efficient frontier for objective: {request.objective}")
        from optimizer import calculate_efficient_frontier
        
        # Only pass optimal weights if the objective was Max Sharpe, 
        # otherwise let the frontier calculate the global Max Sharpe point independently
        is_sharpe = request.objective == "sharpe"
        pass_weights = optimization_result["weights"] if is_sharpe else None
        
        efficient_frontier_data = calculate_efficient_frontier(
            prices,
            optimal_weights=pass_weights,
            risk_free_rate=rf_rate,
            min_weight=request.min_weight,
            max_weight=request.max_weight,
            annualization_factor=annualization_factor,
            num_portfolios=150
        )
        
        # FORCE CONSISTENCY: If the user selected Max Sharpe, ensure the chart shows 
        # EXACTLY the same metrics and weights as the Assets tab
        if is_sharpe:
            print("Forcing Max Sharpe consistency with main optimization results")
            efficient_frontier_data["optimal_portfolio"] = {
                "return": optimization_result["metrics"]["expected_return"],
                "volatility": optimization_result["metrics"]["volatility"],
                "sharpe_ratio": optimization_result["metrics"]["sharpe_ratio"],
                "weights": optimization_result["weights"]
            }
        else:
            print(f"Objective is {request.objective}, skipping Max Sharpe override")
            
        # 4. Run Backtest
        print("Running backtest...")
        benchmark_data = fetch_benchmark_data(request.start_date, request.end_date, request.benchmark)
        backtest_result = run_backtest(
            prices, 
            optimization_result["weights"], 
            benchmark_data=benchmark_data, 
            initial_capital=request.initial_capital,
            risk_free_rate=rf_rate,
            annualization_factor=annualization_factor,
            mar=request.mar,
            rebalance_freq=request.rebalance_freq
        )
        
        # Check for start date truncation
        warnings = []
        if not prices.empty:
             actual_start = prices.index[0].strftime("%Y-%m-%d")
             # Simple string comparison works for YYYY-MM-DD
             if actual_start > request.start_date:
                  warnings.append(f"Data limited: Optimization starts from {actual_start} (earliest common date).")
        


        return {
            "optimization": optimization_result,
            "backtest": backtest_result,
            "efficient_frontier": efficient_frontier_data,
            "parameters": {
                "risk_free_rate": rf_rate,
                "tickers": request.tickers,
                "period": f"{request.start_date} to {request.end_date}"
            },
            "warnings": warnings
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Internal Server Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history")
def get_history(ticker: str, period: str = "1mo", interval: str = "1d"):
    try:
        from data import get_chart_data
        data = get_chart_data(ticker, period, interval)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class StressTestRequest(BaseModel):
    weights: dict
    benchmark: str = "SPY"

@app.get("/api/validate_ticker")
def validate_ticker(ticker: str):
    """
    Validate a ticker and return its metadata (including first available date).
    """
    try:
        import yfinance as yf
        stock = yf.Ticker(ticker)
        # Fetch max history to find start date
        # We use 'max' but only need the index. 
        # Optimization: Fetching '1mo' first to check existence might be faster? 
        # But we need the START date. 'max' is the only way.
        hist = stock.history(period="max")
        
        if hist.empty:
             raise HTTPException(status_code=400, detail=f"Ticker '{ticker}' not found or has no data.")
        
        first_date = hist.index[0].strftime("%Y-%m-%d")
        
        # Get company name if possible
        info = stock.info
        name = info.get('longName') or info.get('shortName') or ticker
        
        return {
            "symbol": ticker.upper(),
            "name": name,
            "first_valid_date": first_date
        }
    except Exception as e:
        print(f"Validation error for {ticker}: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/stress_test")
async def stress_test(request: StressTestRequest):
    """
    Run stress tests on the portfolio against historical scenarios.
    """
    try:
        print(f"Running stress test for portfolio with {len(request.weights)} assets")
        historical_results = StressTester.run_stress_test(request.weights, request.benchmark)
        hypothetical_results = StressTester.run_hypothetical_test(request.weights, request.benchmark)
        
        # Merge results
        results = historical_results + hypothetical_results
        return {"results": results}
    except Exception as e:
        print(f"Stress test error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
