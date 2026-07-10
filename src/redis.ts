import Redis from "ioredis"
import logger from './logger'

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
})

redis.on("connect", () => logger.info("Redis connected"))
redis.on("error", (err) => logger.error({ err }, "Unexpected error"))

export default redis