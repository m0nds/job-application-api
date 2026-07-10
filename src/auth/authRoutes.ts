import { Router } from "express";
import { register, verifyEmail, login, forgotPassword, resetPassword, refreshToken, logout } from "./authController";
import {authenticate} from './authMiddleware'

const router = Router();

router.post("/register", register);
router.get("/verify", verifyEmail);
router.post("/login", login);
router.post("/forgot-password", forgotPassword)
router.post("/reset-password", resetPassword)
router.post("/refresh", refreshToken)
router.post("/logout", authenticate, logout)

export default router;