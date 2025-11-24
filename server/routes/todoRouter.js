import { Router } from "express";
import { pool } from "../helper/db.js";
import { auth } from "../helper/auth.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const { rows } = await pool.query("select * from task order by id asc");
    res.status(200).json(rows || []);
  } catch (err) { next(err); }
});

router.post("/create", auth, async (req, res, next) => {
  try {
    const { task } = req.body;
    if (!task || !task.description) {
      return res.status(400).json({ error: "Task is required" });
    }
    const { rows } = await pool.query(
      "insert into task (description) values ($1) returning *",
      [task.description]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

export { router };
