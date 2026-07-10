import jwt from "jsonwebtoken"

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!

export const generateAccessToken = (userId: string, email: string): string => {
  return jwt.sign({
    sub: userId,
    email
  }, ACCESS_SECRET ,
  {expiresIn: '15m'}
)
}

export const generateRefreshToken = (userId: string): string => {
  return jwt.sign({
    sub: userId,
  }, REFRESH_SECRET ,
  {expiresIn: '7d'}
)

}

export const verifyAccessToken = (token: string) => {
 return jwt.verify(token, ACCESS_SECRET)
}

export const verifyRefreshToken = (token: string) => {
 return jwt.verify(token, REFRESH_SECRET)
}