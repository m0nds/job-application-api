import express, { Application } from "express";
import router from "./routes";
import { errorHandler } from "./errorHandler";

const app: Application = express();

const PORT = 3000;

// 1. Register express.json() middleware
app.use(express.json());

// 2. Mount your router at /api/jobs
app.use("/api/jobs", router);

// 3. Register errorHandler middleware (Must be registered after routes)
app.use(errorHandler);

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

// 4. Listen on port 3000
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
