import { Job } from "./types";
import db from "./database";

export const readJobs = (): Job[] =>
  db.prepare("SELECT * FROM jobs").all() as Job[];

export const findJobById = (id: string): Job | undefined =>
  db.prepare("SELECT * FROM jobs WHERE id = ?").get(id) as Job | undefined;

export const createJob = (job: Job): void => {
  db.prepare(
    `
        INSERT INTO jobs (id, company, role, status, appliedDate, notes, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
  ).run(
    job.id,
    job.company,
    job.role,
    job.status,
    job.appliedDate,
    job.notes ?? null,
    job.createdAt,
    job.updatedAt,
  );
};

export const updateJob = (id: string, job: Partial<Job>): void => {
  // you dont want to update id, createdAt
  const immutable = ["id", "createdAt"];
  const allowedJobs = Object.keys(job).filter((k) => !immutable.includes(k));
  const query = allowedJobs.map((k) => `${k} = ?`).join(", ");
const values = [
  ...allowedJobs.map(k => (job as Record<string, unknown>)[k] ?? null),
  id
]

  db.prepare(`UPDATE jobs SET ${query} WHERE id = ?`).run(...values);
};

export const deleteJob = (id: string): void => {
  db.prepare(
    `
        DELETE FROM jobs WHERE id = ?
    `,
  ).run(id);
};
