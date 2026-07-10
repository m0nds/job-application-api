import { Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../db";
import { hashPassword, comparePassword } from "./passwordUtils";
import { AppError, asyncHandler } from "../errorHandler";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./authSchemas";
import { sendVerificationEmail, sendResetEmail } from "./emailService";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "./jwtUtils";
import redis from "../redis";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => e.message);
    throw new AppError(errors.join("; "), 422);
  }

  const { name, email, password } = parsed.data;
  const prismaEmail = await prisma.user.findUnique({ where: { email } });

  if (prismaEmail) {
    throw new AppError(
      "If this email is not registered, you will receive a verification email shortly",
      200,
    );
  }

  const hashedPassword = await hashPassword(password);

  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const createUser = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      name,
      email,
      password: hashedPassword,
      isVerified: false,
      verificationToken: token,
      verificationExpiry: expiry,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  await sendVerificationEmail(email, name, token);
  const {
    password: _password,
    verificationToken,
    verificationExpiry,
    ...safeUser
  } = createUser;

  res
    .status(201)
    .json({ message: "Account created successfully", user: safeUser });
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.query;

  if (!token || typeof token !== "string") {
    throw new AppError("Verification token is required", 400);
  }

  const findUser = await prisma.user.findFirst({
    where: { verificationToken: token },
  });

  if (!findUser) {
    throw new AppError("Invalid or expired token", 400);
  }

  if (
    !findUser.verificationExpiry ||
    new Date() > findUser.verificationExpiry
  ) {
    throw new AppError("Token has expired, please register again", 400);
  }

  const updateUser = await prisma.user.update({
    where: { id: findUser.id }, // add this
    data: {
      isVerified: true,
      verificationToken: null,
      verificationExpiry: null,
      updatedAt: new Date(),
    },
  });
  const {
    password: _p,
    verificationToken: _vt,
    verificationExpiry: _ve,
    resetPasswordToken: _rpt,
    resetPasswordExpiry: _rpe,
    ...safeUser
  } = updateUser;

  res.status(200).json({
    message: "Email verified successfully, you can now login",
    user: safeUser,
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  // 1. Validate with loginSchema.safeParse
  //    throw 422 if invalid

  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => e.message);
    throw new AppError(errors.join("; "), 422);
  }

  // 2. Find user by email
  //    if not found → throw AppError("Invalid credentials", 401)

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }

  // 3. Check isVerified
  //    if false → throw AppError("Please verify your email before logging in", 401)

  if (!user.isVerified) {
    throw new AppError("Please verify your email before logging in", 401);
  }

  // 4. Compare password with bcrypt
  //    comparePassword(password, user.password)

  const comparedPassword = await comparePassword(password, user.password);
  if (!comparedPassword) {
    throw new AppError("Invalid credentials", 401);
  }

  // 5. Generate tokens
  const accessToken = generateAccessToken(user.id, user.email);
  const refreshToken = generateRefreshToken(user.id);

  // 6. Set refresh token as httpOnly cookie
  //    res.cookie("refreshToken", refreshToken, {
  //      httpOnly: true,
  //      secure: process.env.NODE_ENV === "production",
  //      sameSite: "strict",
  //      maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days in milliseconds
  //    })

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  });

  // 7. Return 200 with accessToken and safe user object
  //    NEVER return the password
  const {
    password: _p,
    verificationToken: _vt,
    verificationExpiry: _ve,
    resetPasswordToken: _rpt,
    resetPasswordExpiry: _rpe,
    ...safeUser
  } = user;

  res.status(200).json({
    message: "Login successful",
    accessToken,
    user: safeUser,
  });
});

export const forgotPassword = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate with forgotPasswordSchema

    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((e) => e.message);
      throw new AppError(errors.join("; "), 422);
    }
    // 2. Find user by email — but ALWAYS return the same response
    //    whether found or not
    const { email } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isVerified) {
      res.status(200).json({
        message:
          "If an account with that email exists, you will receive a reset link shortly",
      });
      return;
    }

    // 3. If user exists AND is verified:
    //    - generate resetPasswordToken: crypto.randomBytes(32).toString("hex")
    //    - generate resetPasswordExpiry: 1 hour from now
    //      new Date(Date.now() + 60 * 60 * 1000)
    //    - update user in database with token and expiry
    //    - send reset email (we'll create sendResetEmail in emailService.ts)

    const resetPasswordToken = crypto.randomBytes(32).toString("hex");
    const resetPasswordExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const updateUser = await prisma.user.update({
      where: { email },
      data: {
        resetPasswordToken,
        resetPasswordExpiry,
        updatedAt: new Date(),
      },
    });
    await sendResetEmail(email, updateUser.name, resetPasswordToken);

    // 4. Always return 200 with:
    //    "If an account with that email exists, you will receive a reset link shortly"
    res.status(200).json({
      message:
        "If an account with that email exists, you will receive a reset link shortly",
    });
  },
);

