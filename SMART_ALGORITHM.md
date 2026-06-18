# Smart Algorithm

The local parser first detects Marathi/English numbers, rupee markers, and gift keywords.

- Cash: name + amount + optional rupee marker + place
- Gift: name + gift keyword/item + gift name
- Cash + gift: name + amount + rupee marker + gift keyword/item
- Ambiguous: low-value number words with gift-like trailing text require confirmation

Supported Marathi values include `एक`, `दोन`, `तीन`, `चार`, `पाच`, `दहा`, `वीस`, `पन्नास`, `शंभर`, `दोनशे`, `तीनशे`, `चारशे`, `पाचशे`, `हजार`, `एक हजार`, `दोन हजार`, and `पाच हजार`.

Gift keywords include `भेट`, `गिफ्ट`, `आहेर`, `वस्तू`, `सामान`, `नारळ`, `फळे`, `कपडे`, `साडी`, `भांडी`, `box`, and `gift`.
