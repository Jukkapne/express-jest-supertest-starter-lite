import express from "express";
import cors from "cors";
import { router as todoRouter } from "./routes/todoRouter.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/", todoRouter);

app.use((err, req, res, next) => {
  const status = err?.status || 500;
  res.status(status).json({ error: { message: err.message, status } });
});

export default app;
