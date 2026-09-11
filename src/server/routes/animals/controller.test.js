import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'
import { issueHubJwt } from '@defra/lis-hubs-infra-access/auth'

import { config } from '#config/config.js'
import { createServer } from '#server/server.js'
import { animals } from './index.js'

async function createHubJwt() {
  return issueHubJwt(
    {
      sub: 'test-user',
      email: 'test.user@example.com',
      firstName: 'Test',
      lastName: 'User',
      statements: [{ role: 'lis-role-cattle-read', cphs: '*' }],
      serviceId: 'test-service'
    },
    {
      secret: config.get('auth.hubJwt.secret'),
      issuer: config.get('auth.hubOrigins')[0],
      audience: config.get('auth.hubJwt.audience'),
      ttlSeconds: config.get('auth.hubJwt.ttlSeconds')
    }
  )
}

describe('animals plugin', () => {
  test('it registers the animals on holding route', () => {
    // Arrange
    const route = vi.fn()

    // Act
    animals.plugin.register({ route })

    // Assert
    expect(route).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: '/holdings/{county}/{parish}/{holding}/animals'
      })
    )
  })
})

describe('animalsOnHoldingController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('it renders the results for an authenticated user', async () => {
    // Arrange
    const jwt = await createHubJwt()

    // Act
    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001/animals',
      headers: { cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}` }
    })

    // Assert
    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(expect.stringContaining('Animals on holding'))
    expect(result).toEqual(expect.stringContaining('UK200000000001'))
    expect(result).toEqual(expect.stringContaining('Date on holding'))
    expect(result).toEqual(
      expect.stringContaining('Showing 1 to 25 of 34 results')
    )
    expect(result).toEqual(expect.stringContaining('aria-sort="ascending"'))
  })

  test('it shows the remaining results on page 2', async () => {
    // Arrange
    const jwt = await createHubJwt()

    // Act
    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001/animals?page=2',
      headers: { cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}` }
    })

    // Assert
    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(
      expect.stringContaining('Showing 26 to 34 of 34 results')
    )
  })

  test('it sorts by the requested column and direction', async () => {
    // Arrange
    const jwt = await createHubJwt()

    // Act
    const { result } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001/animals?sort=date_of_birth&direction=desc',
      headers: { cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}` }
    })

    // Assert
    expect(result).toEqual(expect.stringContaining('aria-sort="descending"'))
    const rowsStart = result.indexOf('govuk-table__body')
    // UK300000000004 (born 2026-06-01) is the most recent birth date, so it
    // should sort first when descending.
    expect(result.indexOf('UK300000000004', rowsStart)).toBeLessThan(
      result.indexOf('UK200000000001', rowsStart)
    )
  })

  test('it filters by the search term', async () => {
    // Arrange
    const jwt = await createHubJwt()

    // Act
    const { result } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001/animals?search=UK300000000023',
      headers: { cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}` }
    })

    // Assert
    expect(result).toEqual(expect.stringContaining("1 result for <strong>'UK300000000023'</strong>"))
    expect(result).toEqual(expect.stringContaining('UK300000000023'))
    expect(result).not.toEqual(expect.stringContaining('UK200000000001'))
  })

  test('it shows no table and a "Clear search" link when nothing matches', async () => {
    // Arrange
    const jwt = await createHubJwt()

    // Act
    const { result } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001/animals?search=not-a-real-animal',
      headers: { cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}` }
    })

    // Assert
    expect(result).toEqual(
      expect.stringContaining("0 results for <strong>'not-a-real-animal'</strong>")
    )
    expect(result).toEqual(expect.stringContaining('Clear search'))
    expect(result).not.toEqual(expect.stringContaining('govuk-table__body'))
  })

  test('it returns not found for a CPH with no canned holding', async () => {
    // Arrange
    const jwt = await createHubJwt()

    // Act
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/holdings/99/999/9999/animals',
      headers: { cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}` }
    })

    // Assert
    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('it redirects an unauthenticated request to the hub login', async () => {
    // Act
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001/animals'
    })

    // Assert
    expect(statusCode).toBe(302)
    expect(headers.location).toBeDefined()
  })
})
