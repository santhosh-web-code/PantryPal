# PantryPal

PantryPal is a shared pantry management application with separate Owner and
Member portals. A single account can sign into either portal with the same
email and password. Owners can manage multiple pantries; Members can access
multiple pantries shared with them.

The existing internal `buyer` role value and `/buyer/*` route names are retained
for compatibility. They represent the Member experience, not a separate user
type. All visible portal terminology is Owner and Member.

## Project architecture

- **Frontend:** React 18, React Router, Vite, and existing CSS components.
- **Backend:** Express, MongoDB/Mongoose, bcrypt password hashes, JWT sessions
  in HttpOnly cookies, and Google OAuth with PKCE and OIDC nonce validation.
- **Pantry access:** `Pantry.ownerId` stores the one owner; `Pantry.memberIds`
  stores actual members. The account's legacy `role` field is not used to grant
  access to a pantry.
- **Inventory:** Owners manage pantry inventory through the API. Members can
  view shared pantry inventory, add quantities, and record item usage; Members
  cannot edit item details or delete items. The Member portal no longer
  includes cart or order functionality.

See [server/README.md](./server/README.md) for backend setup, API contracts,
authorization behavior, and backup guidance.

## Run locally

Prerequisites: Node.js 18+, npm 9+, and a local MongoDB or MongoDB Atlas
connection.

1. Configure `server/.env` with `MONGO_URI`, a strong `JWT_SECRET`, and
   `CLIENT_URL=http://localhost:5173`. Configure Google OAuth values if using
   Google sign-in. Never expose server secrets through a `VITE_*` setting.
2. Start the API:

   ```powershell
   cd server
   npm install
   npm run dev
   ```

3. In another terminal, start the frontend:

   ```powershell
   cd client
   npm install
   npm run dev
   ```

The frontend is at `http://localhost:5173`; the API is at
`http://localhost:5000`. `GET /` identifies the API, while `/health` and
`/api/health` report database health. Stop either process with `Ctrl+C`.

## Portals and pantry access

- `/owner/login` and `/owner/register` are the Owner sign-in and registration
  screens.
- `/buyer/login` and `/buyer/register` are the legacy URLs for Member
  sign-in and registration.
- `/pantries` lists pantries for the authenticated portal. Owners can create
  pantries, add/remove members, transfer ownership, and delete eligible
  pantries. Members can browse pantries, request to join, and access inventory
  after an Owner approves the request.
- `/dashboard` shows only owned pantries; `/buyer/dashboard` shows only
  member pantries.

Login and registration requests include `portal: "owner"` or
`portal: "member"`. The server signs this selection into the HttpOnly session;
changing a browser-side role cannot grant access. `GET /api/auth/me` restores
the user profile and active portal after refresh. Portal switching requires
signing in through the other portal with the same account credentials.

The main API endpoints are:

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register one identity for the selected portal |
| POST | `/api/auth/login` | Sign in with email, password, and selected portal |
| GET | `/api/auth/me` | Restore identity and signed portal context |
| GET | `/api/pantries/owned` | List only pantries owned by the user |
| GET | `/api/pantries/member` | List only pantries where the user is a member |
| POST | `/api/pantries` | Create an owned pantry |
| PUT | `/api/pantries/:id` | Update a pantry as its owner |
| POST | `/api/pantries/:id/members` | Add an existing account by email |
| DELETE | `/api/pantries/:id/members/:userId` | Remove a member from this pantry |
| GET | `/api/pantries/discover` | List pantries available to the signed-in Member and their request status |
| GET | `/api/pantries/owned/join-requests` | List pending requests for the signed-in Owner's pantries |
| POST | `/api/pantries/:id/join-requests` | Request Member access to a pantry |
| GET | `/api/pantries/:id/join-requests` | List pending requests as the pantry Owner |
| PATCH | `/api/pantries/:id/join-requests/:userId` | Approve or reject a Member request |
| PATCH | `/api/pantries/:id/transfer-ownership` | Transfer ownership to an existing member |
| DELETE | `/api/pantries/:id` | Delete an owner-controlled pantry with no members |

If a pantry has members, direct deletion returns a conflict. The owner must
first explicitly transfer ownership to one of that pantry's existing members.
After transfer, the previous owner becomes a member; the pantry ID, items, and
activity history are preserved. A pantry with no members can be deleted after
confirmation, and its own inventory and activity records are cleaned up.

## Existing data and backups

No automatic destructive migration is needed or run. Existing User records,
password hashes, linked Google identities, pantry IDs, ownership/member
relationships, inventory, and activity are retained. The legacy `owner` and
`buyer` values in `User.role` remain unchanged; old JWTs without a portal claim
are accepted using their signed legacy role. Existing owner self-references in
`memberIds` are ignored as memberships rather than rewritten.

Before deploying against an existing non-test database, make a MongoDB backup
and test restoring it to a separate database. For example, in PowerShell:

```powershell
mongodump --uri "$env:MONGO_URI" --archive="pantrypal-before-multi-portal.archive.gz" --gzip
```

Keep the archive in a protected location and verify `mongodump` succeeds. The
application does not run `mongorestore`, reset passwords, delete records, or
perform a schema migration at startup.

## Google sign-in configuration

Google OAuth retains the selected portal in a short-lived HttpOnly state cookie.
`/api/auth/google/owner` starts Owner sign-in; `/api/auth/google/member` starts
Member sign-in. The old `/api/auth/google/buyer` endpoint remains an alias.
Google identities are reused across portals when linked to the same PantryPal
user. An unlinked password account is not silently linked.

Configure these server-only variables:

```text
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
CLIENT_URL=http://localhost:5173
```

In Google Cloud Console, allow `http://localhost:5173` as an authorized origin
and `http://localhost:5000/api/auth/google/callback` as an authorized redirect
URI. Never put `GOOGLE_CLIENT_SECRET` or `JWT_SECRET` in frontend configuration.

## Validation

```powershell
cd server
npm test

cd ..\client
npm run build
```

Backend tests use an isolated `mongodb-memory-server` database. Real Google
sign-in requires browser testing with valid Google OAuth configuration.
