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

        # 2. Get Risk Free Rate
        rf_rate = get_risk_free_rate()
        
        # 3. Run Optimization
        print(f"Running optimization with objective: {request.objective}")
        optimization_result = optimize_portfolio(
            prices, 
            objective=request.objective, 
            risk_free_rate=rf_rate,
            min_weight=request.min_weight,
            max_weight=request.max_weight,
            annualization_factor=annualization_factor,
            mar=request.mar
        )
        
        if not optimization_result["success"]:
            raise HTTPException(status_code=500, detail=f"Optimization failed: {optimization_result['message']}")
        
        # 3b. Calculate Efficient Frontier
        print("Calculating efficient frontier...")
        from optimizer import calculate_efficient_frontier
        
        # Only pass optimal weights if the objective was Max Sharpe, 
        # otherwise let the frontier calculate the global Max Sharpe point independently
        pass_weights = optimization_result["weights"] if request.objective == "sharpe" else None
        
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
        if request.objective == "sharpe":
            efficient_frontier_data["optimal_portfolio"] = {
                "return": optimization_result["metrics"]["expected_return"],
                "volatility": optimization_result["metrics"]["volatility"],
                "sharpe_ratio": optimization_result["metrics"]["sharpe_ratio"],
                "weights": optimization_result["weights"]
            }
            
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
            mar=request.mar
        )
        
        return {
            "optimization": optimization_result,
            "backtest": backtest_result,
            "efficient_frontier": efficient_frontier_data,
            "parameters": {
                "risk_free_rate": rf_rate,
                "tickers": request.tickers,
                "period": f"{request.start_date} to {request.end_date}"
            }
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Internal Server Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
