import { Request, Response, NextFunction } from "express"
import logger from "../logger"
import { v4 as uuidv4 } from "uuid"

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const requestId = uuidv4()
  const start = Date.now()

  // attach requestId to req so route handlers can reference it
  req.requestId = requestId

  res.on("finish", () => {
    const responseTime = Date.now() - start
    logger.info({
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userId: req.user?.sub ?? "unauthenticated",
    })
  })

  next()
}