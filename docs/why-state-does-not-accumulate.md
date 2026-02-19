# Why In-Memory State Does Not Accumulate Across `npm test` Runs

> **Context:** A teaching demo attempted to observe task accumulation across multiple `npm test` invocations by commenting out `beforeEach(todoRepo.reset())` and adding a `console.log` to `todoRepository.create()`. The expectation was that the task array would grow longer on each run. It did not. This document explains exactly why, and builds the correct mental model for teaching.

---

## What Was Tried

1. In `server/app.int.test.js`, the `beforeEach(() => todoRepo.reset())` block was commented out.
2. In `server/repository/todoRepository.js`, a `console.log("DEBUG: Current tasks:", tasks)` was added inside `create()`.
3. `npm test` was run multiple times.

**Expected:** The log would show `[ {id:1,...} ]` on run 1, `[ {id:1,...}, {id:2,...} ]` on run 2, etc.

**Actual:** Every run showed exactly one log line: `[ { id: 1, description: 'Test task' } ]`.

---

## The Root Cause: Process Lifetime

### Each `npm test` is a new OS process

When you type `npm test`, the operating system creates a **brand-new Node.js process**. You can observe this with `process.pid`:

```
Run 1:  PID 7300
Run 2:  PID 23104
```

Different PIDs — different processes. When a process exits, the operating system reclaims all memory it used. There is no way for the second run to see the heap of the first run.

### The in-memory store is process-local

`todoRepository.js` stores its state in a plain JavaScript variable:

```js
let tasks = [];   // initialized ONCE when the module is first loaded
let nextId = 1;
```

These variables live inside the process's heap. When `npm test` finishes and the process exits, they are gone. The next `npm test` starts a fresh process, loads the module again, and re-initializes `tasks = []`.

There is no persistence mechanism of any kind — no file on disk, no database, no shared memory, no network. Without one, there is simply nothing to accumulate between runs.

**In one sentence:** *In-memory means in-this-process-only-until-it-exits.*

---

## Three Levels of Isolation — The Mental Model

Understanding when state persists and when it does not requires knowing about three distinct isolation boundaries in this project:

```
┌──────────────────────────────────────────────────────┐
│  Level 1: OS Process boundary                        │
│  "Each npm test invocation"                          │
│                                                      │
│  State is ALWAYS reset. Memory is reclaimed when     │
│  the process exits. Nothing survives to the next run.│
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  Level 2: Jest file boundary                   │  │
│  │  "Each .test.js file"                          │  │
│  │                                                │  │
│  │  Jest (with --experimental-vm-modules) creates │  │
│  │  a separate VM context per test file.          │  │
│  │  Each file gets its OWN fresh import of        │  │
│  │  todoRepository.js → own tasks = [].           │  │
│  │  Side effects do NOT cross file boundaries.    │  │
│  │                                                │  │
│  │  ┌──────────────────────────────────────────┐  │  │
│  │  │  Level 3: Test case boundary             │  │  │
│  │  │  "Each test() inside one file"           │  │  │
│  │  │                                          │  │  │
│  │  │  All tests in the SAME file share ONE    │  │  │
│  │  │  module instance (ESM singleton).        │  │  │
│  │  │  Without beforeEach(reset), side effects │  │  │
│  │  │  from test 1 ARE visible in test 2.      │  │  │
│  │  │                                          │  │  │
│  │  │  This is where reset() matters.          │  │  │
│  │  └──────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

---

## Why Only One DEBUG Line Appeared Per Run

Looking at `app.int.test.js` with `beforeEach` commented out:

| Test | What it does | Does it call `create()`? |
|------|-------------|--------------------------|
| Test 1 | `GET /` | No — only reads |
| Test 2 | `POST /create` without token | No — rejected by `auth` middleware before reaching the handler |
| Test 3 | `POST /create` with valid token | **Yes** — one call to `create()` |
| Test 4 | `POST /create` with token, missing body | No — rejected by input validation before calling `create()` |

`create()` is only called **once** per run (in Test 3). This is why the DEBUG log appears exactly once per run — not because of a reset, but because only one test ever reaches that code path.

---

## What Does Persist Within a Single Run

With `--runInBand`, all tests in all files run in the same Node.js process **sequentially**. Within a single file, the ESM module cache ensures `todoRepository.js` is loaded once and shared across all tests in that file.

So within `app.int.test.js` (a single file, a single run):

```
Test 1: GET /           → getAll() returns []        (empty — nothing created yet)
Test 2: POST no-token   → create() never called      (store still [])
Test 3: POST with token → create("Test task") called → store = [{id:1,...}]
Test 4: POST bad body   → create() never called      (store still [{id:1,...}])
```

**Test 3's side effect IS visible to Test 4** — but Test 4 doesn't read the store, so it doesn't matter here. If we added a `GET /` call at the end of Test 4 (without reset), it would see 1 task.

---

## File-Level Isolation: Why `isolation.demo.test.js` Does Not Interfere with `app.int.test.js`

Jest uses the Node.js Experimental VM Modules API (enabled by `NODE_OPTIONS=--experimental-vm-modules`). Each test file is loaded into its own **VM context** with its own **module registry**. This means:

- `app.int.test.js` gets its own import of `todoRepository.js` → its own `tasks = []`
- `isolation.demo.test.js` gets its own import of `todoRepository.js` → its own `tasks = []`

They are completely separate instances. A task created in `isolation.demo.test.js` is **never** visible in `app.int.test.js`, even when both files run in the same `npm test` invocation.

This is also why `--runInBand` does not cause cross-file contamination — it only means tests run sequentially, not that they share module state.

---

## Corrected Mental Model (Summary Table)

| Scenario | Does state persist? | Why |
|----------|--------------------|----|
| Two separate `npm test` runs | **No** | Different OS processes — memory is discarded when process exits |
| Two different `.test.js` files in one run | **No** | Jest gives each file its own VM context and module registry |
| Two `test()` calls inside the **same file** | **Yes** | Same module instance (ESM singleton within one VM context) |
| After calling `todoRepo.reset()` | **No** | `reset()` explicitly clears the array and resets the counter |

---

## The Classroom Demo

The file `server/isolation.demo.test.js` provides a deterministic, repeatable demonstration of Level 3 isolation (within a single file):

**With `beforeEach(reset)` commented out:**

```
DEMO 1 — POST /create adds a task to the store       ✓ PASS
DEMO 2 — GET / returns an empty list (...)           ✗ FAIL

