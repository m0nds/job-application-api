import "dotenv/config";
import express, { Application } from "express";
import router from "./routes";
import { errorHandler } from "./errorHandler";
import { prisma } from "./db";
import authRouter from "./auth/authRoutes";
import { authenticate } from "./auth/authMiddleware";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { requestLogger } from "./middleware/requestLogger";
import logger from "./logger";

const app: Application = express();

const PORT = process.env.PORT || 3000;

// 1. Register express.json() middleware
app.use(helmet());
app.disable("x-powered-by");
app.use(requestLogger);
app.use(express.json());
app.use(cookieParser());

// protect all job routes — authenticate runs before any job handler
app.use("/api/jobs", authenticate, router);

app.use("/api/auth", authRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 3. Register errorHandler middleware (Must be registered after routes)
app.use(errorHandler);

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled rejection");
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  logger.error({ error }, "Uncaught exception");
  process.exit(1);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// 4. Listen on port 3000
app.listen(PORT, () => {
  logger.info(`Server is running on http://localhost:${PORT}`);
});
