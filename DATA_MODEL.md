# Data Model

Contribution rows support cash, gift, cash + gift, and unknown draft states.

- `entryType`: `cash`, `gift`, `cash_and_gift`, or `unknown`
- `contributionAmount`: positive number for `cash` and `cash_and_gift`; `null` for `gift` and `unknown`
- `giftNameMr`: Marathi gift name, required for `gift` and `cash_and_gift`
- `giftNameEn`: English transliteration of `giftNameMr`
- `placeMr` and `placeEn`: required for cash-only entries; optional for gift-related entries

Totals only include `contributionAmount` for `cash` and `cash_and_gift`.
