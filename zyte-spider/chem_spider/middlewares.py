# chem_spider/middlewares.py
# Define here the models for your spider middleware
#
# See documentation in:
# https://docs.scrapy.org/en/latest/topics/spider-middleware.html

import logging
from scrapy import signals
from itemadapter import ItemAdapter

logger = logging.getLogger(__name__)


class ChemSpiderSpiderMiddleware:
    """Spider middleware for the chem_spider project."""

    @classmethod
    def from_crawler(cls, crawler):
        s = cls()
        crawler.signals.connect(s.spider_opened, signal=signals.spider_opened)
        return s

    def process_spider_input(self, response, spider):
        return None

    def process_spider_output(self, response, result, spider):
        for i in result:
            yield i

    def process_spider_exception(self, response, exception, spider):
        logger.error(f"Spider exception: {exception}")
        return None

    def process_start_requests(self, start_requests, spider):
        for r in start_requests:
            yield r

    def spider_opened(self, spider):
        spider.logger.info(f"Spider opened: {spider.name}")


class ChemSpiderDownloaderMiddleware:
    """Downloader middleware for the chem_spider project."""

    @classmethod
    def from_crawler(cls, crawler):
        s = cls()
        crawler.signals.connect(s.spider_opened, signal=signals.spider_opened)
        return s

    def process_request(self, request, spider):
        return None

    def process_response(self, request, response, spider):
        return response

    def process_exception(self, request, exception, spider):
        logger.error(f"Downloader exception: {exception}")
        return None

    def spider_opened(self, spider):
        spider.logger.info(f"Downloader opened: {spider.name}")
