import { Request, Response, NextFunction } from "express"
import { AppError } from "../errorHandler"
import { verifyAccessToken } from "./jwtUtils"

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
   const authorizationHeader = req.headers.authorization

   if(!authorizationHeader) {
    throw new AppError("No token provided", 401)
   }

  const tokenHeader = authorizationHeader.split(" ")
  const token = tokenHeader[1]

  if(!token) {
    throw new AppError("Invalid token format", 401)
  }

  try {
    const decoded = verifyAccessToken(token)
    req.user = { sub: decoded.sub as string, email: decoded.email as string }
  } catch(error) {
    throw new AppError("Invalid or expired token", 401)
  }

  next()
}
