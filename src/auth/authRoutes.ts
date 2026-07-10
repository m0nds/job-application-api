import { Router } from "express";
import { register, verifyEmail, login, forgotPassword, resetPassword, refreshToken, logout } from "./authController";
import {authenticate} from './authMiddleware'
import {loginLimiter, registerLimiter, forgotPasswordLimiter} from '../middleware/rateLimiter'

const router = Router();

router.post("/register", registerLimiter, register);
router.get("/verify", verifyEmail);
router.post("/login", loginLimiter, login);
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword)
router.post("/reset-password", resetPassword)
router.post("/refresh", refreshToken)
router.post("/logout", authenticate, logout)

export default router;