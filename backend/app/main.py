import sys
import os

# Add current directory to path to ensure imports work correctly in all environments (Vercel vs Local)
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException, Request
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

# Import rate limiting and validation
from rate_limiter import limiter, rate_limit_handler, RATE_LIMITS
from validators import InputValidator
from slowapi.errors import RateLimitExceeded

app = FastAPI(
    title="Portfolio Optimizer API",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Add rate limiter state
app.state.limiter = limiter

# Add rate limit exception handler
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=3600,  # Cache preflight requests for 1 hour
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
@limiter.limit(RATE_LIMITS["general"])
def read_root(request: Request):
    return {"status": "online", "message": "Portfolio Optimizer API is running"}

@app.get("/api/health")
@limiter.limit(RATE_LIMITS["general"])
def health_check(request: Request):
    return {"status": "healthy"}

@app.post("/api/optimize")
@limiter.limit(RATE_LIMITS["compute_intensive"])
async def optimize(request: Request, portfolio_request: PortfolioRequest):
    try:
        # Validate all inputs before processing
        InputValidator.validate_tickers(portfolio_request.tickers)
        InputValidator.validate_weight_constraints(portfolio_request.min_weight, portfolio_request.max_weight)
        InputValidator.validate_capital(portfolio_request.initial_capital)
        InputValidator.validate_mar(portfolio_request.mar)
        InputValidator.validate_objective(portfolio_request.objective)
        InputValidator.validate_frequency(portfolio_request.frequency)
        
        # Determine interval and annualization factor
        interval = "1d"
        annualization_factor = 252
        
        if portfolio_request.frequency == "monthly":
            interval = "1mo"
            annualization_factor = 12

        # 1. Fetch Data
        print(f"Fetching data for {portfolio_request.tickers} from {portfolio_request.start_date} to {portfolio_request.end_date} ({portfolio_request.frequency})")
        prices = fetch_historical_data(portfolio_request.tickers, portfolio_request.start_date, portfolio_request.end_date, interval=interval)
        
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
        
        # 2b. Fetch benchmark data (Always fetch for SML/Beta calculations)
        print(f"Fetching benchmark data ({portfolio_request.benchmark}) for Beta/SML calculations")
        benchmark_data = fetch_benchmark_data(portfolio_request.start_date, portfolio_request.end_date, portfolio_request.benchmark)
        
        if benchmark_data.empty:
            print(f"WARNING: Could not fetch benchmark data for {portfolio_request.benchmark}. SML will be disabled.")
            benchmark_prices = None
        else:
            benchmark_prices = benchmark_data
        
        # 3. Run Optimization
        print(f"Running optimization with objective: {portfolio_request.objective}")
        optimization_result = optimize_portfolio(
            prices, 
            objective=portfolio_request.objective, 
            risk_free_rate=rf_rate,
            min_weight=portfolio_request.min_weight,
            max_weight=portfolio_request.max_weight,
            annualization_factor=annualization_factor,
            mar=portfolio_request.mar,
            benchmark_prices=benchmark_prices
        )
        
        if not optimization_result["success"]:
            raise HTTPException(status_code=500, detail=f"Optimization failed: {optimization_result['message']}")
        
        # 3b. Calculate Efficient Frontier
        print(f"Calculating efficient frontier for objective: {portfolio_request.objective}")
        from optimizer import calculate_efficient_frontier
        
        # Only pass optimal weights if the objective was Max Sharpe, 
        # otherwise let the frontier calculate the global Max Sharpe point independently
        is_sharpe = portfolio_request.objective == "sharpe"
        pass_weights = optimization_result["weights"] if is_sharpe else None
        
        efficient_frontier_data = calculate_efficient_frontier(
            prices,
            optimal_weights=pass_weights,
            risk_free_rate=rf_rate,
            min_weight=portfolio_request.min_weight,
            max_weight=portfolio_request.max_weight,
            annualization_factor=annualization_factor,
            num_portfolios=150,
            benchmark_prices=benchmark_prices
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
            print(f"Objective is {portfolio_request.objective}, skipping Max Sharpe override")
            
        # 4. Run Backtest
        print("Running backtest...")
        benchmark_data = fetch_benchmark_data(portfolio_request.start_date, portfolio_request.end_date, portfolio_request.benchmark)
        backtest_result = run_backtest(
            prices, 
            optimization_result["weights"], 
            benchmark_data=benchmark_data, 
            initial_capital=portfolio_request.initial_capital,
            risk_free_rate=rf_rate,
            annualization_factor=annualization_factor,
            mar=portfolio_request.mar,
            rebalance_freq=portfolio_request.rebalance_freq
        )
        
        # Check for start date truncation
        warnings = []
        if not prices.empty:
             actual_start = prices.index[0].strftime("%Y-%m-%d")
             # Simple string comparison works for YYYY-MM-DD
             if actual_start > portfolio_request.start_date:
                  warnings.append(f"Data limited: Optimization starts from {actual_start} (earliest common date).")
        


        return {
            "optimization": optimization_result,
            "backtest": backtest_result,
            "efficient_frontier": efficient_frontier_data,
            "parameters": {
                "risk_free_rate": rf_rate,
                "tickers": portfolio_request.tickers,
                "period": f"{portfolio_request.start_date} to {portfolio_request.end_date}"
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
@limiter.limit(RATE_LIMITS["data_fetch"])
def get_history(request: Request, ticker: str, period: str = "1mo", interval: str = "1d"):
    try:
        # Validate ticker
        InputValidator.validate_ticker(ticker)
        
        # Validate period (basic validation)
        valid_periods = ["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"]
        if period not in valid_periods:
            raise HTTPException(status_code=400, detail=f"Invalid period. Must be one of: {', '.join(valid_periods)}")
        
        # Validate interval
        valid_intervals = ["1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h", "1d", "5d", "1wk", "1mo", "3mo"]
        if interval not in valid_intervals:
            raise HTTPException(status_code=400, detail=f"Invalid interval. Must be one of: {', '.join(valid_intervals)}")
        
        from data import get_chart_data
        data = get_chart_data(ticker, period, interval)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stock_info")
@limiter.limit(RATE_LIMITS["data_fetch"])
def get_stock_info_endpoint(request: Request, ticker: str):
    try:
        InputValidator.validate_ticker(ticker)
        from data import get_stock_info
        data = get_stock_info(ticker)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class StressTestRequest(BaseModel):
    weights: dict
    benchmark: str = "SPY"

@app.post("/api/stress_test")
@limiter.limit(RATE_LIMITS["compute_intensive"])
async def stress_test(request: Request, stress_request: StressTestRequest):
    """
    Run stress tests on the portfolio against historical scenarios.
    """
    try:
        # Validate inputs
        if not stress_request.weights or len(stress_request.weights) == 0:
            raise HTTPException(status_code=400, detail="Portfolio weights are required")
        
        if len(stress_request.weights) > InputValidator.MAX_TICKERS:
            raise HTTPException(status_code=400, detail=f"Maximum {InputValidator.MAX_TICKERS} assets allowed")
        
        # Validate each ticker in weights
        for ticker in stress_request.weights.keys():
            InputValidator.validate_ticker(ticker)
        
        # Validate benchmark
        InputValidator.validate_ticker(stress_request.benchmark)
        
        print(f"Running stress test for portfolio with {len(stress_request.weights)} assets")
        historical_results = StressTester.run_stress_test(stress_request.weights, stress_request.benchmark)
        hypothetical_results = StressTester.run_hypothetical_test(stress_request.weights, stress_request.benchmark)
        
        # Merge results
        results = historical_results + hypothetical_results
        return {"results": results}
    except Exception as e:
        print(f"Stress test error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analyst_ratings")
@limiter.limit(RATE_LIMITS["data_fetch"])
def get_analyst_ratings_endpoint(request: Request, ticker: str):
    try:
        InputValidator.validate_ticker(ticker)
        from data import get_analyst_ratings
        data = get_analyst_ratings(ticker)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/quote")
@limiter.limit(RATE_LIMITS["data_fetch"])
def get_quote_endpoint(request: Request, ticker: str):
    try:
        InputValidator.validate_ticker(ticker)
        from data import get_latest_price
        data = get_latest_price(ticker)
        if not data:
             raise HTTPException(status_code=404, detail="Quote not available")
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/whatif")
@limiter.limit(RATE_LIMITS["data_fetch"])
def whatif_endpoint(request: Request, ticker: str, date: str, amount: float):
    """
    Calculate what an investment would be worth today.
    
    Args:
        ticker: Stock symbol
        date: Start date (YYYY-MM-DD)
        amount: Investment amount in dollars
    """
    try:
        InputValidator.validate_ticker(ticker)
        if amount <= 0 or amount > 1_000_000_000:
            raise HTTPException(status_code=400, detail="Amount must be between 0 and 1 billion")
        
        from data import calculate_whatif
        result = calculate_whatif(ticker, date, amount)
        
        if not result.get("valid", False):
            raise HTTPException(status_code=400, detail=result.get("error", "Calculation failed"))
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
