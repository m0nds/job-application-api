import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const BASE_URL = process.env.BASE_URL || "http://localhost:3000"

export const sendVerificationEmail = async (
  email: string,
  name: string,
  token: string
): Promise<void> => {
const verificationUrl = `${BASE_URL}/api/auth/verify?token=${token}`

  await resend.emails.send({
    from: "onboarding@resend.dev", // Resend's test sender — works without a domain
    to: email,
    subject: "Verify your email — Job Tracker",
    html: `
      <h2>Welcome ${name}!</h2>
      <p>Thanks for registering. Please verify your email by clicking the link below:</p>
      <a href="${verificationUrl}">Verify Email</a>
      <p>This link expires in 24 hours.</p>
      <p>If you didn't create an account, ignore this email.</p>
    `
  })
}