# PantryPal inventory API

This module provides cookie-based JWT authentication, Google OAuth, multi-pantry ownership and membership, inventory storage, and activity history. The legacy `buyer` role value and `/google/buyer` route remain accepted for compatibility; the user-facing portal is called Member.

## Setup

Use Node.js 18 or newer. From this directory:

```powershell
npm install
Copy-Item .env.example .env
# Set MONGO_URI in .env to a local MongoDB or MongoDB Atlas database.
npm run dev
```

`npm start` runs the same API without file watching. The process connects to MongoDB before listening. `GET /api/health` returns `{"status":"ok"}` after startup. The checked-in `.env.example` contains placeholders only. Configure `CLIENT_URL`, `JWT_SECRET`, and Google OAuth values before enabling Google sign-in.

Run the backend tests with `npm test`; tests use `mongodb-memory-server`, not a production database.

## Authentication and pantry API

`POST /api/auth/register` accepts `{ name, email, password, portal }`, where
`portal` is `owner` or `member`. The legacy `role: "owner" | "buyer"` input is
also accepted. `POST /api/auth/login` accepts `{ email, password, portal }`.
Both flows use the globally unique User identity, set an HttpOnly
`pantrypal-token` cookie, and return `{ user, portal }`. The `portal` value is
inside the signed JWT; the legacy user `role` field is preserved but is not used
to authorize pantry operations. Owner registration creates an initial pantry;
member registration creates only the user. Re-registering an existing email
returns `409 EMAIL_IN_USE` and does not create another user. `GET /api/auth/me`
restores both the profile and active portal. `POST /api/auth/logout` clears the
cookie.

`GET /api/auth/google/owner` and `GET /api/auth/google/member` establish the
selected portal; the legacy `/api/auth/google/buyer` route remains an alias.
The portal is protected in the HttpOnly OAuth state cookie. The flow uses PKCE
and an OIDC nonce, and verifies the Google ID token, audience, issuer,
expiration, and verified email. A linked Google identity is reused in either
portal and never changes the user's global role. A Google address matching an
unlinked password account is not silently linked.

