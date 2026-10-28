# chem_spider/items.py
# Define here the models for your scraped items
#
# See documentation in:
# https://docs.scrapy.org/en/latest/topics/items.html

import scrapy


class ChemistryPageItem(scrapy.Item):
    """Item representing a scraped chemistry educational page."""

    url = scrapy.Field()
    title = scrapy.Field()
    text = scrapy.Field()
    html = scrapy.Field()
    language = scrapy.Field()
    category = scrapy.Field()
    topic = scrapy.Field()
    source = scrapy.Field()
    scraped_at = scrapy.Field()


class ChemistryTopicItem(scrapy.Item):
    """Item representing a chemistry topic with its content."""

    topic = scrapy.Field()
    category = scrapy.Field()
    difficulty = scrapy.Field()
    pages = scrapy.Field()  # List of ChemistryPageItem dicts
    summary = scrapy.Field()
