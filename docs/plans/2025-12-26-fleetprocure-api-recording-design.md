# FleetProcure portal API recording script design

## Goal
Create a console script that opens https://www.fleetprocure.com/portal/ in a visible browser, lets the user log in manually, records only API (XHR/fetch) calls while the user navigates, and stops recording when the user presses Enter. The script must output both JSON lines and a HAR file.

## Recommended approach
Use Playwright in headful mode with request/response event listeners.

- Pros: stable headful automation, easy event hooks, manual login is straightforward.
- Cons: adds Playwright dependency if not already present.

## Architecture & flow
- Script entrypoint: `scripts/record-portal-api.mjs` (Node).
- Launch Chromium headful and navigate to the portal URL.
- Register `page.on("request")` and `page.on("response")` listeners.
- Filter by `resourceType()` ∈ {`xhr`, `fetch`}.
- Store request metadata in a Map keyed by a generated id (timestamp + counter).
- On response, compute duration, finalize record, append JSONL line, and add to HAR entries list.
- Wait for Enter via `readline` to stop recording.
- On stop, close browser and write HAR file. Keep JSONL as primary stream.

## Output format
- JSONL: one entry per completed request.
  - Fields: `id`, `ts`, `method`, `url`, `status`, `durationMs`.
- HAR: single `pages` entry and `entries` array containing only recorded API calls.
- Output directory: `data/api-recordings/` with timestamped filenames.

## Error handling
- If response has no matching request, log and skip.
- Ensure output directory exists.
- Graceful shutdown on SIGINT to still write HAR.
- If HAR writing fails, keep JSONL and print an error.

## Testing
- Smoke run: launch browser, open portal, immediately stop, verify files created.
- Optional unit test for HAR serialization helper using a sample entry.
