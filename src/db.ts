import { Job } from "./types";
import { PrismaClient } from "@prisma/client"

export const prisma = new PrismaClient()

export const readJobs = async () => {
    return prisma.job.findMany()
}

export const findJobById = async (id: string) => {
    return prisma.job.findUnique({where: {id}})
}

export const createJob = async (job: Job) => {
   return prisma.job.create({data: job})
}

export const updateJob = async (id: string, job: Partial<Job>) => {
    return prisma.job.update({where: {id}, data: job})
}

export const deleteJob = async (id:string) => {
    return prisma.job.delete({where: {id}})
}
