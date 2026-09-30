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

vi.spyOn(cattleHomeBe4FeClient, 'getHoldingDetails').mockResolvedValue({
  cph: '22/001/0001',
  name: 'Oakfield Farm',
  address: ['Oakfield Farm'],
  herd_marks: ['UK 324537']
})
vi.spyOn(cattleHomeBe4FeClient, 'getCattleOnHolding').mockResolvedValue({
  animals: [],
  totalItems: 0,
  totalPages: 1,
  currentPage: 1,
  itemsPerPage: 25
})

/**
 * @param {'*'|string[]} cphs CPH scope granted to the user
 * @returns {Promise<string>} hub JWT granting cattle read on those CPHs
 */
async function createHubJwt(cphs) {
  return issueHubJwt(
    {
      sub: 'test-user',
      email: 'test.user@example.com',
      firstName: 'Test',
      lastName: 'User',
      statements: [{ role: 'lis-role-cattle-read', cphs }],
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

describe('holdings CPH access', () => {
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

  test('it shows holding details for a CPH the user is granted', async () => {
    // Arrange
    const jwt = await createHubJwt(['22/001/0001'])

    // Act
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001',
      headers: { cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}` }
    })

    // Assert
    expect(statusCode).toBe(statusCodes.ok)
  })

  test('it forbids holding details for a CPH the user is not granted', async () => {
    // Arrange
    const jwt = await createHubJwt(['22/002/0002'])

    // Act
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001',
      headers: { cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}` }
    })

    // Assert
    expect(statusCode).toBe(statusCodes.forbidden)
    expect(cattleHomeBe4FeClient.getHoldingDetails).not.toHaveBeenCalled()
  })

  test('it shows animals on holding for a CPH the user is granted', async () => {
    // Arrange
    const jwt = await createHubJwt(['22/001/0001'])

    // Act
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001/animals',
      headers: { cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}` }
    })

    // Assert
    expect(statusCode).toBe(statusCodes.ok)
  })

  test('it forbids animals on holding for a CPH the user is not granted', async () => {
    // Arrange
    const jwt = await createHubJwt(['22/002/0002'])

    // Act
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001/animals',
      headers: { cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}` }
    })

    // Assert
    expect(statusCode).toBe(statusCodes.forbidden)
    expect(cattleHomeBe4FeClient.getCattleOnHolding).not.toHaveBeenCalled()
  })
})
