# Discovery Stage Prompt - Perplexity Sonar

Search for the latest real estate and housing market news from the past 7 days.

**Prioritize these sources:** {{ENABLED_SOURCES}}

**Coverage areas:**
- Housing market trends, home prices, sales data, inventory levels
- Mortgage rates, lending conditions, financing trends
- Real estate policy, zoning laws, legislation, regulations
- Commercial real estate deals, office/retail trends, market shifts
- Residential market activity, new home construction, development projects
- Real estate investment, REITs, property market analysis
- Rental market trends, multifamily housing, affordability

**Return a JSON array with objects containing:**

```json
{
  "headline": "Concise, factual headline",
  "summary": "One-sentence summary",
  "source_url": "Direct URL to the best source article",
  "source_name": "Publication name",
  "category": "market_trends|policy|commercial|residential|finance|development",
  "importance_score": 1-10,
  "published_date": "YYYY-MM-DD",
  "tags": ["tag1", "tag2", "tag3"]
}
```

**Requirements:**
- Return at least 15-20 stories
- Rank by importance_score descending
- Only include stories from the past 7 days
- Ensure URLs are direct article links, not homepage links
- Use accurate, factual headlines - no clickbait

**Respond with ONLY the JSON array, no other text.**
