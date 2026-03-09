# Tests Directory

This directory is reserved for future automated tests using Jest.

## Planned Structure

```
tests/
├── unit/
│   ├── lib/
│   │   ├── core/
│   │   ├── domain/
│   │   └── integrations/
│   └── api/
├── integration/
│   ├── notion.test.ts
│   ├── fmp.test.ts
│   └── orchestrator.test.ts
├── e2e/
│   └── analyze-flow.test.ts
├── fixtures/
│   └── (test data files)
└── helpers/
    └── (test utilities)
```

## Running Tests

```bash
npm test
```

## Current Test Scripts

Manual test scripts are located in `scripts/test/` directory:
- `analyze.ts` - Test stock analysis pipeline
- `orchestrator.ts` - Test orchestration system
- `notion-write.ts` - Test Notion integration
- And more...

See `scripts/README.md` for details on manual test scripts.