export const resetPassword = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate with resetPasswordSchema
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((e) => e.message);
      throw new AppError(errors.join("; "), 422);
    }

    const { newPassword, token } = parsed.data;

    if (!token || typeof token !== "string") {
      throw new AppError("Verification token is required", 400);
    }

    // 2. Find user by resetPasswordToken
    //    prisma.user.findFirst({ where: { resetPasswordToken: token } })
    //    if not found → throw AppError("Invalid or expired reset link", 400)

    const user = await prisma.user.findFirst({
      where: { resetPasswordToken: token },
    });
    if (!user) {
      throw new AppError("Invalid or expired reset link", 400);
    }

    // 3. Check resetPasswordExpiry
    //    if expired → throw AppError("Reset link has expired, please request a new one", 400)

    if (!user.resetPasswordExpiry || new Date() > user.resetPasswordExpiry) {
      throw new AppError(
        "Reset link has expired, please request a new one",
        400,
      );
    }

    // 4. Hash the new password

    const hashedPassword = await hashPassword(newPassword);

    // 5. Update user
    //  password: hashedPassword
    //  resetPasswordToken: null
    //  resetPasswordExpiry: null
    //  updatedAt: new Date()

    await prisma.user.update({
      where: { email: user.email },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpiry: null,
        updatedAt: new Date(),
      },
    });

    // 6. Return 200
    //    message: "Password reset successful, please login with your new password"

    res.status(200).json({
      message: "Password reset successful, please login with your new password",
    });
  },
);

export const refreshToken = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Read refresh token from cookie
    //    req.cookies.refreshToken
    //    if missing → throw AppError("No refresh token", 401)

    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      throw new AppError("No refresh token", 401);
    }

    // 2. Verify refresh token with verifyRefreshToken
    //    wrap in try/catch → throw AppError("Invalid or expired refresh token", 401)

    try {
      const decoded = verifyRefreshToken(refreshToken);
      req.user = { sub: decoded.sub as string, email: decoded.email as string };
      const userId = decoded.sub as string;
      const user = await prisma.user.findUnique({ where: { id: userId } });

      // 3. Find user by decoded.sub (userId)
      //    if not found → throw AppError("User not found", 401)
      if (!user) throw new AppError("User not found", 401);
      // 4. Generate new access token
      //    generateAccessToken(user.id, user.email)
      const accessToken = generateAccessToken(user.id, user.email);
      // 5. Generate new refresh token (rotation)
      //    generateRefreshToken(user.id)

      const newRefreshToken = generateRefreshToken(user.id);

      // 6. Set new refresh token cookie (same options as login)

      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      });
      // 7. Return 200 with new accessToken
      res.status(200).json({
        accessToken,
      });
    } catch (error) {
      throw new AppError("Invalid or expired refresh token", 401);
    }
  },
);

export const logout = asyncHandler(async (req: Request, res: Response) => {
  // 1. Get access token from Authorization header
  //    same pattern as authMiddleware
  //    if missing → still proceed, just clear cookie
  const authorizationHeader = req.headers.authorization;
  const token = authorizationHeader?.split(" ")[1];

  if (!token) {
    res.clearCookie("refreshToken", { httpOnly: true, sameSite: "strict" });
    return;
  }

  // 2. If token exists — blacklist it in Redis
  //    redis.set("blacklist:TOKEN", "1", "EX", 900)
  //    EX 900 = expires in 900 seconds (15 minutes — same as access token)
  //    key format "blacklist:TOKEN" namespaces it cleanly

  if (token) {
    await redis.set(`blacklist:${token}`, "1", "EX", 900);
  }

  // 3. Clear the refresh token cookie
  //    res.clearCookie("refreshToken", { httpOnly: true, sameSite: "strict" })

  res.clearCookie("refreshToken", { httpOnly: true, sameSite: "strict" });

  // 4. Return 200
  //    message: "Logged out successfully"
  res.status(200).json({
    message: "Logged out successfully",
  });
});
