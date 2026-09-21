import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'
import { issueHubJwt } from '@defra/lis-hubs-infra-access/auth'

import { config } from '#config/config.js'
import { createServer } from '#server/server.js'

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
    expect(result).toEqual(
      expect.stringContaining('Animals on holding (page 1 of 2)')
    )
  })

  test('it shows dates as day, short month and year', async () => {
    // Arrange
    const jwt = await createHubJwt()

    // Act
    const { result } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001/animals?search=UK200000000001',
      headers: { cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}` }
    })

    // Assert
    expect(result).toEqual(
      expect.stringContaining('<td class="govuk-table__cell">1 Feb 2023</td>')
    )
    expect(result).not.toEqual(expect.stringContaining('2023-02-01'))
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
    expect(result).toEqual(
      expect.stringContaining('Animals on holding (page 2 of 2)')
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
    expect(result).toEqual(
      expect.stringContaining("1 result for <strong>'UK300000000023'</strong>")
    )
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
      expect.stringContaining(
        "0 results for <strong>'not-a-real-animal'</strong>"
      )
    )
    expect(result).toEqual(expect.stringContaining('Clear search'))
    expect(result).not.toEqual(expect.stringContaining('govuk-table__body'))
  })

  test('it shows the no-animals empty state when the holding has none recorded', async () => {
    // Arrange
    const jwt = await createHubJwt()

    // Act
    const { result } = await server.inject({
      method: 'GET',
      url: '/holdings/22/095/0095/animals',
      headers: { cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}` }
    })

    // Assert
    expect(result).toEqual(
      expect.stringContaining(
        'There are no animals currently registered on your holding.'
      )
    )
    expect(result).toEqual(
      expect.stringContaining(
        'href="https://www.gov.uk/government/organisations/british-cattle-movement-service'
      )
    )
    expect(result).not.toEqual(
      expect.stringContaining('Search animals on your holding')
    )
    expect(result).not.toEqual(expect.stringContaining('govuk-table__body'))
  })

  test('it shows "Not supplied", styled as an error, for missing animal fields', async () => {
    // Arrange
    const jwt = await createHubJwt()

    // Act
    const { result } = await server.inject({
      method: 'GET',
      url: '/holdings/22/096/0096/animals',
      headers: { cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}` }
    })

    // Assert
    const notSuppliedCount = (
      result.match(
        /<strong class="govuk-tag govuk-tag--red">Not supplied<\/strong>/g
      ) ?? []
    ).length
    expect(notSuppliedCount).toBe(3)
    expect(result).toEqual(expect.stringContaining('UK400000000001'))
    expect(result).not.toEqual(expect.stringContaining('page 1 of'))
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
