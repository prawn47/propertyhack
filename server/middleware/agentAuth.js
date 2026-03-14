const prisma = require('../lib/prisma')
const agentKeyService = require('../services/agentKeyService')

const SENSITIVE_FIELDS = ['key', 'token', 'secret', 'password', 'authorization']

function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return null
  const sanitized = {}
  for (const [key, value] of Object.entries(body)) {
    if (SENSITIVE_FIELDS.some(f => key.toLowerCase().includes(f))) continue
    if (key === 'htmlContent' && typeof value === 'string') {
      sanitized[key] = value.substring(0, 100) + (value.length > 100 ? '...' : '')
    } else {
      sanitized[key] = value
    }
  }
  return sanitized
}

async function authenticateAgentKey(req, res, next) {
  try {
    const providedKey = req.headers['x-agent-key']
    if (!providedKey) {
      return res.status(401).json({ error: 'API key required' })
    }

    const keyRecord = await agentKeyService.validateKey(providedKey)
    if (!keyRecord) {
      return res.status(401).json({ error: 'Invalid API key' })
    }

    if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
      return res.status(401).json({ error: 'API key expired' })
    }

    req.agentKey = { id: keyRecord.id, name: keyRecord.name, scopes: keyRecord.scopes }
    req.startTime = Date.now()

    prisma.agentApiKey.update({
      where: { id: keyRecord.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => {})

    next()
  } catch (error) {
    console.error('Agent auth middleware error:', error)
    return res.status(500).json({ error: 'Authentication error' })
  }
}

function requireScope(scope) {
  return (req, res, next) => {
    if (!req.agentKey.scopes.includes(scope)) {
      return res.status(403).json({ error: 'Insufficient scope', required: scope })
    }
    next()
  }
}

function auditLog(req, res, next) {
  res.on('finish', () => {
    prisma.agentAuditLog.create({
      data: {
        agentKeyName: req.agentKey.name,
        method: req.method,
        path: req.originalUrl,
        requestSummary: sanitizeBody(req.body),
        responseStatus: res.statusCode,
        durationMs: Date.now() - req.startTime,
      },
    }).catch(() => {})
  })
  next()
}

module.exports = { authenticateAgentKey, requireScope, auditLog }
