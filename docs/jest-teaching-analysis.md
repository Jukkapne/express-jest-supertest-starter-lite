# Jest Teaching Analysis — express-jest-supertest-starter-lite

> **Document purpose:** Pedagogical analysis of this repository for teaching Jest API testing.
> **Analyzed:** February 2026
> **Repository:** `express-jest-supertest-starter-lite`

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Installation & Running Instructions (For Teaching Use)](#2-installation--running-instructions-for-teaching-use)
3. [How Tests Work](#3-how-tests-work)
4. [Weaknesses for Teaching Purposes](#4-weaknesses-for-teaching-purposes)
5. [PostgreSQL in Docker — Analysis](#5-postgresql-in-docker--analysis)
6. [Proposal: Replace PostgreSQL with Jest Mocks](#6-proposal-replace-postgresql-with-jest-mocks)
7. [Two Teaching Modes Proposal](#7-two-teaching-modes-proposal)
8. [Suggested Improvements for Teaching](#8-suggested-improvements-for-teaching)
9. [Questions for the Teacher](#9-questions-for-the-teacher)

---

## 1. Project Overview

### What kind of API is this?

A minimal **Todo REST API** with two endpoints:

| Method | Path      | Auth required | Description           |
|--------|-----------|---------------|-----------------------|
| GET    | `/`       | No            | Returns all tasks     |
| POST   | `/create` | Yes (JWT)     | Creates a new task    |

The database has a single table:

```sql
create table task (
  id serial primary key,
  description varchar(255) not null
);
```

### What stack is used?

| Layer         | Technology                          |
|---------------|-------------------------------------|
| Runtime       | Node.js (ES Modules, `"type": "module"`) |
| Framework     | Express 4                           |
| Database      | PostgreSQL 16 (via `pg` Pool)       |
| Auth          | JWT (`jsonwebtoken`)                |
| Password hash | `bcrypt` (imported, not yet used in routes) |
| Env config    | `dotenv`                            |
| Test runner   | Jest 29                             |
| HTTP testing  | Supertest 7                         |
| Cross-platform scripts | `cross-env`              |

### What is being tested?

Four integration tests in `server/app.int.test.js`:

1. `GET /` returns HTTP 200 and a JSON array.
2. `POST /create` without a JWT token returns HTTP 401.
3. `POST /create` with a valid JWT token returns HTTP 201 and the created object (with `id`).
4. `POST /create` with a valid token but missing body returns HTTP 400.

All four tests exercise the **full stack**: HTTP request → Express middleware → route handler → real PostgreSQL database.

---

## 2. Installation & Running Instructions (For Teaching Use)

> **Audience:** A teacher or student setting up the project from scratch.
> All commands are run in a **Unix-style shell** (bash/zsh on Mac/Linux, Git Bash or WSL on Windows).

### Prerequisites

- Node.js 18+ installed
- Docker Desktop installed and running
- Git (to clone the repo)

### Step-by-step setup order

#### Step 1 — Install dependencies

```bash
# Navigate to the server directory (where package.json lives)
cd server

npm install
```

> **Note:** There is a `package-lock.json` at the repository root, but it is empty. The real `package-lock.json` is inside `server/`. Always run `npm install` from `server/`.

#### Step 2 — Set up environment variables

The repository already contains a committed `server/.env` file with these values:

```env
DB_HOST=127.0.0.1
DB_PORT=15432
DB_USER=app
DB_PASSWORD=postgres
DB_NAME=todo
TEST_DB_NAME=test_todo
JWT_SECRET=change_me
```

> **Warning:** The `.env` file is committed to the repository despite being listed in `.gitignore`. This is convenient for teaching but is a **security anti-pattern** in real projects. Always point this out to students.
>
> **Note:** There is no `.env.example` file even though the README mentions copying one. The `.env` file itself serves as the example.

#### Step 3 — Start PostgreSQL with Docker

```bash
# Run from the server/ directory (where docker-compose.yml lives)
cd server

docker compose up -d
```

This starts PostgreSQL 16 in a container:
- Container name: `pg`
- Host port: `15432` (mapped from container's `5432`)
- Database created automatically: `todo`
- Username: `postgres` / Password: `postgres`

> **Important:** The compose file only creates the `todo` database. The test database (`test_todo`) **must be created manually** (see Step 4).

Verify Docker is running:

```bash
docker ps
# Should show container named "pg"
```

#### Step 4 — Create both databases and run the schema

Connect to the running PostgreSQL container and set up the databases:

```bash
# Open a psql session inside the container
docker exec -it pg psql -U postgres
```

Inside `psql`, run:

```sql
-- Create the app user that .env references
CREATE USER app WITH PASSWORD 'postgres';

-- Create the test database (todo already exists from compose)
CREATE DATABASE test_todo;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE todo TO app;
GRANT ALL PRIVILEGES ON DATABASE test_todo TO app;

\q
```

Now apply the schema to **both** databases:

```bash
# Apply to the development database
docker exec -i pg psql -U postgres -d todo < server/db.sql

# Apply to the test database
docker exec -i pg psql -U postgres -d test_todo < server/db.sql
```

The `db.sql` file creates the `task` table and inserts two seed rows:

```sql
drop table if exists task;
create table task (
  id serial primary key,
  description varchar(255) not null
);
insert into task (description) values
  ('Complete the project documentation'),
  ('Review the code changes');
```

#### Step 5 — Start the development server (optional for testing)

```bash
# From server/ directory
npm run dev
# Server starts on http://localhost:3001
```

> **Note:** Running the server is **not required** to run Jest tests. Supertest starts the Express app internally without binding a port.

#### Step 6 — Run the tests

```bash
# From server/ directory
npm test
```

This runs:

```
cross-env NODE_ENV=test NODE_OPTIONS=--experimental-vm-modules jest --runInBand
```

Expected output:

```
 PASS  server/app.int.test.js
  ✓ 1) GET / palauttaa listan (200 + array)
  ✓ 2) POST /create ilman tokenia → 401
  ✓ 3) POST /create tokenilla → 201 + id
  ✓ 4) POST /create puutteellisella syötteellä → 400

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
```

### Classroom setup checklist

```
[ ] Node.js 18+ installed
[ ] Docker Desktop running
[ ] cd server && npm install
[ ] docker compose up -d
[ ] Create test_todo database manually
[ ] Apply db.sql to both databases
[ ] npm test → 4 tests passing
```

---

## 3. How Tests Work

### Test type: Integration tests

All four tests are **integration tests**. They test the entire application stack end to end:

```
Test → Supertest → Express app → Middleware → Route handler → PostgreSQL
```

There is no mocking, no stubbing, and no isolation of individual functions.

### Supertest usage

Supertest is used to make HTTP requests directly against the Express `app` object without starting a real HTTP server:

```js
import request from "supertest";
import app from "./app.js";

const res = await request(app).get("/");
```

Supertest wraps the app, binds a temporary port internally, makes the request, and resolves the promise with the response — all in-memory. The server never needs to be started separately.

### Real database dependency

Test 1 (`GET /`) and Test 3 (`POST /create`) both query PostgreSQL. When `NODE_ENV=test`, the `db.js` helper connects to `TEST_DB_NAME` (`test_todo`) instead of `DB_NAME` (`todo`):

```js
database: env === "test" ? process.env.TEST_DB_NAME : process.env.DB_NAME,
```

This is a simple but functional environment-based routing strategy.

### JWT token generation in tests

Test 2, 3, and 4 involve the `auth` middleware. A helper function in the test file generates real JWT tokens signed with the same `JWT_SECRET` from `.env`:

```js
const getToken = (email = "student@example.com") =>
  jwt.sign({ email }, process.env.JWT_SECRET);
```

This is not a mock — it generates a real, cryptographically valid token.

### Data lifecycle: No cleanup

Test 3 inserts a real row into the `test_todo` database. There is **no cleanup** (`afterEach`, `afterAll` truncation, or transaction rollback). Each test run leaves an additional row in the database. Tests are not idempotent.

### Lifecycle hooks used

| Hook       | Used? | Purpose                                      |
|------------|-------|----------------------------------------------|
| `beforeAll`| No    | —                                            |
| `beforeEach`| No   | —                                            |
| `afterEach` | No   | —                                            |
| `afterAll` | Yes   | Closes the PostgreSQL pool so Jest can exit  |

### Test organization

All four tests use flat `test()` calls with no `describe()` grouping. Jest's organizational features (`describe`, nested describes) are not demonstrated.

---

## 4. Weaknesses for Teaching Purposes

This is a critical evaluation from a **teaching** perspective only — not a production code review.

### W1 — Docker and PostgreSQL are a fragile dependency

The tests **cannot run at all** without a running PostgreSQL instance. Docker adds a layer of complexity that has nothing to do with Jest. In classroom environments, this regularly causes setup failures before a single test is even seen.

### W2 — Two databases must be created manually

The `docker-compose.yml` creates only the `todo` database. Students must manually create `test_todo`, grant privileges, and apply the schema — steps that are easy to miss and not automated.

### W3 — No test data cleanup (non-idempotent tests)

Test 3 inserts a row without cleaning it up. Running `npm test` twice leaves two "Test task" rows. Running it ten times leaves ten rows. Over time this pollutes the test database. `beforeEach`/`afterEach` cleanup or transaction isolation is never shown.

### W4 — No `describe` blocks

All tests are flat `test()` calls. Students never see how `describe` is used to group related tests, create nested test suites, or scope `beforeEach`/`afterEach` hooks.

### W5 — No mocking demonstrated

There is no use of:
- `jest.mock()` to mock a module
- `jest.fn()` to create a spy/stub
- `jest.spyOn()` to observe a function
- Manual mock files (`__mocks__/`)

For many students, mocking is the hardest concept in Jest. This project doesn't introduce it at all.

### W6 — No service layer (business logic tightly coupled to route handlers)

The database query (`pool.query(...)`) is called directly inside the route handler. There is no separation between HTTP handling and business/data logic. This makes it impossible to unit-test the logic without going through HTTP and hitting a database.

### W7 — `bcrypt` is imported but not used

`bcrypt` appears in `package.json` dependencies but is never imported in any route file. This is confusing — it implies a login/register route should exist but doesn't. It raises the question: "where does the token come from?" in a real scenario.

### W8 — JWT generation in tests is not explained as a workaround

The test file generates a real JWT token using the same secret. For beginners, it is not obvious why this is necessary, that this is a workaround for not having a login endpoint in the tests, or what alternative approaches exist (mocking the middleware entirely).

### W9 — ESM + experimental vm modules adds setup complexity

The combination of `"type": "module"`, `.mjs` config, and `NODE_OPTIONS=--experimental-vm-modules` is an advanced Node.js topic. Beginners spend time debugging ESM-specific errors instead of learning Jest. A CommonJS-based project would be simpler for first-time learners.

### W10 — No failing test examples

There are no examples of:
- A test that is intentionally made to fail
- A test for a rejected Promise
- A test for error handling paths

Students never see what a failing test looks like before they write one themselves.

### W11 — The `.env` file is committed but gitignored

The `.gitignore` says `.env` should be ignored, yet `server/.env` is committed. There is also no `.env.example` file despite the README mentioning it. This is inconsistent and teaches bad habits.

### W12 — No test coverage configuration

`jest.config.mjs` has no `collectCoverage` or `coverageDirectory` settings. A `coverage/` folder exists in the repository (suggesting coverage was run manually), but it is not wired into the `npm test` script.

---

## 5. PostgreSQL in Docker — Analysis

### Why Docker makes teaching harder

Docker is a valid production tool, but for a Jest beginner course it introduces **three problems before any testing is taught**:

1. **Installation friction:** Docker Desktop must be installed, licensed (Docker Desktop requires a paid subscription for organizations over 250 employees), and running. On Windows, WSL 2 must be configured correctly.

2. **Port conflict fragility:** The compose file maps to port `15432`. If any student already has something on that port (another Postgres, another project), the container fails to start silently.

3. **State management confusion:** The Docker volume (`pgdata`) persists data between sessions. Students who run `docker compose down -v` lose the database they just created. Students who never run `down` accumulate stale data across sessions.

### What can break in classroom environments

| Problem | Symptom | Root cause |
|---------|---------|------------|
| Docker not running | `ECONNREFUSED 127.0.0.1:15432` | Docker Desktop not started |
| Port already in use | Container exits immediately | Another process on 15432 |
| `test_todo` not created | `database "test_todo" does not exist` | Manual step not done |
| Schema not applied | `relation "task" does not exist` | `db.sql` not run against test DB |
| Wrong DB user | `password authentication failed for user "app"` | `app` user not created in postgres |
| Volume from old state | Tests pass/fail inconsistently | Leftover rows from previous runs |

### What students typically struggle with

- Understanding why there are two databases (`todo` and `test_todo`)
- Understanding the `NODE_ENV=test` switch in `db.js`
- Forgetting to run `db.sql` against `test_todo` specifically
- Not knowing how to connect to the Docker container to run SQL manually
- Confusion between the Docker postgres credentials (`POSTGRES_USER: postgres`) and the app credentials (`DB_USER=app`)

---

## 6. Proposal: Replace PostgreSQL with Jest Mocks

This section proposes a concrete refactor to make tests runnable **without Docker and without PostgreSQL**.

### Core idea: Introduce a repository layer

Currently, route handlers call `pool.query()` directly. The fix is to extract database calls into a separate module (a "repository"), then mock that module in tests.

```
Before: Route → pool.query() directly
After:  Route → todoRepository.getAll() → pool.query()
                          ↑
               In tests: mock this layer
```

### Step 1 — Create a repository module

**New file: `server/repository/todoRepository.js`**

```js
import { pool } from "../helper/db.js";

export const getAll = async () => {
  const { rows } = await pool.query("select * from task order by id asc");
  return rows;
};

export const create = async (description) => {
  const { rows } = await pool.query(
    "insert into task (description) values ($1) returning *",
    [description]
  );
  return rows[0];
};
```

### Step 2 — Update the route to use the repository

**Modified file: `server/routes/todoRouter.js`**

```js
import { Router } from "express";
import { auth } from "../helper/auth.js";
import * as todoRepo from "../repository/todoRepository.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const tasks = await todoRepo.getAll();
    res.status(200).json(tasks);
  } catch (err) {
    next(err);
  }
});

router.post("/create", auth, async (req, res, next) => {
  try {
    const { task } = req.body;
    if (!task || !task.description) {
      return res.status(400).json({ error: "Task is required" });
    }
    const created = await todoRepo.create(task.description);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

export { router };
```

### Step 3 — Create a mocked test file

**New file: `server/app.unit.test.js`**

```js
import request from "supertest";
import dotenv from "dotenv";
dotenv.config();
import app from "./app.js";
import jwt from "jsonwebtoken";

// Mock the entire repository module.
// Jest replaces all exported functions with jest.fn() stubs.
jest.mock("./repository/todoRepository.js");

// Import the mocked module so we can configure its behavior.
import * as todoRepo from "./repository/todoRepository.js";

const getToken = (email = "student@example.com") =>
  jwt.sign({ email }, process.env.JWT_SECRET);

// Reset all mocks before each test to avoid state leaking between tests.
beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /", () => {
  it("returns 200 and an array of tasks", async () => {
    // Arrange: tell the mock what to return
    todoRepo.getAll.mockResolvedValue([
      { id: 1, description: "Mock task 1" },
      { id: 2, description: "Mock task 2" },
    ]);

    // Act
    const res = await request(app).get("/");

    // Assert
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
    expect(todoRepo.getAll).toHaveBeenCalledTimes(1);
  });

  it("returns 500 when the database throws", async () => {
    // Arrange: simulate a database failure
    todoRepo.getAll.mockRejectedValue(new Error("DB connection lost"));

    // Act
    const res = await request(app).get("/");

    // Assert
    expect(res.status).toBe(500);
  });
});

describe("POST /create", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app)
      .post("/create")
      .send({ task: { description: "X" } });

    expect(res.status).toBe(401);
    // The repository should never be called if auth fails
    expect(todoRepo.create).not.toHaveBeenCalled();
  });

  it("returns 201 and the created task with a valid token", async () => {
    todoRepo.create.mockResolvedValue({ id: 99, description: "Test task" });

    const res = await request(app)
      .post("/create")
      .set("Authorization", getToken())
      .send({ task: { description: "Test task" } });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id", 99);
    expect(todoRepo.create).toHaveBeenCalledWith("Test task");
  });

  it("returns 400 when description is missing", async () => {
    const res = await request(app)
      .post("/create")
      .set("Authorization", getToken())
      .send({ task: null });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
    expect(todoRepo.create).not.toHaveBeenCalled();
  });
});
```

### Step 4 — Pure unit test for the repository layer

**New file: `server/repository/todoRepository.test.js`**

```js
import { pool } from "../helper/db.js";
import { getAll, create } from "./todoRepository.js";

// Mock only the pool, not the whole repository
jest.mock("../helper/db.js", () => ({
  pool: {
    query: jest.fn(),
  },
}));

describe("todoRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAll()", () => {
    it("returns rows from the database", async () => {
      pool.query.mockResolvedValue({
        rows: [{ id: 1, description: "Task A" }],
      });

      const result = await getAll();

      expect(pool.query).toHaveBeenCalledWith(
        "select * from task order by id asc"
      );
      expect(result).toEqual([{ id: 1, description: "Task A" }]);
    });
  });

  describe("create()", () => {
    it("inserts a row and returns the created task", async () => {
      pool.query.mockResolvedValue({
        rows: [{ id: 5, description: "New task" }],
      });

      const result = await create("New task");

      expect(pool.query).toHaveBeenCalledWith(
        "insert into task (description) values ($1) returning *",
        ["New task"]
      );
      expect(result).toEqual({ id: 5, description: "New task" });
    });

    it("propagates database errors", async () => {
      pool.query.mockRejectedValue(new Error("unique constraint violated"));

      await expect(create("Duplicate")).rejects.toThrow(
        "unique constraint violated"
      );
    });
  });
});
```

### Summary of changes required

| File | Change |
|------|--------|
| `server/repository/todoRepository.js` | **Create new** — extract all `pool.query` calls here |
| `server/routes/todoRouter.js` | **Modify** — import from repository instead of calling `pool` directly |
| `server/helper/db.js` | **No change** — still used in production and integration tests |
| `server/app.int.test.js` | **No change** — keep as-is for integration mode |
| `server/app.unit.test.js` | **Create new** — mock-based tests, no DB needed |
| `server/repository/todoRepository.test.js` | **Create new** — pure unit tests for data layer |

### Minimal architecture for teaching version

```
server/
├── app.js                          # Express app (unchanged)
├── server.js                       # Entry point (unchanged)
├── helper/
│   ├── db.js                       # Pool (unchanged)
│   └── auth.js                     # JWT middleware (unchanged)
├── repository/
│   └── todoRepository.js           # NEW: all SQL calls isolated here
├── routes/
│   └── todoRouter.js               # MODIFIED: uses repository, not pool
├── app.int.test.js                 # KEEP: real DB integration tests
├── app.unit.test.js                # NEW: mocked tests, no DB needed
└── repository/
    └── todoRepository.test.js      # NEW: unit tests for data layer
```

---

## 7. Two Teaching Modes Proposal

### Mode A — "Real DB Integration Mode"

**Goal:** Students see the full stack working together with a real database.

**When to use:** When teaching what integration testing means, or when students already know Docker/DB setup.

**Files used:** `app.int.test.js` (existing file, unchanged)

**Setup required:**
- Docker Desktop running
- `docker compose up -d`
- `test_todo` database created and schema applied

**Run:**
```bash
npm test
```

**What students learn:**
- How Supertest sends requests to Express
- How `NODE_ENV=test` selects a test database
- How `afterAll` cleans up the DB pool
- What a real API test looks like end to end

---

### Mode B — "Mocked Fast Teaching Mode"

**Goal:** Students learn Jest mocking concepts without any infrastructure setup.

**When to use:** When teaching Jest concepts (mocks, spies, lifecycle hooks), when Docker is not available, or when time is limited.

**Files used:** `app.unit.test.js` + `repository/todoRepository.test.js` (from Section 6)

**Setup required:**
- `npm install` only
- No Docker, no PostgreSQL, no `.env` for DB (only `JWT_SECRET` needed)

**Run:**
```bash
# You can scope to only unit tests
npx jest --testPathPattern="unit"
```

**What students learn:**
- `jest.mock()` to replace a module
- `mockResolvedValue` / `mockRejectedValue`
- `jest.clearAllMocks()` in `beforeEach`
- `toHaveBeenCalledWith()` assertions
- `describe` blocks to organize tests
- Testing error paths without causing real errors

---

### How to switch between modes

Add two separate scripts in `package.json`:

```json
"scripts": {
  "dev": "NODE_ENV=development node server.js",
  "test": "cross-env NODE_ENV=test NODE_OPTIONS=--experimental-vm-modules jest --runInBand",
  "test:unit": "cross-env NODE_OPTIONS=--experimental-vm-modules jest --runInBand --testPathPattern=unit",
  "test:integration": "cross-env NODE_ENV=test NODE_OPTIONS=--experimental-vm-modules jest --runInBand --testPathPattern=int"
}
```

| Command | Mode | DB needed? |
|---------|------|-----------|
| `npm run test:unit` | Mode B (mocked) | No |
| `npm run test:integration` | Mode A (real DB) | Yes — Docker must be running |
| `npm test` | Both | Yes |

---

## 8. Suggested Improvements for Teaching

### I1 — Add a failing test example

Show students what a failing test looks like _before_ they accidentally write one:

```js
// This test is intentionally wrong — see what Jest output looks like
test("EXAMPLE: this test will fail", () => {
  expect(1 + 1).toBe(3); // intentional failure
});
```

Mark it with a comment and skip it with `test.skip(...)` after showing it in class.

### I2 — Add a `describe` block to organize existing tests

Wrap the existing four tests in a describe block to demonstrate grouping:

```js
describe("Todo API", () => {
  describe("GET /", () => {
    test("returns 200 and an array", async () => { ... });
  });

  describe("POST /create", () => {
    test("without token → 401", async () => { ... });
    test("with valid token → 201", async () => { ... });
    test("missing body → 400", async () => { ... });
  });
});
```

### I3 — Add `beforeEach` / `afterEach` to clean the test database

Currently test 3 leaves rows in the database. Add cleanup:

```js
beforeEach(async () => {
  await pool.query("delete from task");
});
```

This teaches lifecycle hooks and makes tests idempotent.

### I4 — Add an example of a mocked rejected Promise

```js
it("returns 500 when the database throws an error", async () => {
  todoRepo.getAll.mockRejectedValue(new Error("Connection refused"));
  const res = await request(app).get("/");
  expect(res.status).toBe(500);
});
```

This is one of the most useful patterns for teaching error path coverage.

### I5 — Add a `jest.spyOn` example

Show the difference between replacing a function (`jest.fn()`) and observing it (`jest.spyOn()`):

```js
import * as authHelper from "./helper/auth.js";

it("calls jwt.verify once per request", async () => {
  const spy = jest.spyOn(jwt, "verify");
  await request(app).get("/");
  // GET / doesn't use auth, so verify should NOT have been called
  expect(spy).not.toHaveBeenCalled();
});
```

### I6 — Enable test coverage reporting

Add coverage to `jest.config.mjs`:

```js
export default {
  testEnvironment: "node",
  transform: {},
  testMatch: ["**/*.test.js"],
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  collectCoverageFrom: [
    "routes/**/*.js",
    "helper/**/*.js",
    "repository/**/*.js",
  ],
};
```

And add a coverage script:

```json
"test:coverage": "cross-env NODE_ENV=test NODE_OPTIONS=--experimental-vm-modules jest --runInBand --coverage"
```

### I7 — Add a `.env.example` file

Create `server/.env.example` and track it in git, then add `server/.env` to `.gitignore` properly:

```env
# Copy this file to .env and fill in your values
DB_HOST=127.0.0.1
DB_PORT=15432
DB_USER=app
DB_PASSWORD=postgres
DB_NAME=todo
TEST_DB_NAME=test_todo
JWT_SECRET=change_me_to_a_random_secret
```

### I8 — Add a `docker-compose` health check and `db.sql` auto-init

Avoid the manual step of running `db.sql` by using PostgreSQL's init directory:

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./db.sql:/docker-entrypoint-initdb.d/01-init.sql  # auto-runs on first start
```

This eliminates the most error-prone manual step for students.

### I9 — Add a real login endpoint

Currently `bcrypt` is a dependency but is never used. Either remove it from `package.json` or add a `/login` endpoint. Without it, students are confused about where JWT tokens come from in a real application.

---

## 9. Questions for the Teacher

The following questions would help refine this project for your specific teaching context.

**About students:**
1. What is the students' prior experience? Have they written any tests before (in any language)?
2. Do students know JavaScript async/await well, or is that still being learned?
3. Do students have prior experience with Node.js and Express before this course?

**About infrastructure:**
4. Is Docker Desktop available on student machines? Is it on lab computers?
5. Are there corporate/school network restrictions that could prevent Docker from pulling images?
6. Are students on Windows, Mac, or Linux? (Windows has more ESM and Docker-WSL friction)

**About course goals:**
7. Is the primary goal to teach **unit testing** (mocking, isolation) or **integration testing** (real stack, real DB)?
8. Is this a standalone Jest lesson, or part of a larger full-stack course?
9. Is the Todo API just scaffolding, or is understanding the API itself also a learning objective?
10. Should students write new tests from scratch, or are they analyzing and extending existing ones?

**About time and scope:**
11. How many class hours are dedicated to testing?
12. Is test coverage reporting (`--coverage`) part of the expected output?

**About assessment:**
13. Is there an assignment where students must write their own tests?
14. Should the project be expanded (more routes, more entities) or kept minimal?

**About CI/CD:**
15. Is GitHub Actions or any CI pipeline involved? If so, Docker-in-CI requires additional configuration.
16. Should the "mocked" tests be the ones that run in CI (fast, no infra), with integration tests run only locally?

---

*End of analysis.*
