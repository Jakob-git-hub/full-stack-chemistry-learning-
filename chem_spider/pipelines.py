# chem_spider/pipelines.py
# Define your item pipelines here
#
# Don't forget to add your pipeline to the ITEM_PIPELINES setting.
# See: https://docs.scrapy.org/en/latest/topics/item-pipeline.html

import json
import os
import logging
from datetime import datetime, timezone
from itemadapter import ItemAdapter

import httpx

logger = logging.getLogger(__name__)


class ChemSpiderPipeline:
    """Pipeline that saves scraped items and optionally sends them to the backend API."""

    def __init__(self):
        self.items = []
        self.output_dir = os.getenv("SCRAPY_OUTPUT_DIR", "./output")
        self.backend_url = os.getenv("BACKEND_API_URL", "")
        self.backend_api_key = os.getenv("BACKEND_API_KEY", "")

        os.makedirs(self.output_dir, exist_ok=True)

    def open_spider(self, spider):
        spider.logger.info(f"Pipeline opened. Output dir: {self.output_dir}")

    def close_spider(self, spider):
        # Save all items to a JSON file
        output_file = os.path.join(
            self.output_dir,
            f"chem_spider_{spider.name}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.json",
        )
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(self.items, f, ensure_ascii=False, indent=2)
        spider.logger.info(f"Saved {len(self.items)} items to {output_file}")

        # Optionally send to backend API
        if self.backend_url and self.items:
            self._send_to_backend(spider)

    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        self.items.append(adapter.asdict())
        return item

    def _send_to_backend(self, spider):
        """Send scraped items to the FastAPI backend."""
        try:
            headers = {"Content-Type": "application/json"}
            if self.backend_api_key:
                headers["Authorization"] = f"Bearer {self.backend_api_key}"

            payload = {
                "spider": spider.name,
                "items": self.items,
                "scraped_at": datetime.now(timezone.utc).isoformat(),
            }

            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    f"{self.backend_url}/api/scraped-data",
                    json=payload,
                    headers=headers,
                )
                if response.status_code in (200, 201):
                    spider.logger.info(
                        f"Sent {len(self.items)} items to backend API"
                    )
                else:
                    spider.logger.warning(
                        f"Backend API returned {response.status_code}: {response.text}"
                    )
        except Exception as exc:
            spider.logger.error(f"Failed to send items to backend: {exc}")
