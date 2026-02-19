import request from "supertest"; // Supertest lets us send HTTP requests directly to the Express app without starting a real server.
import dotenv from "dotenv"; // Load environment variables (needed for JWT_SECRET).
dotenv.config();
import app from "./app.js"; // The Express application under test.
import jwt from "jsonwebtoken"; // Used to generate a valid JWT token for protected-route tests.
import * as todoRepo from "./repository/todoRepository.js"; // The in-memory repository — used to reset state between tests.

/**
 * Helper: generates a valid JWT token for use in authenticated requests.
 * The token is signed with the same JWT_SECRET the server uses, so the 'auth' middleware accepts it.
 * @param {string} email - Payload value; any string works for testing purposes.
 * @returns {string} A signed JWT token string.
 */
const getToken = (email = "student@example.com") =>
  jwt.sign({ email }, process.env.JWT_SECRET);

// --- Test isolation ---

// beforeEach runs before every individual test.
// Resetting the repository ensures each test starts with an empty task list,
// so tests cannot interfere with one another.
beforeEach(() => {
  todoRepo.reset();
});

// --- Test cases ---

/**
 * Test 1: GET / (fetch all tasks)
 * Goal: verify the endpoint returns HTTP 200 and a JSON array.
 */
test("1) GET / returns a list (200 + array)", async () => {
  // Send a GET request to '/'. request(app) routes it directly through Express.
  const res = await request(app).get("/");

  // The response status code must be 200 (OK).
  expect(res.status).toBe(200);

  // The response body must be a JavaScript array.
  expect(Array.isArray(res.body)).toBe(true);
});

/**
 * Test 2: POST /create without authentication
 * Goal: verify the endpoint is protected and returns 401 Unauthorized when no token is provided.
 */
test("2) POST /create without a token → 401", async () => {
  const res = await request(app)
    .post("/create")
    .send({ task: { description: "X" } }); // Send body data — the request should still be rejected.

  // Expect 401 because the 'auth' middleware blocks unauthenticated requests.
  expect(res.status).toBe(401);
});

/**
 * Test 3: POST /create with a valid token
 * Goal: verify that a task is created successfully and the response includes an 'id' field.
 */
test("3) POST /create with a token → 201 + id", async () => {
  const token = getToken(); // Generate a valid JWT for this request.

  const res = await request(app)
    .post("/create")
    .set("Authorization", token) // Set the Authorization header — this satisfies the 'auth' middleware.
    .send({ task: { description: "Test task" } });

  // 201 Created indicates the resource was successfully added to the in-memory store.
  expect(res.status).toBe(201);

  // The returned object must have an 'id' property assigned by the repository.
  expect(res.body).toHaveProperty("id");
});

/**
 * Test 4: POST /create with a valid token but missing body data
 * Goal: verify that the server rejects the request with 400 Bad Request when the description is absent.
 */
test("4) POST /create with missing data → 400", async () => {
  const token = getToken(); // A token is required so we test input validation, not authentication.

  const res = await request(app)
    .post("/create")
    .set("Authorization", token)
    .send({ task: null }); // Send deliberately incomplete data.

  // 400 Bad Request — the validation logic in the router rejects this.
  expect(res.status).toBe(400);

  // The error response body must include an 'error' property.
  expect(res.body).toHaveProperty("error");
});
