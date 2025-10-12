import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { syncDatabase } from "./models/index.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Routes (temporary test)
app.get("/", (req, res) => res.send("SecureAttend Backend Running"));

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  await syncDatabase();
  console.log(`🚀 Server running on port ${PORT}`);
});
