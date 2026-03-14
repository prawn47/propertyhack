const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const BCRYPT_ROUNDS = 10

async function generateKey() {
  const randomBytes = crypto.randomBytes(60)
  const base64 = randomBytes.toString('base64url').substring(0, 60)
  const plainKey = 'phk_' + base64
  const keyHash = await bcrypt.hash(plainKey, BCRYPT_ROUNDS)
  const keyPrefix = plainKey.substring(0, 12)
  return { plainKey, keyHash, keyPrefix }
}

async function createKey(name, scopes, expiresAt) {
  const { plainKey, keyHash, keyPrefix } = await generateKey()
  const record = await prisma.agentApiKey.create({
    data: {
      name,
      keyHash,
      keyPrefix,
      scopes,
      expiresAt: expiresAt || null,
    },
  })
  return { ...record, plainKey }
}

async function revokeKey(id) {
  const record = await prisma.agentApiKey.update({
    where: { id },
    data: { isActive: false },
  })
  return record
}

async function listKeys() {
  const keys = await prisma.agentApiKey.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      isActive: true,
      expiresAt: true,
      lastUsedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  return keys
}

async function validateKey(providedKey) {
  if (!providedKey || providedKey.length < 12) return null

  const prefix = providedKey.substring(0, 12)
  const candidates = await prisma.agentApiKey.findMany({
    where: {
      keyPrefix: prefix,
      isActive: true,
    },
  })

  for (const candidate of candidates) {
    const match = await bcrypt.compare(providedKey, candidate.keyHash)
    if (match) return candidate
  }

  return null
}

module.exports = {
  generateKey,
  createKey,
  revokeKey,
  listKeys,
  validateKey,
}
