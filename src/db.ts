import fs from "fs/promises";
import path from "path";
import { Job } from "./types";

const DB_PATH = path.join(__dirname, "..", "data", "jobs.json");

export const readJobs = async (): Promise<Job[]> => {

  try {
   const raw = await fs.readFile(DB_PATH, "utf8");
   return JSON.parse(raw) as Job[]
  } catch (error) {
    if((error as NodeJS.ErrnoException).code === "ENOENT") {
        return []
    }
    throw error
  }
};

export const writeJobs = async (jobs: Job[]): Promise<void> => {
    const data = JSON.stringify(jobs, null, 2);
     await fs.writeFile(DB_PATH, data, "utf8");
};

