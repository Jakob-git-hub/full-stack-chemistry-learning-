# chem_spider/settings.py
# Scrapy settings for chem_spider project

BOT_NAME = "chem_spider"

SPIDER_MODULES = ["chem_spider.spiders"]
NEWSPIDER_MODULE = "chem_spider.spiders"

# Obey robots.txt rules
ROBOTSTXT_OBEY = True

# Concurrency and throttling settings
CONCURRENT_REQUESTS = 16
CONCURRENT_REQUESTS_PER_DOMAIN = 8
DOWNLOAD_DELAY = 1
RANDOMIZE_DOWNLOAD_DELAY = 0.5

# AutoThrottle extension
AUTOTHROTTLE_ENABLED = True
AUTOTHROTTLE_START_DELAY = 1
AUTOTHROTTLE_MAX_DELAY = 10
AUTOTHROTTLE_TARGET_CONCURRENCY = 4.0
AUTOTHROTTLE_DEBUG = False

# Default request headers
DEFAULT_REQUEST_HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,de;q=0.8",
    "User-Agent": "ChemVibe Spider (+https://github.com/Jakob-git-hub/full-stack-chemistry-learning-)",
}

# Enable or disable downloader middlewares
DOWNLOADER_MIDDLEWARES = {
    "chem_spider.middlewares.ChemSpiderDownloaderMiddleware": 543,
}

# Enable or disable spider middlewares
SPIDER_MIDDLEWARES = {
    "chem_spider.middlewares.ChemSpiderSpiderMiddleware": 543,
}

# Enable or disable extensions
EXTENSIONS = {
    "scrapy.extensions.telnet.TelnetConsole": None,
}

# Configure item pipelines
ITEM_PIPELINES = {
    "chem_spider.pipelines.ChemSpiderPipeline": 300,
}

# Enable and configure HTTP caching (disabled by default)
HTTPCACHE_ENABLED = False

# Logging
LOG_LEVEL = "INFO"
LOG_FORMAT = "%(asctime)s [%(name)s] %(levelname)s: %(message)s"

# Feed export encoding
FEED_EXPORT_ENCODING = "utf-8"

# Retry settings
RETRY_ENABLED = True
RETRY_TIMES = 3
RETRY_HTTP_CODES = [500, 502, 503, 504, 408, 429]

# Request fingerprinting
REQUEST_FINGERPRINTER_IMPLEMENTATION = "2.7"

# Twisted reactor
TWISTED_REACTOR = "twisted.internet.asyncioreactor.AsyncioSelectorReactor"

# Zyte-specific settings (when deployed to Zyte)
# These are overridden by Zyte's environment when deployed
ZYTE_API_KEY = None
ZYTE_API_URL = "https://api.zyte.com/v1/extract"

# Backend API endpoint (your FastAPI backend on Heroku)
BACKEND_API_URL = "https://chemvibe-backend.herokuapp.com"
BACKEND_API_KEY = None
