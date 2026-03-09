# Scripts Directory

This directory contains utility scripts for development, testing, and maintenance.

## Directory Structure

### `test/`
Manual testing scripts for various components:

- **analyze.ts** - Test the stock analysis pipeline
- **market-context.ts** - Test market context generation
- **market-context-fixed.ts** - Fixed version of market context test
- **notion-write.ts** - Test writing data to Notion
- **orchestrator.ts** - Test the orchestration system
- **stock-events.ts** - Test stock events ingestion
- **table-bold.ts** - Test table formatting with bold text
- **table-parsing.ts** - Test table parsing functionality

### `dev/`
Development utilities:

- **test-api.sh** - Shell script to test API endpoints
- **test-cron.ts** - Test cron job functionality locally
- **test-env.ts** - Verify environment variables are configured correctly

### `maintenance/`
Operational/maintenance scripts:

- **poll-notion.ts** - Poll Notion for updates
- **populate-stock-events-db-id.ts** - Populate stock events database IDs

## Usage

Run scripts using `ts-node`:

```bash
# Test scripts
ts-node scripts/test/analyze.ts
ts-node scripts/test/orchestrator.ts

# Dev scripts
ts-node scripts/dev/test-env.ts
bash scripts/dev/test-api.sh

# Maintenance scripts
ts-node scripts/maintenance/poll-notion.ts
```

## Note

These scripts are for development and maintenance purposes only. They are not part of the production application.
