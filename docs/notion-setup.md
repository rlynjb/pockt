# Notion Setup

Phase 1 uses a private internal Notion connection. Notion remains authoritative for habits and completions.

## Habits Table

Create a Notion database named **Habits** with these properties:

| Property | Type | Values |
|---|---|---|
| `Name` | Title | User-visible habit name |
| `Slot` | Select | `Morning`, `Midday`, `Evening`, `Anytime` |
| `Status` | Select | `Active`, `Archived` |

## Habit Completions Table

Create a Notion database named **Habit Completions** with these properties:

| Property | Type | Values |
|---|---|---|
| `Habit` | Relation | Relation to **Habits** |
| `Completed Date` | Date | Local calendar date completed |

## Environment Variables

Set these server-side variables in local development and deployment:

```bash
NOTION_TOKEN=secret_value_from_internal_connection
NOTION_HABITS_DATABASE_ID=habits_database_id
NOTION_COMPLETIONS_DATABASE_ID=completions_database_id
```

Do not expose these values to browser code. Do not commit `.env.local`.
