import { Job } from "./types";
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export const readJobs = async (userId: string) => {
  return prisma.job.findMany({ where: { userId } });
};

export const findJobById = async (id: string, userId: string) => {
  return prisma.job.findUnique({ where: { id, userId } });
};

export const createJob = async (job: Job, userId: string) => {
  return prisma.job.create({ data: { ...job, userId } });
};

export const updateJob = async (
  id: string,
  job: Partial<Job>,
  userId: string,
) => {
  return prisma.job.update({ where: { id, userId }, data: job });
};

export const deleteJob = async (id: string, userId: string) => {
  return prisma.job.delete({ where: { id, userId } });
};
