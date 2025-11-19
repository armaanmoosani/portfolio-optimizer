const tickerInput = document.getElementById("ticker");
const searchBtn = document.getElementById("search-button");
const companyNameEl = document.getElementById("company-name");
const descriptionEl = document.getElementById("description");
const priceEl = document.getElementById("price");
const newsListEl = document.getElementById("news-list");
const aiSummaryEl = document.getElementById("ai-summary");
const messageEl = document.getElementById("message");
const today = new Date();
const yesterdayDate = new Date(today);
yesterdayDate.setDate(today.getDate() - 1);

const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, "0");
const dd = String(today.getDate()).padStart(2, "0");

const yyyyY = yesterdayDate.getFullYear();
const mmY = String(yesterdayDate.getMonth() + 1).padStart(2, "0");
const ddY = String(yesterdayDate.getDate()).padStart(2, "0");

const dateStrToday = `${yyyy}-${mm}-${dd}`;
const yesterday = `${yyyyY}-${mmY}-${ddY}`;

const suggestionBox = document.createElement("ul");
suggestionBox.className = "suggestions";
tickerInput.parentNode.appendChild(suggestionBox);


searchBtn.addEventListener("click", function () {
    companyNameEl.textContent = "";
    descriptionEl.textContent = "";
    priceEl.textContent = "";
    aiSummaryEl.textContent = "";
    newsListEl.textContent = "";
    messageEl.textContent = "";

    const ticker = (tickerInput.value || "").trim().toUpperCase();
    if (!ticker) {
        messageEl.textContent = "Please enter a ticker symbol.";
        return;
    }

    messageEl.textContent = "Loading…";

    fetch(`/api/proxy?service=tiingo&ticker=${ticker}`)
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(meta => {
            companyNameEl.textContent = meta.name ? `${meta.name} (${ticker})` : ticker;
            descriptionEl.textContent = meta.description || "No description available.";
        })
        .catch(() => {
            messageEl.textContent = "Error fetching company metadata.";
        });

    fetch(`/api/proxy?service=finnhubQuote&ticker=${ticker}`)
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(quote => {
            const priceText = quote.c ? `$${quote.c.toFixed(2)}` : "N/A";
            const pctText = quote.c && quote.pc ? ((quote.c - quote.pc) / quote.pc * 100).toFixed(2) + "%" : "N/A";
            priceEl.textContent = `Price: ${priceText} (${pctText})`;
        })
        .catch(() => {
            messageEl.textContent = "Error fetching price data.";
        });

    fetch(`/api/proxy?service=finnhubNews&ticker=${ticker}`)
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(newsData => {
            const newsArr = Array.isArray(newsData) ? newsData : [];
            if (!newsArr.length) {
                newsListEl.textContent = "No news available.";
                aiSummaryEl.textContent = "AI summary unavailable — no news data.";
                return null;
            }

            newsListEl.textContent = "";
            newsArr.slice(0, 5).forEach(item => {
                const li = document.createElement("li");
                const a = document.createElement("a");
                a.href = item.url;
                a.target = "_blank";
                a.rel = "noopener noreferrer";
                a.textContent = item.headline;
                li.appendChild(a);
                newsListEl.appendChild(li);
            });
            return newsArr.map(a => `${a.headline}\n${a.summary || ""}`).join("\n\n");
        })
        .then(aggregated => {
            if (!aggregated) return;
            aiSummaryEl.textContent = "Generating summary…";
            const prompt = `
You are an AI assistant that writes investor summaries. Here’s an example:

Robinhood shares rise ahead of Q3 earnings report after market close today, fueled by strong growth expectations. Analysts expect EPS of $0.54 versus $0.17 a year ago, and revenues rising 88% to $1.21 billion. Options traders anticipate a 9.45% price swing. Product expansion and crypto trading growth are driving revenue diversification. Why this matters: Investors are weighing growth potential against valuation risks.

Now, based on the recent headlines and the latest price change for ${companyNameEl.textContent || ticker}, generate a summary with these rules:
- Exactly 3 concise bullet points explaining the main drivers of the stock's movement
- 1-line "Why this matters" conclusion
- Plain-language, easy to understand for investors of all experience levels
- Include important metrics or context if available
- Do not use Markdown, bold, or other formatting
- Output ready to display directly on a web page
- Only summarize the provided news content; do not add unrelated information

Recent headlines and summaries:
${aggregated.slice(0, 15000)}
    `;
            return fetch(`/api/proxy?service=gemini&ticker=${ticker}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: [
                        {
                            role: "user",
                            parts: [
                                {
                                    text: prompt
                                }
                            ]
                        }
                    ],
                    generationConfig: { temperature: 0.2, maxOutputTokens: 400 }
                })
            });
        })
        .then(resp => {
            if (!resp?.ok) return Promise.reject();
            return resp.json();
        })
        .then(aiResp => {
            if (!aiResp || !aiResp.candidates || !aiResp.candidates.length) {
                aiSummaryEl.textContent = "Summary unavailable.";
                return;
            }
            const candidate = aiResp.candidates[0];
            aiSummaryEl.textContent = candidate?.content?.parts?.[0]?.text ||
                candidate?.content ||
                aiResp.output_text ||
                "Summary unavailable.";
            document.getElementById("results").style.visibility = "visible";
        })
        .catch(() => {
            aiSummaryEl.textContent = aiSummaryEl.textContent || "AI summary unavailable.";
        })
        .finally(() => {
            messageEl.textContent = "";
        });
});

tickerInput.addEventListener("input", () => {
    const query = tickerInput.value.trim();
    if (!query) {
        suggestionBox.style.display = "none";
        while (suggestionBox.firstChild) suggestionBox.removeChild(suggestionBox.firstChild);
        return;
    }

    fetch(`/api/proxy?service=finnhubAutocomplete&query=${encodeURIComponent(query)}`)
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(data => {
            while (suggestionBox.firstChild) suggestionBox.removeChild(suggestionBox.firstChild);
            const results = data.result;
            if (!results.length) {
                suggestionBox.style.display = "none";
            }
            if (!query) {
                suggestionBox.style.display = "none";
                return;
            }
            for (let i = 0; i < Math.min(results.length, 6); i++) {
                const item = results[i];
                const li = document.createElement("li");
                li.textContent = `${item.displaySymbol} — ${item.description}`;
                li.className = "suggestion-item";
                li.addEventListener("click", () => {
                    tickerInput.value = item.symbol;
                    while (suggestionBox.firstChild) suggestionBox.removeChild(suggestionBox.firstChild);
                    suggestionBox.style.display = "none";
                    searchBtn.click();
                });
                suggestionBox.appendChild(li);
            }
            suggestionBox.style.display = "block";
        })
        .catch(() => {
            while (suggestionBox.firstChild) suggestionBox.removeChild(suggestionBox.firstChild);
            suggestionBox.style.display = "none";
        });
});

tickerInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        searchBtn.click();
    }
});

document.addEventListener("click", (e) => {
    if (e.target !== tickerInput &&!suggestionBox.contains(e.target)) {
        suggestionBox.style.display = "none";
    }
});