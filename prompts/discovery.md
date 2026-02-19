# Discovery Stage Prompt - Perplexity Sonar

Search for the latest industry news and developments from the past 7 days.

**Prioritize these sources:** {{ENABLED_SOURCES}}

**Coverage areas:**
- Rocket launches, vehicle deployments, test flights
- Ongoing space missions, satellite operations, crew activities
- Space policy, government regulations, international agreements
- Commercial space deals, market trends, company announcements
- Scientific research, discoveries, breakthroughs
- Planetary exploration, deep space, astronomical discoveries

**Return a JSON array with objects containing:**

```json
{
  "headline": "Concise, factual headline",
  "summary": "One-sentence summary",
  "source_url": "Direct URL to the best source article",
  "source_name": "Publication name",
  "category": "launches|missions|policy|commercial|science|exploration",
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
