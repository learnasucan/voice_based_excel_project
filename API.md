# API

Create and update row payloads accept:

- `nameMr`, `nameEn`
- `entryType`
- `contributionAmount`
- `giftNameMr`, `giftNameEn`
- `placeMr`, `placeEn`

Duplicate checks include `entryType`, name, amount, gift name, and place. List and export responses include the same row fields. Totals exclude `gift` and `unknown` rows.
