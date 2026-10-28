# ChemVibe Zyte Spider

Scrapy spider project for scraping chemistry educational content. Deployed to Zyte (Scrapy Cloud).

## Project Structure

```
zyte-spider/
├── scrapy.cfg              # Scrapy project config + Zyte deploy settings
├── requirements.txt        # Python dependencies
├── chem_spider/
│   ├── __init__.py
│   ├── settings.py         # Scrapy settings
│   ├── items.py            # Scrapy item definitions
│   ├── middlewares.py      # Spider/downloader middlewares
│   ├── pipelines.py        # Item pipelines (save JSON + send to backend)
│   └── spiders/
│       ├── __init__.py
│       └── chemistry.py    # Main chemistry content spider
```

## Local Development

### Install dependencies
```bash
cd zyte-spider
pip install -r requirements.txt
```

### Run the spider locally
```bash
scrapy crawl chemistry -a urls="https://en.wikipedia.org/wiki/Nucleophilic_substitution,https://en.wikipedia.org/wiki/SN2_reaction" -a topic="SN2-Reaktion" -a category="Reaktionsmechanismen" -a difficulty=medium
```

### Run with output to JSON
```bash
scrapy crawl chemistry -a urls="https://en.wikipedia.org/wiki/Methan" -o output.json
```

## Deploy to Zyte (Scrapy Cloud)

### Option 1: Deploy via CLI
```bash
# Install shub (Scrapy Cloud CLI)
pip install shub

# Login to Zyte
shub login

# Deploy the project
shub deploy
```

### Option 2: Deploy via Zyte Web UI
1. Go to https://app.zyte.com → your project → Code & Deploys
2. Click "Deploy my code" or upload a ZIP of the `zyte-spider/` folder
3. The project ID is `chem` (as configured in `scrapy.cfg`)

## API Access

### Trigger spider via Zyte API
Once deployed, you can run the spider via Zyte's API:

```bash
curl -X POST https://app.zyte.com/api/runspider.json \
  -u "YOUR_API_KEY:" \
  -d project=chem \
  -d spider=chemistry \
  -d start_urls='["https://en.wikipedia.org/wiki/Nucleophilic_substitution"]'
```

### Retrieve results
Results are stored in Zyte's item storage and can be retrieved via:
```bash
curl -u "YOUR_API_KEY:" \
  "https://storage.scrapinghub.com/items/<job-id>"
```

## Integration with ChemVibe Backend

The pipeline can send scraped data to your FastAPI backend. Set these env vars:

```env
BACKEND_API_URL=https://chemvibe-backend.herokuapp.com
BACKEND_API_KEY=your-backend-api-key
```

The data is POSTed to `BACKEND_API_URL/api/scraped-data`.

## Supported Technologies (Zyte)

- Scrapy (this project)
- Casper JS
- Custom images
