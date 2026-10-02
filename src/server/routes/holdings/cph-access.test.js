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

import { spokeAuth } from '#test-helpers/spoke-auth.js'
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
 * @returns {object} hydrated user granted cattle read on those CPHs
 */
function createUser(cphs) {
  return {
    sub: 'test-user',
    email: 'test.user@example.com',
    firstName: 'Test',
    lastName: 'User',
    statements: [
      {
        role: 'lis-role-cattle-read',
        cphs,
        permissions: ['lis-perm-cattle-read']
      }
    ],
    serviceId: 'test-service'
  }
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
    const user = createUser(['22/001/0001'])

    // Act
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001',
      auth: spokeAuth(user)
    })

    // Assert
    expect(statusCode).toBe(statusCodes.ok)
  })

  test('it forbids holding details for a CPH the user is not granted', async () => {
    // Arrange
    const user = createUser(['22/002/0002'])

    // Act
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001',
      auth: spokeAuth(user)
    })

    // Assert
    expect(statusCode).toBe(statusCodes.forbidden)
    expect(cattleHomeBe4FeClient.getHoldingDetails).not.toHaveBeenCalled()
  })

  test('it shows animals on holding for a CPH the user is granted', async () => {
    // Arrange
    const user = createUser(['22/001/0001'])

    // Act
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001/animals',
      auth: spokeAuth(user)
    })

    // Assert
    expect(statusCode).toBe(statusCodes.ok)
  })

  test('it forbids animals on holding for a CPH the user is not granted', async () => {
    // Arrange
    const user = createUser(['22/002/0002'])

    // Act
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001/animals',
      auth: spokeAuth(user)
    })

    // Assert
    expect(statusCode).toBe(statusCodes.forbidden)
    expect(cattleHomeBe4FeClient.getCattleOnHolding).not.toHaveBeenCalled()
  })
})
