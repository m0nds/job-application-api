import { JwtPayload } from "jsonwebtoken"

declare global {
  namespace Express {
    interface Request {
      user?: {
        sub: string    // userId
        email: string
      }
    }
  }
}