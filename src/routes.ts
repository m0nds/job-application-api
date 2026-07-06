import { Router } from "express";
import { readJobs, findJobById, createJob, updateJob, deleteJob } from "./db"
import { validateCreateJob, validateUpdateJob } from "./validation";
import { AppError, asyncHandler } from "./errorHandler";
import { v4 as uuidv4 } from "uuid";


const router = Router();

// GET / - return all jobs

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const jobs = readJobs();
    let result = jobs;

    const statusQuery = req.query.status;
    if (typeof statusQuery === "string") {
      result = result.filter((job) => job.status === statusQuery);
    }
    const companyQuery = req.query.company;
    if (typeof companyQuery === "string") {
      result = result.filter((job) =>
        job.company.toLowerCase().includes(companyQuery.toLowerCase()),
      );
    }

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const offset = (page - 1) * limit;
    const paginated = result.slice(offset, offset + limit);

    const total = result.length;
    const totalPages = Math.ceil(total / limit);

    res.json({
      data: paginated,
      page,
      limit,
      total,
      totalPages,
    });
  }),
);

// GET /stats - return stats

router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const jobs = readJobs();

    const byStatus = jobs.reduce(
      (acc, job) => {
        const status = job.status;
        //  looks up the current count for that status.
        const currentCount = acc[job.status] ?? 0;

        acc[status] = currentCount + 1;
        return acc;
        //   return {
        //     ...acc,
        //     [status]: currentCount + 1,
        //   };
      },
      {} as Record<string, number>,
    );

    res.json({ total: jobs.length, byStatus });
  }),
);

// GET/:id / - return a job

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const findJobs = findJobById(req.params.id as string);
    if (!findJobs) {
      throw new AppError("Job not found", 404);
    }
    res.json(findJobs);
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const result = validateCreateJob(req.body);

    if (!result.valid) {
      throw new AppError(result.errors.join("; "), 422);
    }

    const newJobData = {
      id: uuidv4(),
      ...result.data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    createJob(newJobData);

    res.status(201).json(newJobData);
  }),
);

// PATCH/:id / - update a job

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = validateUpdateJob(req.body);

    if (!result.valid) {
      throw new AppError(result.errors.join("; "), 422);
    }

const existingJob = findJobById(req.params.id as string)

if (!existingJob) {
  throw new AppError("Job not found", 404)
}

const updatedJob = {
  ...existingJob,
  ...result.data,
  updatedAt: new Date().toISOString()
}

    updateJob(req.params.id as string, updatedJob);
    res.status(200).json(updatedJob);
  }),
);

// DELETE/:id / - delete a job

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {

  const job = findJobById(req.params.id as string)
if (!job) {
  throw new AppError("Job not found", 404)
}
deleteJob(req.params.id as string)
res.status(204).send()
  }),
);

export default router;
