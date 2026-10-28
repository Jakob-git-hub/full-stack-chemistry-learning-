from setuptools import setup, find_packages

setup(
    name="chem_spider",
    version="1.0.0",
    description="ChemVibe chemistry content Scrapy spider for Zyte Scrapy Cloud",
    packages=find_packages(),
    install_requires=[
        "scrapy>=2.11.0",
        "httpx>=0.25.0",
        "itemadapter>=0.8.0",
    ],
    entry_points={
        "scrapy": [
            "settings = chem_spider.settings",
        ],
    },
)
