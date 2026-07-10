import rateLimit from "express-rate-limit"

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,
  message: { error: "Too many login attempts, please try again in 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
})

export const registerLimiter = rateLimit({
  // fill this in
   windowMs: 60 * 60 * 1000,  // 15 minutes
  max: 10,
  message: { error: "Too many registration attempts, please try again in an hour" },
  standardHeaders: true,
  legacyHeaders: false,
})

export const forgotPasswordLimiter = rateLimit({
  // fill this in
   windowMs: 60 * 60 * 1000,  // 15 minutes
  max: 3,
  message: { error: "Too many password reset attempts attempts, please try again in an hour" },
  standardHeaders: true,
  legacyHeaders: false,
})