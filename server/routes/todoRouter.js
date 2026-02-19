import { Router } from "express"; // Import the Express Router used to define API endpoints.
import { auth } from "../helper/auth.js"; // Import the JWT authentication middleware.
import * as todoRepo from "../repository/todoRepository.js"; // Import the in-memory task repository.

const router = Router(); // Create a new router instance. All routes are attached to this object.

// --- GET / route (fetch all tasks) ---

// Handles HTTP GET requests to '/'.
// Returns the full list of tasks currently held in memory.
router.get("/", async (req, res, next) => {
  try {
    const tasks = await todoRepo.getAll();

    // Respond with HTTP 200 (OK) and the task array as JSON.
    res.status(200).json(tasks);
  } catch (err) {
    // Forward any unexpected error to Express's error-handling middleware (see app.js).
    next(err);
  }
});

// --- POST /create route (create a new task) ---

// Handles HTTP POST requests to '/create'.
// The 'auth' middleware runs first and verifies the JWT token before this handler executes.
router.post("/create", auth, async (req, res, next) => {
  try {
    // Destructure the task object from the request body.
    const { task } = req.body;

    // Input validation: task and its description field must exist.
    if (!task || !task.description) {
      // Return 400 Bad Request immediately if the required data is missing.
      return res.status(400).json({ error: "Task is required" });
    }

    // Persist the new task to the in-memory store.
    const created = await todoRepo.create(task.description);

    // Respond with HTTP 201 (Created) and the newly created task object (includes its id).
    res.status(201).json(created);
  } catch (err) {
    // Forward any unexpected error to the error-handling middleware.
    next(err);
  }
});

// --- Module export ---

export { router };
