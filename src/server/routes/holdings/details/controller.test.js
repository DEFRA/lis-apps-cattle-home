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
import * as cattleHomeBe4FeClient from '#server/services/cattle-home-be4fe-client.js'

const mocks = {
  getHoldingDetails: vi.spyOn(cattleHomeBe4FeClient, 'getHoldingDetails'),
  getCattleOnHolding: vi.spyOn(cattleHomeBe4FeClient, 'getCattleOnHolding')
}

function createUser() {
  return {
    sub: 'test-user',
    email: 'test.user@example.com',
    firstName: 'Test',
    lastName: 'User',
    statements: [
      {
        role: 'lis-role-cattle-read',
        cphs: '*',
        permissions: ['lis-perm-cattle-read']
      }
    ],
    serviceId: 'test-service'
  }
}

describe('holdingDetailsController', () => {
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

  test('it does not serve the holding details page to a front-office user', async () => {
    // Arrange
    const user = createUser()
    mocks.getHoldingDetails.mockResolvedValue({
      cph: '22/001/0001',
      name: 'Oakfield Farm',
      address: ['Oakfield Farm', 'SY4 1AB'],
      herd_marks: [{ mark: 'UK 324537', species: ['cattle'] }]
    })
    mocks.getCattleOnHolding.mockResolvedValue({
      animals: [],
      totalItems: 0,
      totalPages: 1,
      currentPage: 1,
      itemsPerPage: 25
    })

    // Act
    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001/cattle',
      auth: spokeAuth(user)
    })

    // Assert
    expect(statusCode).toBe(statusCodes.ok)
    expect(result).not.toEqual(expect.stringContaining('Holding details'))
    expect(result).not.toEqual(expect.stringContaining('CPH number'))
    expect(result).not.toEqual(expect.stringContaining('UK 324537'))
  })

  test('it rejects a request without a hub service token', async () => {
    // Arrange
    const request = {
      method: 'GET',
      url: '/holdings/22/001/0001/cattle'
    }

    // Act
    const { statusCode, result } = await server.inject(request)

    // Assert
    expect(statusCode).toBe(statusCodes.unauthorized)
    expect(result).toEqual({ message: 'Service authentication required' })
    expect(mocks.getHoldingDetails).not.toHaveBeenCalled()
  })
})