● DEMO 2 — GET / returns an empty list (fails without reset)

    expect(received).toHaveLength(expected)

    Expected length: 0
    Received length: 1
    Received array:  [{"id": 1, "description": "Demo task"}]
```

**With `beforeEach(reset)` enabled:**

```
DEMO 1 — POST /create adds a task to the store       ✓ PASS
DEMO 2 — GET / returns an empty list (...)           ✓ PASS
```

The key assertion in DEMO 2 is `expect(res.body).toHaveLength(0)`. Without reset, the task from DEMO 1 is still in memory when DEMO 2 runs, so the array has length 1 instead of 0 — a clear, visible failure.

### How to run the demo in class

```bash
cd server

# Step 1: confirm everything passes with reset enabled
npm test

# Step 2: open isolation.demo.test.js
# Comment out the beforeEach block (3 lines), save, run again:
npm test
# → DEMO 2 fails visibly with "Expected length: 0, Received length: 1"

# Step 3: uncomment the beforeEach block, save, run again:
npm test
# → All 6 tests pass
```

---

## What the Instrumentation Reveals

The commented-out lines at the top of `isolation.demo.test.js` can be uncommented to make these facts observable in real time:

```js
console.log("Process PID      :", process.pid);
console.log("Timestamp        :", new Date().toISOString());
console.log("Repository module:", import.meta.url);
console.log("Tasks at startup :", todoRepo.getAll());
```

When uncommented and `npm test` run twice:

```
# First run:
Process PID      : 7300
Timestamp        : 2026-02-19T10:00:00.000Z
Repository module: file:///...server/repository/todoRepository.js
Tasks at startup : []

# Second run:
Process PID      : 23104         ← different PID = different process
Timestamp        : 2026-02-19T10:00:05.000Z
Repository module: file:///...server/repository/todoRepository.js
Tasks at startup : []            ← always empty — new process, new memory
```

The PID change is the proof. The URL is always the same file — but a different process's copy of it.

---

## Files Changed in This Investigation

| File | Change |
|------|--------|
| `server/repository/todoRepository.js` | Removed `console.log("DEBUG: ...")` from `create()` |
| `server/app.int.test.js` | Re-enabled `beforeEach(() => todoRepo.reset())` |
| `server/isolation.demo.test.js` | **Created** — classroom isolation demo |
| `docs/why-state-does-not-accumulate.md` | **Created** — this document |
