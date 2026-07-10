import { Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../db";
import { hashPassword, comparePassword } from "./passwordUtils";
import { AppError, asyncHandler } from "../errorHandler";
import { registerSchema, loginSchema } from "./authSchemas";
import { sendVerificationEmail } from "./emailService";
import { generateAccessToken, generateRefreshToken } from './jwtUtils'

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
const { password: _p, verificationToken: _vt, verificationExpiry: _ve, resetPasswordToken: _rpt, resetPasswordExpiry: _rpe, ...safeUser } = updateUser

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
    throw new AppError(
   "Invalid credentials", 401
    );
  }

  // 3. Check isVerified
  //    if false → throw AppError("Please verify your email before logging in", 401)

  if(!user.isVerified) {
    throw new AppError("Please verify your email before logging in", 401)
  }

  // 4. Compare password with bcrypt
  //    comparePassword(password, user.password)
  //    if false → throw AppError("Invalid credentials", 401)

  const comparedPassword = await comparePassword(password, user.password)
  if(!comparedPassword) {
    throw new AppError("Invalid credentials", 401)
  }

  // 5. Generate tokens
  //    generateAccessToken(user.id, user.email)
  //    generateRefreshToken(user.id)
const accessToken = generateAccessToken(user.id, user.email)
 const refreshToken = generateRefreshToken(user.id)


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
       maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days in milliseconds
     })

  // 7. Return 200 with accessToken and safe user object
  //    NEVER return the password
  const { password: _p, verificationToken: _vt, verificationExpiry: _ve, resetPasswordToken: _rpt, resetPasswordExpiry: _rpe, ...safeUser } = user

  res.status(200).json({
    message: "Login successful",
    accessToken,
    user: safeUser,
  });
})
