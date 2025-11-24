import pkg from "pg";
import dotenv from "dotenv";
dotenv.config();
const { Pool } = pkg;
const env = process.env.NODE_ENV || "development";
export const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: env === "test" ? process.env.TEST_DB_NAME : process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT || 5432)
});
