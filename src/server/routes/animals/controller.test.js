import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
  vi
} from 'vitest'
import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'
import { issueHubJwt } from '@defra/lis-hubs-infra-access/auth'

import { config } from '#config/config.js'
import { createServer } from '#server/server.js'
import { cattleHomeBe4FeClient } from '#server/services/cattle-home-be4fe-client.js'
import animalsByCph from '#server/services/canned-animals.json' with { type: 'json' }
import { animals } from './index.js'

const mocks = {
  getHoldingDetails: vi.spyOn(cattleHomeBe4FeClient, 'getHoldingDetails'),
  getCattleForCph: vi.spyOn(cattleHomeBe4FeClient, 'getCattleForCph')
}

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

  afterEach(() => {
    vi.clearAllMocks()
  })

  test('it renders the results for an authenticated user', async () => {
    // Arrange
    const jwt = await createHubJwt()
    mocks.getHoldingDetails.mockResolvedValue({ cph: '22/001/0001' })
    mocks.getCattleForCph.mockResolvedValue(animalsByCph['22/001/0001'])

    // Act
    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001/animals',
      headers: { cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}` }
    })

    // Assert
    expect(statusCode).toBe(statusCodes.ok)
    expect(mocks.getCattleForCph).toHaveBeenCalledWith('22/001/0001')
    expect(result).toEqual(expect.stringContaining('Animals on holding'))
    expect(result).toEqual(expect.stringContaining('UK200000000001'))
    expect(result).toEqual(expect.stringContaining('UK300000000023'))
    expect(result).toEqual(expect.stringContaining('Date on holding'))
    expect(result).toEqual(expect.stringContaining('Showing 34 results'))
    expect(result).toEqual(expect.stringContaining('aria-sort="ascending"'))
  })

  test('it shows the no-animals empty state when the holding has none recorded', async () => {
    // Arrange
    const jwt = await createHubJwt()
    mocks.getHoldingDetails.mockResolvedValue({ cph: '22/095/0095' })
    mocks.getCattleForCph.mockResolvedValue([])

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
    mocks.getHoldingDetails.mockResolvedValue({ cph: '22/096/0096' })
    mocks.getCattleForCph.mockResolvedValue(animalsByCph['22/096/0096'])

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
  })

  test('it returns not found when the BE4FE has no matching holding', async () => {
    // Arrange
    const jwt = await createHubJwt()
    const notFoundError = new Error('Request failed - 404')
    notFoundError.statusCode = statusCodes.notFound
    mocks.getHoldingDetails.mockRejectedValue(notFoundError)
    mocks.getCattleForCph.mockResolvedValue([])

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
