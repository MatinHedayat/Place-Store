# Security Specification (`security_spec.md`)

## 1. Data Invariants
1. Every document in `/places/{placeId}` must have a valid document ID matching `^[a-zA-Z0-9_\-]+$` with length `<= 128`.
2. Every document in `/places/{placeId}` must belong to the shared group (`groupKey == 'friends-default'`) and strictly satisfy `isValidPlaceItem(incoming())`.
3. `title` must be a non-empty string `<= 120` chars; `locationName` `<= 160` chars; `suggestedBy` `<= 60` chars; `category` must be `'food'` or `'place'`.
4. `images` must be a bounded list (`size() <= 4`) and `ratings` must be a bounded list (`size() <= 30`).
5. `createdAt` is immutable on update (`incoming().createdAt == existing().createdAt`).
6. No shadow or undocumented fields are allowed (`hasOnly` enforced on both `create` and `update`).

## 2. The "Dirty Dozen" Payloads
1. **Shadow Field Injection**: Adding `"isAdmin": true` to `/places/item1` -> `PERMISSION_DENIED`.
2. **Oversized Title DoS**: `title` with 5,000 characters -> `PERMISSION_DENIED`.
3. **Invalid Category Enum**: `category: "flight"` -> `PERMISSION_DENIED`.
4. **Unbounded Images Array**: `images` array with 10 elements -> `PERMISSION_DENIED`.
5. **Unbounded Ratings Array**: `ratings` array with 50 elements -> `PERMISSION_DENIED`.
6. **Immutable Field Mutation**: Changing `createdAt` during an update -> `PERMISSION_DENIED`.
7. **Invalid Coordinates Type**: `lat: "35.7"` (string instead of number) -> `PERMISSION_DENIED`.
8. **Out-of-Range Average Rating**: `averageRating: 99` -> `PERMISSION_DENIED`.
9. **Wrong Group Key Scraping**: Listing documents without `groupKey == 'friends-default'` -> `PERMISSION_DENIED`.
10. **Path ID Poisoning**: Document ID with spaces or special characters -> `PERMISSION_DENIED`.
11. **Missing Required Keys**: Creating a place without `suggestedBy` -> `PERMISSION_DENIED`.
12. **Arbitrary Collection Access**: Reading or writing `/users/123` -> `PERMISSION_DENIED` via default-deny catch-all.
