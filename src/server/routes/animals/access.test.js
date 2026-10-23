import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
  vi
} from 'vitest'
import { audit } from '@defra/cdp-auditing'
import { logger } from '@defra/lis-hubs-infra-core'
import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'

import { spokeAuth } from '#test-helpers/spoke-auth.js'
import { createServer } from '#server/server.js'
import { cattleHomeBe4FeClient } from '#server/services/cattle-home-be4fe-client.js'

vi.mock('#server/services/cattle-home-be4fe-client.js')
vi.mock('@defra/cdp-auditing')

const logInfo = vi.fn()
vi.spyOn(logger, 'info', 'get').mockReturnValue(logInfo)

const mocks = {
  getCattleDetails: vi.mocked(cattleHomeBe4FeClient.getCattleDetails),
  audit: vi.mocked(audit),
  logInfo
}

const record = {
  eartag: 'UK200000000001',
  current_location: {
    identifier: '22/001/0001',
    sub_identifier: null,
    full_identifier: '22/001/0001',
    name: 'Oakfield Farm',
    premises_type: 'AH'
  },
  breed: 'HF',
  sex: 'Male',
  date_of_birth: '2023-04-15',
  date_registered: '2023-04-18',
  date_on_cph: '2023-04-15',
  state: 'Alive',
  restriction_status: 'None',
  dam_type: 'genetic',
  genetic_dam_tag: null,
  surrogate_tag: null,
  sire_tag: null,
  sire_name: null
}

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

describe('animal access', () => {
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

  test("it audits and logs a granted access to an animal on the user's holding", async () => {
    // Arrange
    const user = createUser(['22/001/0001'])
    mocks.getCattleDetails.mockResolvedValue(record)

    // Act
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/animals/UK200000000001',
      auth: spokeAuth(user)
    })

    // Assert
    expect(statusCode).toBe(statusCodes.ok)
    expect(mocks.audit).toHaveBeenCalledWith({
      event: 'animal-access',
      outcome: 'granted',
      earTag: 'UK200000000001',
      cph: '22/001/0001',
      user: 'test-user'
    })
    expect(mocks.logInfo).toHaveBeenCalledWith(
      { earTag: 'UK200000000001', outcome: 'granted' },
      'Animal access granted'
    )
  })

  test("it returns not found, and audits and logs the denial, when the user may not read the animal's holding", async () => {
    // Arrange
    const user = createUser(['22/002/0002'])
    mocks.getCattleDetails.mockResolvedValue(record)

    // Act
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/animals/UK200000000001',
      auth: spokeAuth(user)
    })

    // Assert
    expect(statusCode).toBe(statusCodes.notFound)
    expect(mocks.audit).toHaveBeenCalledWith({
      event: 'animal-access',
      outcome: 'denied',
      earTag: 'UK200000000001',
      cph: '22/001/0001',
      user: 'test-user'
    })
    expect(mocks.logInfo).toHaveBeenCalledWith(
      { earTag: 'UK200000000001', outcome: 'denied' },
      'Animal access denied'
    )
  })

  test('it returns not found, and audits the denial, when the animal record has no holding', async () => {
    // Arrange
    const user = createUser('*')
    mocks.getCattleDetails.mockResolvedValue({
      ...record,
      current_location: {
        identifier: null,
        sub_identifier: null,
        full_identifier: null,
        name: null,
        premises_type: null
      }
    })

    // Act
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/animals/UK200000000001',
      auth: spokeAuth(user)
    })

    // Assert
    expect(statusCode).toBe(statusCodes.notFound)
    expect(mocks.audit).toHaveBeenCalledWith({
      event: 'animal-access',
      outcome: 'denied',
      earTag: 'UK200000000001',
      cph: null,
      user: 'test-user'
    })
  })

  test('it does not audit a lookup of an unknown animal', async () => {
    // Arrange
    const user = createUser('*')
    mocks.getCattleDetails.mockRejectedValue(
      Object.assign(new Error('Request failed - 404'), {
        statusCode: statusCodes.notFound
      })
    )

    // Act
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/animals/UK999999999999',
      auth: spokeAuth(user)
    })

    // Assert
    expect(statusCode).toBe(statusCodes.notFound)
    expect(mocks.audit).not.toHaveBeenCalled()
  })
})
