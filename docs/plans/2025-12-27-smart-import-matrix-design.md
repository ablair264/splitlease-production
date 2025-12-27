# Smart Import Matrix Parser Design

## Goal
Improve Smart Import so matrix-style third-party ratebooks can be parsed into a flat header + sample rows for the existing Column Mapping modal. This is a dedicated matrix parser (separate from the standard header detector) triggered by structural signals.

## Success Criteria
- Matrix sheets are detected reliably for both XLSX and CSV.
- Output matches existing API shape: `headers`, `sampleRows`, `totalColumns`.
- Headers include fixed meta fields and dynamic term columns.
- Sample rows are derived from mileage bands and term columns.
- Vehicle identity is resolved when possible via CAP Code, CAP ID, or BLP.

## Detection
Matrix parser triggers when BOTH conditions are satisfied:
1) A row contains multiple term patterns like `1+23`, `3+35`, `6+47`.
2) Another row contains at least one matrix label such as `BASE RENTALS`, `BCH RATES`, `ADD VAT FOR PCH`.

If both are present within the first N rows (suggest N=20-30), route to matrix parser. Otherwise, use existing header extraction.

## Parsing Model
### Anchors
- **Meta row(s):** scan top N rows for identifier labels or CAP code patterns.
- **Descriptor row:** row containing vehicle description (optional, for fallback).
- **Term row:** row with multiple `n+n` term patterns.

### Headers
Synthesized headers for Column Mapping modal:
- Fixed meta: `Make`, `Model`, `Variant`, `CAP Code`, `CAP ID`, `BLP`, `OTR`, `Vehicle Description`, `Mileage`.
- Dynamic term columns from the term row, left-to-right order.

### Sample Rows
Each mileage band row becomes one sample row:
- `Mileage`: row label (first non-empty cell).
- Term columns: values from that row under each term column.
- Meta columns: filled from resolved identifiers where available.

Limit sample rows to first 5 for the modal.

## Vehicle Identification
Priority order:
1) **CAP Code**
   - Detect via regex pattern (not adjacent label). Example matches:
     - `SELE20FDA5EDTA  2`
     - `FOCT2025X1YDTM2 2  L`
     - `NIPR2030A5VDTA2 3  L`
     - `AUA6000E15HE A  8`
   - Normalize whitespace and trim trailing markers to match `vehicles.cap_code`.
2) **CAP ID**
   - Detect label/value and lookup `ogilvie_cap_mappings.cap_id` to get `cap_code`.
   - Use `cap_code` to match `vehicles.cap_code`.
3) **BLP (Basic List Price)**
   - Detect label/value (e.g., `BLP`) and match numeric value to `vehicles.basic_list_price`.
   - Exact match only.
4) **Fallback text parsing**
   - If identifiers fail, set `Vehicle Description` from descriptor row. Leave `Make/Model/Variant` blank.

If multiple CAP codes are detected, choose the one nearest the descriptor row or the densest metadata row.

## API Integration
- Add a matrix parser helper in `splitlease-api` (e.g., `src/lib/imports/matrix-ratebook.ts`).
- In `/src/routes/admin/providers.ts`, before standard extraction, call detection. If true, use the matrix parser.
- Maintain existing response shape to keep frontend unchanged.

## Testing
Add a targeted test script to validate:
- Matrix detection triggers on term row + labels.
- CAP Code regex detection works on provided examples.
- Headers contain fixed meta + dynamic term columns.
- Sample rows map term values correctly.

## Risks
- False positives on standard spreadsheets that include term-like strings.
- Ambiguous CAP Code or BLP matches; must prefer nearest metadata or fallback gracefully.
- Sparse CSVs may need wider row scan to detect labels.
