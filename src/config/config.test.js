import { afterEach, describe, expect, test, vi } from 'vitest'

describe('configuration environment defaults', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  test('uses production-safe defaults in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    delete process.env.LOG_FORMAT
    delete process.env.LOG_REDACT
    delete process.env.ENABLE_SECURE_CONTEXT
    delete process.env.SESSION_CACHE_ENGINE
    vi.resetModules()

    const { config } = await import('./config.js')

    expect(config.get('log.format')).toBe('ecs')
    expect(config.get('log.redact')).toEqual([
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers'
    ])
    expect(config.get('isSecureContextEnabled')).toBe(true)
    expect(config.get('session.cache.engine')).toBe('redis')
  })
})
