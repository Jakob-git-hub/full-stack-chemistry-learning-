# chem_spider/spiders/chemistry.py
# Chemistry educational content spider for ChemVibe
#
# Usage:
#   scrapy crawl chemistry -a urls="https://en.wikipedia.org/wiki/Nucleophilic_substitution"
#   scrapy crawl chemistry -a urls="url1,url2,url3" -a topic="SN2-Reaktion" -a category="Reaktionsmechanismen"
#
# Deployed to Zyte (Scrapy Cloud), trigger via Zyte API:
#   POST https://app.zyte.com/api/runspider.json
#   Body: {"project": "chem", "spider": "chemistry", "start_urls": [...]}

import scrapy
from chem_spider.items import ChemistryPageItem


class ChemistrySpider(scrapy.Spider):
    """
    Spider that scrapes chemistry educational pages and extracts structured content.

    Arguments:
        urls: Comma-separated list of URLs to scrape
        topic: Chemistry topic name (e.g. "SN2-Reaktion")
        category: Category (e.g. "Reaktionsmechanismen")
        difficulty: Difficulty level (easy, medium, hard)
    """

    name = "chemistry"
    allowed_domains = []

    custom_settings = {
        "ROBOTSTXT_OBEY": True,
        "DOWNLOAD_DELAY": 1,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 4,
    }

    def __init__(self, urls="", topic="", category="", difficulty="medium", *args, **kwargs):
        super().__init__(*args, **kwargs)

        # Parse URLs from comma-separated string
        self.start_urls = [u.strip() for u in urls.split(",") if u.strip()]
        self.topic = topic
        self.category = category
        self.difficulty = difficulty

        # Extract allowed domains from start URLs
        for url in self.start_urls:
            from urllib.parse import urlparse
            domain = urlparse(url).netloc
            if domain and domain not in self.allowed_domains:
                self.allowed_domains.append(domain)

        if not self.start_urls:
            self.logger.warning("No URLs provided. Use -a urls='url1,url2'")

    def start_requests(self):
        for url in self.start_urls:
            yield scrapy.Request(
                url=url,
                callback=self.parse,
                errback=self.handle_error,
                meta={"topic": self.topic, "category": self.category, "difficulty": self.difficulty},
            )

    def parse(self, response):
        """Parse a chemistry educational page and extract content."""
        topic = response.meta.get("topic", "")
        category = response.meta.get("category", "")
        difficulty = response.meta.get("difficulty", "medium")

        # Extract title
        title = response.css("title::text").get(default="").strip()
        if not title:
            title = response.css("h1::text").get(default="").strip()

        # Extract main text content
        # Try common content selectors
        text_parts = []
        for selector in [
            "article p::text",
            "main p::text",
            ".content p::text",
            "#content p::text",
            ".mw-parser-output p::text",  # Wikipedia
            "p::text",
        ]:
            text_parts.extend(response.css(selector).getall())

        # Clean and join text
        text = " ".join(t.strip() for t in text_parts if t.strip())
        text = " ".join(text.split())  # Normalize whitespace

        # Extract language
        language = response.css("html::attr(lang)").get(default="en")

        item = ChemistryPageItem()
        item["url"] = response.url
        item["title"] = title
        item["text"] = text
        item["html"] = response.text
        item["language"] = language
        item["category"] = category
        item["topic"] = topic
        item["source"] = response.url.split("/")[2] if response.url else ""
        item["scraped_at"] = scrapy.utils.misc.utcnow().isoformat()

        self.logger.info(
            f"Scraped: {response.url} | title={title[:50]} | text_len={len(text)}"
        )

        yield item

    def handle_error(self, failure):
        """Handle request errors."""
        self.logger.error(f"Request failed: {failure.request.url} | {failure.value}")
