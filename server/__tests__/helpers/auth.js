import jwt from 'jsonwebtoken'

export function generateTestToken(userId, superAdmin = true) {
  return jwt.sign(
    { userId, superAdmin },
    process.env.JWT_ACCESS_SECRET || 'test-access-secret',
    { expiresIn: '15m' }
  )
}
