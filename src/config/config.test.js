import { afterEach, describe, expect, test, vi } from 'vitest'

const publicHubJwtSecret =
  'local-dev-hub-jwt-signing-secret-please-change-1234567890'

async function importConfig() {
  vi.resetModules()
  return import('./config.js')
}

describe('configuration environment defaults', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  test('uses production-safe defaults in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    delete process.env.LOG_FORMAT
    delete process.env.SESSION_CACHE_ENGINE
    vi.resetModules()

    const { config } = await import('./config.js')

    expect(config.get('log.format')).toBe('ecs')
    expect(config.get('session.cache.engine')).toBe('redis')
  })
})

describe('hub JWT secret', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  test('refuses to start when HUB_JWT_SECRET is unset', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('HUB_JWT_SECRET', undefined)

    await expect(importConfig()).rejects.toThrow(
      'auth.hubJwt.secret: must be set'
    )
  })

  test('refuses to start when HUB_JWT_SECRET is empty', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('HUB_JWT_SECRET', '')

    await expect(importConfig()).rejects.toThrow(
      'auth.hubJwt.secret: must be set'
    )
  })

  test('refuses to start when HUB_JWT_SECRET is shorter than 32 characters', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('HUB_JWT_SECRET', 'a'.repeat(31))

    await expect(importConfig()).rejects.toThrow(
      'auth.hubJwt.secret: must be at least 32 characters'
    )
  })

  test.each(['dev', 'test', 'ext-test', 'perf-test', 'prod'])(
    'refuses the public local value in the %s environment',
    async (environment) => {
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('ENVIRONMENT', environment)
      vi.stubEnv('HUB_JWT_SECRET', publicHubJwtSecret)

      await expect(importConfig()).rejects.toThrow(
        'HUB_JWT_SECRET is the public local development value'
      )
    }
  )

  test.each(['local', 'docker_compose'])(
    'accepts the public local value in the %s environment',
    async (environment) => {
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('ENVIRONMENT', environment)
      vi.stubEnv('HUB_JWT_SECRET', publicHubJwtSecret)

      const { config } = await importConfig()

      expect(config.get('auth.hubJwt.secret')).toBe(publicHubJwtSecret)
    }
  )

  test('starts with a real secret in a deployed environment', async () => {
    const secret = 'b'.repeat(32)
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('ENVIRONMENT', 'prod')
    vi.stubEnv('HUB_JWT_SECRET', secret)

    const { config } = await importConfig()

    expect(config.get('auth.hubJwt.secret')).toBe(secret)
  })

  test('does not include the secret in the error message', async () => {
    const secret = 'short-but-secret'
    vi.stubEnv('HUB_JWT_SECRET', secret)

    await expect(importConfig()).rejects.toThrow(
      expect.objectContaining({
        message: expect.not.stringContaining(secret)
      })
    )
  })
})

describe('session cache ttl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  test('accepts an ISO 8601 duration from the environment', async () => {
    // Arrange
    vi.stubEnv('SESSION_CACHE_TTL', 'PT4H')

    // Act
    const { config } = await import('./config.js?ttl=iso')

    // Assert
    expect(config.get('session.cache.ttl')).toBe(14400000)
  })

  test('rejects a ttl over 7 days', async () => {
    // Arrange
    vi.stubEnv('SESSION_CACHE_TTL', 'P8D')

    // Act
    let error
    try {
      await import('./config.js?ttl=over')
    } catch (e) {
      error = e
    }

    // Assert
    expect(error.message).toContain(
      'session.cache.ttl: must be no more than P7D'
    )
  })
})

describe('environment', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  test('accepts ext-test', async () => {
    // Arrange
    vi.stubEnv('ENVIRONMENT', 'ext-test')

    // Act
    const { config } = await import('./config.js?env=ext-test')

    // Assert
    expect(config.get('environment')).toBe('ext-test')
  })

  test('rejects an environment the platform does not have', async () => {
    // Arrange
    vi.stubEnv('ENVIRONMENT', 'staging')

    // Act
    let error
    try {
      await import('./config.js?env=staging')
    } catch (e) {
      error = e
    }

    // Assert
    expect(error.message).toContain('environment: must be one of')
  })
})
