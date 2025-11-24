import request from "supertest";
import dotenv from "dotenv"; dotenv.config();
import app from "./app.js";
import { pool } from "./helper/db.js";
import jwt from "jsonwebtoken";

const getToken = (email = "student@example.com") =>
  jwt.sign({ email }, process.env.JWT_SECRET);

afterAll(async () => { await pool.end(); });

test("1) GET / palauttaa listan (200 + array)", async () => {
  const res = await request(app).get("/");
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
});

test("2) POST /create ilman tokenia → 401", async () => {
  const res = await request(app)
    .post("/create")
    .send({ task: { description: "X" } });
  expect(res.status).toBe(401);
});

test("3) POST /create tokenilla → 201 + id", async () => {
  const token = getToken();
  const res = await request(app)
    .post("/create")
    .set("Authorization", token)
    .send({ task: { description: "Test task" } });
  expect(res.status).toBe(201);
  expect(res.body).toHaveProperty("id");
});

test("4) POST /create puutteellisella syötteellä → 400", async () => {
  const token = getToken();
  const res = await request(app)
    .post("/create")
    .set("Authorization", token)
    .send({ task: null });
  expect(res.status).toBe(400);
  expect(res.body).toHaveProperty("error");
});
