# Docker-Free Teaching Edition — Change Report

> **What this document covers:** Every change made to convert this project from a PostgreSQL + Docker-dependent integration test project into a self-contained teaching edition that runs with `npm install && npm test` only.

---

## Quick Summary

| Before | After |
|--------|-------|
| Requires Docker Desktop | No Docker needed |
| Requires PostgreSQL 16 container | No database needed |
| Two databases must be created manually | No database setup |
| 6+ manual setup steps | 2 commands: `npm install` + `npm test` |
| Comments in Finnish | Comments in English |
| `pg`, `bcrypt` in dependencies | Only what is actually used |

All 4 integration tests still pass. The same routes, the same HTTP behaviour, the same JWT auth flow — just no database.

---

## Removed Components

### Files deleted

| File | Reason for removal |
|------|--------------------|
| `server/docker-compose.yml` | No Docker needed — PostgreSQL is fully replaced by in-memory store |
| `server/db.sql` | No SQL schema needed — in-memory store initialises itself |
| `server/helper/db.js` | Exported the `pg` Pool; nothing imports it any more |

### Packages removed from `package.json`

| Package | Why removed |
|---------|-------------|
| `pg` | Was the PostgreSQL client; no longer imported anywhere |
| `bcrypt` | Was listed as a dependency but never imported in any source file |

### Environment variables removed from `.env`

The following variables had no purpose after removing the database:

```
DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, TEST_DB_NAME
```

The `.env` file now contains only:

```env
JWT_SECRET=change_me
```

`NODE_ENV=test` was also removed from the `npm test` script — it was previously used in `db.js` to select the test database. With no database, the distinction is unnecessary.

---

## What Changed (File by File)

### `server/repository/todoRepository.js` — NEW FILE

Replaces all PostgreSQL logic with a plain in-memory JavaScript array.

```js
let tasks = [];
let nextId = 1;

export const getAll = () => [...tasks];
export const create = (description) => { ... };
export const reset = () => { tasks = []; nextId = 1; };
```

- `getAll()` returns a shallow copy of the array (safe to mutate externally).
- `create()` assigns an auto-incrementing numeric `id`, mirroring a database serial column.
- `reset()` wipes the array and resets the counter — called in `beforeEach()` for test isolation.

No network connection, no async database driver, no port dependency.

### `server/routes/todoRouter.js` — MODIFIED

**Before:** imported `{ pool }` from `../helper/db.js` and called `pool.query(SQL)` directly.

**After:** imports `* as todoRepo` from `../repository/todoRepository.js` and calls `todoRepo.getAll()` / `todoRepo.create()`.

The HTTP logic (status codes, req.body parsing, error forwarding) is identical. Only the data layer changed.

### `server/app.int.test.js` — MODIFIED

Three changes:

1. **Removed** the `import { pool } from "./helper/db.js"` line.
2. **Replaced** `afterAll(() => pool.end())` with `beforeEach(() => todoRepo.reset())`.
   - `afterAll`+`pool.end()` was needed to prevent Jest from hanging because the DB connection kept the process alive. With in-memory storage there is no open handle — Jest exits cleanly on its own.
   - `beforeEach`+`reset()` is added to ensure each test starts with an empty task list, preventing tests from depending on the side effects of other tests.
3. **Translated** all Finnish comments to English. Test names (strings passed to `test()`) were also translated to English.

### `server/app.js` — MODIFIED (comments only)

All Finnish comments translated to English. No functional changes.

### `server/helper/auth.js` — MODIFIED (comments only)

All Finnish comments translated to English. No functional changes. The JWT verification logic is unchanged.

### `server/jest.config.mjs` — MODIFIED (comments only)

All Finnish comments translated to English. Configuration values are identical.

### `server/package.json` — MODIFIED

- Removed `pg` and `bcrypt` from `dependencies`.
- Removed `NODE_ENV=test` from the `test` script (no longer needed).
- Cleaned up script indentation.

### `server/.env` — MODIFIED

Reduced to one line:

