import re
from datetime import datetime, timedelta
from typing import List, Tuple
from dateutil import parser
from fastapi import HTTPException


class InputValidator:
    MAX_TICKERS = 50  # Maximum number of tickers per request
    MAX_TICKER_LENGTH = 10  # Maximum length for a single ticker symbol
    MAX_LOOKBACK_YEARS = 20  # Maximum historical data lookback
    MIN_DATE_RANGE_DAYS = 30  # Minimum date range for meaningful analysis
    
    # Ticker validation pattern (alphanumeric, dots, hyphens only)
    TICKER_PATTERN = re.compile(r'^[A-Z0-9.\-]{1,10}$', re.IGNORECASE)
    
    # Blacklist patterns (common SQL injection attempts, command injection)
    BLACKLIST_PATTERNS = [
        r'[\'";<>{}()\[\]]',  # Special characters that could be used for injection
        r'(union|select|insert|update|delete|drop|create|alter)\s',  # SQL keywords
        r'(\.\.|\/\/|\\\\)',  # Path traversal attempts
    ]
    
    @classmethod
    def validate_ticker(cls, ticker: str) -> bool:
        if not ticker or len(ticker) > cls.MAX_TICKER_LENGTH:
            raise HTTPException(
                status_code=400, 
                detail=f"Ticker must be 1-{cls.MAX_TICKER_LENGTH} characters"
            )
        
        # Check against pattern
        if not cls.TICKER_PATTERN.match(ticker):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid ticker format: {ticker}. Only alphanumeric, dots, and hyphens allowed."
            )
        
        # Check blacklist patterns
        for pattern in cls.BLACKLIST_PATTERNS:
            if re.search(pattern, ticker, re.IGNORECASE):
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid characters in ticker: {ticker}"
                )
        
        return True
    
    @classmethod
    def validate_tickers(cls, tickers: List[str]) -> bool:
        if not tickers or len(tickers) == 0:
            raise HTTPException(
                status_code=400,
                detail="At least one ticker is required"
            )
        
        if len(tickers) > cls.MAX_TICKERS:
            raise HTTPException(
                status_code=400,
                detail=f"Maximum {cls.MAX_TICKERS} tickers allowed per request"
            )
        
        # Validate each ticker
        for ticker in tickers:
            cls.validate_ticker(ticker)
        
        return True
    
    @classmethod
    def validate_date_range(cls, start_date: str, end_date: str) -> Tuple[datetime, datetime]:
        try:
            # Parse dates
            start_dt = parser.parse(start_date)
            end_dt = parser.parse(end_date)
        except (ValueError, parser.ParserError) as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid date format. Use YYYY-MM-DD. Error: {str(e)}"
            )
        
        # Check if dates are in the future
        now = datetime.now()
        if start_dt > now or end_dt > now:
            raise HTTPException(
                status_code=400,
                detail="Dates cannot be in the future"
            )
        
        # Check date order
        if start_dt >= end_dt:
            raise HTTPException(
                status_code=400,
                detail="Start date must be before end date"
            )
        
        # Check minimum date range
        date_diff = (end_dt - start_dt).days
        if date_diff < cls.MIN_DATE_RANGE_DAYS:
            raise HTTPException(
                status_code=400,
                detail=f"Date range must be at least {cls.MIN_DATE_RANGE_DAYS} days"
            )
        
        # Check maximum lookback
        max_lookback = timedelta(days=cls.MAX_LOOKBACK_YEARS * 365)
        if start_dt < now - max_lookback:
            raise HTTPException(
                status_code=400,
                detail=f"Start date cannot be more than {cls.MAX_LOOKBACK_YEARS} years in the past"
            )
        
        return start_dt, end_dt
    
    @classmethod
    def validate_weight_constraints(cls, min_weight: float, max_weight: float) -> bool:
        if min_weight < 0 or min_weight > 1:
            raise HTTPException(
                status_code=400,
                detail="Minimum weight must be between 0 and 1"
            )
        
        if max_weight < 0 or max_weight > 1:
            raise HTTPException(
                status_code=400,
                detail="Maximum weight must be between 0 and 1"
            )
        
        if min_weight >= max_weight:
            raise HTTPException(
                status_code=400,
                detail="Minimum weight must be less than maximum weight"
            )
        
        return True
    
    @classmethod
    def validate_capital(cls, capital: float) -> bool:
        if capital <= 0:
            raise HTTPException(
                status_code=400,
                detail="Initial capital must be positive"
            )
        
        # Prevent unreasonably large values that could cause memory issues
        if capital > 1e15: 
            raise HTTPException(
                status_code=400,
                detail="Initial capital value is unreasonably large"
            )
        
        return True
    
    @classmethod
    def validate_mar(cls, mar: float) -> bool:
        # Allow reasonable range for MAR (-100% to +1000%)
        if mar < -1.0 or mar > 10.0:
            raise HTTPException(
                status_code=400,
                detail="MAR must be between -100% and +1000% (as decimal: -1.0 to 10.0)"
            )
        
        return True
    
    @classmethod
    def validate_objective(cls, objective: str) -> bool:
        valid_objectives = ["sharpe", "min_volatility", "max_return", "sortino", "calmar", "treynor"]
        
        if objective not in valid_objectives:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid objective. Must be one of: {', '.join(valid_objectives)}"
            )
        
        return True
    
    @classmethod
    def validate_frequency(cls, frequency: str) -> bool:
        valid_frequencies = ["daily", "monthly"]
        
        if frequency not in valid_frequencies:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid frequency. Must be one of: {', '.join(valid_frequencies)}"
            )
        
        return True
