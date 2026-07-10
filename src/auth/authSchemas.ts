import { z } from "zod"

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const registerSchema = z
  .object({
    name: z
      .string({ error: "Name is required" })
      .min(2, "Name must be at least 2 characters long")
      .trim(),
    email: z
      .string({ error: "Email is required" })
      .email("Invalid email format"),
    password: z
      .string({ error: "Password is required" })
      .min(8, "Password must be at least 8 characters long")
      .regex(
        passwordRegex,
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
      ),
    confirmPassword: z
      .string({ error: "Confirm password is required" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"], // Sets the error specifically on the confirmPassword field
  });

  export const loginSchema = z.object({
  email: z.string({ error: "Email is required" }).email("Invalid email format"),
  password: z.string({ error: "Password is required" }).min(1, "Password is required")
})

export type LoginInput = z.infer<typeof loginSchema>


// infer the TypeScript type from the schema automatically
export type RegisterInput = z.infer<typeof registerSchema>