```env
JWT_SECRET=change_me
```

### `server/README.md` — REWRITTEN

Removed all Docker and database setup steps. Replaced with a two-command quickstart. Added a project structure table and explanation of how `npm test` works.

---

## New Architecture

```
server/
├── app.js                   Express app (middleware + routing)
├── server.js                HTTP server entry point
├── helper/
│   └── auth.js              JWT verification middleware
├── repository/
│   └── todoRepository.js    In-memory task store  ← NEW
├── routes/
│   └── todoRouter.js        Route handlers (uses repository)
├── app.int.test.js          Integration tests (Jest + Supertest)
├── jest.config.mjs          Jest config
└── package.json
```

### Data flow (after refactor)

```
Test / Client
    │
    ▼
Supertest → Express (app.js)
    │
    ▼
auth middleware (helper/auth.js)
    │
    ▼
Route handler (routes/todoRouter.js)
    │
    ▼
todoRepository.js  ← in-memory array, no network
```

---

## Updated Student Quickstart

```bash
# Clone or receive the project, then:

cd server
npm install
npm test
```

Expected output:

```
PASS ./app.int.test.js
  ✓ 1) GET / returns a list (200 + array)
  ✓ 2) POST /create without a token → 401
  ✓ 3) POST /create with a token → 201 + id
  ✓ 4) POST /create with missing data → 400

Tests: 4 passed, 4 total
```

No Docker. No database. No additional configuration.

---

## What This Version Teaches Well

| Concept | Demonstrated |
|---------|-------------|
| Supertest — testing an Express app without starting a server | Yes |
| HTTP status codes (200, 201, 400, 401) | Yes |
| JWT authentication middleware | Yes |
| `beforeEach` for test isolation | Yes |
| `expect(x).toBe()`, `toHaveProperty()`, `Array.isArray()` | Yes |
| Repository pattern (separating data access from route logic) | Yes (simple form) |
| `async`/`await` in tests | Yes |

## What This Version Intentionally Avoids

| Concept | Note |
|---------|------|
| `describe` blocks | Not used — keeps the first exposure minimal |
| `jest.mock()` / `jest.fn()` | No mocking — all code runs for real |
| Real database testing | Deliberately removed for classroom simplicity |
| Error path for repository failures | Repository cannot fail (in-memory), so 500 path is not covered |

---

## Follow-up Suggestions for Teaching

### 1. Add `describe` blocks

Show students how to group related tests and scope `beforeEach` hooks:

```js
describe("GET /", () => {
  test("returns 200 and an array", async () => { ... });
});

describe("POST /create", () => {
  beforeEach(() => todoRepo.reset());

  test("without token → 401", async () => { ... });
  test("with token → 201", async () => { ... });
  test("missing body → 400", async () => { ... });
});
```

### 2. Add a test for a seeded state

Show that `beforeEach` + `create()` can seed data before a test:

```js
test("GET / returns pre-seeded tasks", async () => {
  todoRepo.create("Pre-seeded task");

  const res = await request(app).get("/");
  expect(res.body).toHaveLength(1);
  expect(res.body[0]).toHaveProperty("description", "Pre-seeded task");
});
```

### 3. Show a deliberately failing test

Demonstrate what Jest output looks like on failure before students encounter it by accident:

```js
test.skip("EXAMPLE: this test is intentionally wrong", () => {
  expect(1 + 1).toBe(3); // Remove .skip to see the failure output
});
```

### 4. Enable test coverage

Add to `jest.config.mjs`:

```js
collectCoverage: true,
coverageDirectory: "coverage",
coverageReporters: ["text"],
collectCoverageFrom: ["routes/**/*.js", "helper/**/*.js", "repository/**/*.js"],
```

Students can see which lines are exercised by their tests without any additional tools.

### 5. Add a `test:watch` script

```json
"test:watch": "cross-env NODE_OPTIONS=--experimental-vm-modules jest --runInBand --watch"
```

Watch mode re-runs tests on every file save — very effective for live demonstrations.
