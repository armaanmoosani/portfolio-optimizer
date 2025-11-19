export default async function handler(req, res) {
  const { service, ticker, query } = req.query;

  if (!service) return res.status(400).json({ error: "Missing service parameter" });

  if (service === "tiingo" && !ticker)
    return res.status(400).json({ error: "Missing ticker for tiingo" });

  if (service === "finnhubQuote" && !ticker)
    return res.status(400).json({ error: "Missing ticker for finnhubQuote" });

  if (service === "finnhubNews" && !ticker)
    return res.status(400).json({ error: "Missing ticker for finnhubNews" });

  if (service === "finnhubAutocomplete" && !query)
    return res.status(400).json({ error: "Missing query for autocomplete" });


  try {
    let url;
    let options = { headers: {} };

    if (service === "tiingo") {
      url = `https://api.tiingo.com/tiingo/daily/${ticker}?token=${process.env.API_KEY}`;
    } else if (service === "finnhubQuote") {
      url = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${process.env.FINNHUB_API_KEY}`;
    } else if (service === "finnhubNews") {
      const today = new Date();
      const yesterdayDate = new Date(today);
      yesterdayDate.setDate(today.getDate() - 1);
      const dateStrToday = today.toISOString().split("T")[0];
      const yesterday = yesterdayDate.toISOString().split("T")[0];
      url = `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${yesterday}&to=${dateStrToday}&token=${process.env.FINNHUB_API_KEY}`;
    } else if (service === "finnhubAutocomplete") {
      url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${process.env.FINNHUB_API_KEY}`;
    } else if (service === "gemini") {
      url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";
      options.headers["x-goog-api-key"] = process.env.GEMINI_API_KEY;
      options.headers["Content-Type"] = "application/json";
      options.method = req.method;
      options.body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    }

    const response = await fetch(url, options);
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed fetching data" });
  }
}
