import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = "AppError";
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({error: err.message})
    return
  } else {
    console.error(err.stack)
    res.status(500).json({error: "Please try again!"})
  }
};

export const asyncHandler = (fn: (req:Request, res:Response, next:NextFunction) => Promise<void>) => {
    return (req:Request, res:Response, next:NextFunction) => {
        fn(req, res, next).catch(next)
    }
}