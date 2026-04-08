# Interactive Wall Calendar (Next.js)

A polished “wall calendar” style component with a hero image, a 6×7 month grid, date range selection, and a notes panel.

## Features
- **Wall calendar aesthetic**: prominent hero image + calendar grid + integrated notes.
- **Date range selection**: select start + end, with clear styling for endpoints and in-between days.
- **Notes**: dated notes (title + description + date) with day indicators.
- **Persistence**: client-side only via `localStorage` (no backend).
- **Responsive**: desktop split layout, mobile stacked layout.

## Tech Stack
- Next.js (App Router) + React + TypeScript
- Tailwind CSS
- `date-fns` for calendar/date utilities

## Running Locally
```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Tests
```bash
pnpm test
```

## Notes Persistence
All notes are stored in the browser under the `localStorage` key `wall-calendar:v1`.

## Hero Images
The hero image changes with the currently viewed month and uses nature photos downloaded from Unsplash (not the provided PDF).
