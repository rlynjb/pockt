# pockt habits

A private Notion-backed habit tracker that renders as a small embedded web app.

## Development

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:3000`.

## Verification

```bash
npm run lint
npm test
npm run build
npm run test:e2e
```

## Deployment

Fly.io deployment uses the checked-in `fly.toml` app name and server-side Notion variables from a root `.env` file.

Prerequisites:

- Install the Fly CLI and run `fly auth login`.
- Create `.env` in the repository root with `NOTION_TOKEN`, `NOTION_HABITS_DATA_SOURCE_ID`, and `NOTION_COMPLETIONS_DATA_SOURCE_ID`.

Redeploy with:

```bash
npm run deploy:fly
```

The helper validates prerequisites, stages only those three secrets with Fly, then runs `fly deploy` from the repository root. It does not print secret values. Do not commit `.env`.

## Notion

See `docs/notion-setup.md` for the required internal connection, database properties, and environment variables.
