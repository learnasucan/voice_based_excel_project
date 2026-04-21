# Worker F: Saved Record List

This module implements the Worker F scope as a standalone table-view experience.

## Included

- table preview of all rows
- edit row action
- delete row action with confirmation dialog
- duplicate warning when backend marks an update as duplicate
- search and duplicate filters
- totals display (filtered + overall)
- record count display
- empty/loading/error states

## Run

Open `saved-records/index.html` in a browser.

## API integration

If Worker B exposes API methods, set one of these globals before `app.js` runs:

- `window.workerBApi`
- `window.recordsApi`

Supported methods:

- list: `listRecords` or `getRecords` or `fetchRecords`
- update: `updateRecord` or `editRecord` or `saveRecord`
- delete: `deleteRecord` or `removeRecord`

If no compatible API is available, the page uses a local mock API automatically.