Required Google environment variables are `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, and `GOOGLE_CALLBACK_URL`. Never expose the client secret
or `JWT_SECRET` to the browser. See the repository
[Google sign-in setup](../README.md#google-sign-in).

- `GET /api/pantries` returns a list filtered by the signed-in portal.
- `GET /api/pantries/owned` and `GET /api/pantries/member` explicitly return
  owned and member-only lists, respectively.
- `POST /api/pantries` with `{ "name": "Kitchen", "description": "" }` creates
  another pantry owned by the active Owner; it does not change memberships.
- `GET /api/pantries/:id`, `PUT /api/pantries/:id`, and `DELETE /api/pantries/:id`
  enforce the active portal and actual per-pantry relationship.
- `GET /api/pantries/:id/members`, `POST /api/pantries/:id/members` with
  `{ "email": "member@example.com" }`, and
  `DELETE /api/pantries/:id/members/:userId` manage existing registered members.
- Members can discover pantries with `GET /api/pantries/discover` and send a
  request with `POST /api/pantries/:id/join-requests`. Requests do not grant
  pantry or inventory access until approved by its Owner.
- Owners can review pending requests with
  `GET /api/pantries/:id/join-requests` and resolve one using
  `PATCH /api/pantries/:id/join-requests/:userId` with
  `{ "action": "approve" }` or `{ "action": "reject" }`.
  `GET /api/pantries/owned/join-requests` returns all pending requests across
  the Owner's pantries for the My Pantries cards.
- `PATCH /api/pantries/:id/transfer-ownership` with
  `{ "newOwnerId": "<existing-member-id>" }` changes the owner while preserving
  the pantry ID, items, activity, and all other memberships. The former owner
  becomes a member.
- `GET /api/pantries/:id/activity` is available only through a valid pantry
  relationship in the current portal.

Pantry ownership (`ownerId`) is distinct from membership (`memberIds`). Existing
owner self-references in `memberIds` are ignored for member lists and member
counts. The owner is not automatically a member. Inventory authorization checks
the signed active portal and the corresponding relationship on every request.
Owners can create, edit, adjust, and delete inventory items in their pantries.
Members can read items in their member pantries and make positive or negative
non-zero `changeAmount` adjustments; negative adjustments record usage and are
rejected if they would make stock negative. Members cannot create items, change
item details, or delete items. Stock changes are recorded in
`InventoryActivity` after a successful atomic update.

### Existing database compatibility and backup

No automatic destructive migration is required or run. Existing User documents,
password hashes, Google IDs, pantry IDs, owner IDs, member IDs, inventory items,
and activity records are retained. The legacy `User.role` enum (`owner`/`buyer`)
and buyer route aliases remain in place. Old JWTs without a portal claim are
accepted using their signed legacy role; signing in again issues a portal-aware
session. Existing pantry self-membership entries are logically ignored, not
rewritten.

Before deploying against a non-test database, take and verify a MongoDB backup.
For example, from PowerShell with a configured `MONGO_URI`:

```powershell
mongodump --uri "$env:MONGO_URI" --archive="pantrypal-before-multi-portal.archive.gz" --gzip
```

Keep the archive in a protected location, confirm `mongodump` exits successfully,
and test restoration to a separate database before production rollout. No
`mongorestore`, schema rewrite, or account migration is performed by application
startup.

## Inventory API contract

All successful responses are JSON. Errors use `{ "error": { "code": "...", "message": "..." } }`. Item responses contain the frontend-aligned fields `id`, `pantryId`, `name`, `category`, `quantity`, `unit`, `expiryDate` (`YYYY-MM-DD` or empty string), `lowStockThreshold`, optional `image`, `createdBy`, `createdAt`, `updatedAt`, and derived `isLowStock` (`quantity <= lowStockThreshold`).

### List pantry items

`GET /api/pantries/:pantryId/items?search=rice&category=Grains`

Returns `{ "items": [...] }`, scoped to the path pantry. `search` is a case-insensitive literal substring of name; `category` is an exact match. Both filters are optional.

### Create item

`POST /api/pantries/:pantryId/items`

```json
{
  "name": "Basmati Rice",
  "category": "Grains",
  "quantity": 5,
  "unit": "kg",
  "expiryDate": "2027-05-01",
  "lowStockThreshold": 2,
  "image": "https://example.test/rice.jpg"
}
```

`name`, `quantity`, `unit`, and `lowStockThreshold` are required. Quantity and threshold must be finite, non-negative JSON numbers. `expiryDate` is optional, and if supplied must be a real `YYYY-MM-DD` date (empty string clears it). The server takes `createdBy` from authenticated identity; clients cannot set it. Returns `201 { "item": ... }`.

### Edit details or adjust stock

`PATCH /api/items/:id` accepts any subset of `name`, `category`, `unit`, `expiryDate`, `lowStockThreshold`, and `image` to edit details. Blank names/units and negative or non-numeric thresholds are rejected.

Stock is adjusted only by a signed delta. The server computes `new quantity = current quantity + changeAmount` atomically. Never send an absolute `quantity` field.

```json
{ "changeAmount": -2, "note": "Used for dinner" }
```

`changeAmount` must be a finite, non-zero JSON number. A result below zero returns `409 INSUFFICIENT_STOCK` without changing the item. Reaching zero is allowed and does not delete the item. Successful adjustment returns `{ "item": ..., "activityRecorded": false }` until the activity hook is connected. When configured, the response reports `activityRecorded: true` after it accepts the record.

### Delete

`DELETE /api/items/:id` returns `{ "message": "Inventory item deleted", "id": "..." }`. Missing items return 404; malformed IDs return 400.

## Implementation notes

- `createApp()` defaults to unavailable authentication/authorization for tests or standalone embedding; the runnable server injects the real cookie/JWT authentication and pantry authorization.
- Quantity adjustment uses a single conditional `findOneAndUpdate` with `$inc` and a sufficient-stock predicate, preventing two competing decrements from driving stock negative or overwriting a newer quantity.
- `isLowStock` is serialized by the API using the inclusive threshold rule.
- Ownership transfer is one atomic Pantry document update. It verifies an active existing member, makes that user the owner, removes the new owner from `memberIds`, and adds the previous owner as a member.
- Pantry deletion first atomically removes the owner-controlled pantry only when it has no members, then removes only that pantry's items and activity. If cleanup fails, the server attempts to restore the pantry and its saved child records and reports rollback failures explicitly.
- Owner inventory and Member Inventory Items load selected pantry items through
  the API. The Member portal has no cart or order workflow.
