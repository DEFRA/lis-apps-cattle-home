import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
  vi
} from 'vitest'
import { logger } from '@defra/lis-hubs-infra-core'
import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'

import { spokeAuth } from '#test-helpers/spoke-auth.js'
import { createServer } from '#server/server.js'
import { cattleHomeBe4FeClient } from '#server/services/cattle-home-be4fe-client.js'

vi.mock('#server/services/cattle-home-be4fe-client.js')
vi.mock('@defra/cdp-auditing')

const mocks = {
  getCattleDetails: vi.mocked(cattleHomeBe4FeClient.getCattleDetails),
  getHoldingDetails: vi.mocked(cattleHomeBe4FeClient.getHoldingDetails)
}

const holdingRecord = {
  cph: '22/001/0001',
  name: 'Oakfield Farm',
  business_name: null,
  address: ['Oakfield Farm', 'Mill Lane', null, 'Exeter', 'EX1 1AA'],
  herd_marks: ['UK200000'],
  allowed_species: ['cattle']
}

const fullRecord = {
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
  genetic_dam_tag: 'UK200000000098',
  surrogate_tag: null,
  sire_tag: 'UK200000000099',
  sire_name: null
}

const hubHost = 'front-office.lis.defra'

function fromAnimalsOnHolding(cph = '22/001/0001') {
  return {
    'x-forwarded-host': hubHost,
    referer: `https://${hubHost}/cattle/holdings/${cph}/animals`
  }
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

describe('cattleDetailsController when the BE4FE fails', () => {
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

  test('it logs the dam ear tag and status, and shows the dam without a link, when its lookup fails with a status', async () => {
    // Arrange
    const user = createUser()
    const infoSpy = vi.fn()
    vi.spyOn(logger, 'info', 'get').mockReturnValue(infoSpy)
    const damError = Object.assign(new Error('Request failed - 504'), {
      statusCode: 504
    })
    mocks.getCattleDetails
      .mockResolvedValueOnce(fullRecord)
      .mockRejectedValueOnce(damError)
    mocks.getHoldingDetails.mockResolvedValue(holdingRecord)
    const request = {
      method: 'GET',
      url: '/animals/UK200000000001',
      auth: spokeAuth(user, 'back-office'),
      headers: fromAnimalsOnHolding()
    }

    // Act
    const { result, statusCode } = await server.inject(request)

    // Assert
    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(expect.stringContaining('UK 200000 000098'))
    expect(result).not.toEqual(
      expect.stringContaining('/animals/UK200000000098')
    )
    expect(infoSpy).toHaveBeenCalledWith(
      damError,
      'Dam lookup for UK200000000098 failed with status 504; showing the dam ear tag without a link'
    )
  })

  test('it logs the dam ear tag, and shows the dam without a link, when its lookup fails without a status', async () => {
    // Arrange
    const user = createUser()
    const warnSpy = vi.fn()
    vi.spyOn(logger, 'warn', 'get').mockReturnValue(warnSpy)
    const damError = new Error('fetch failed')
    mocks.getCattleDetails
      .mockResolvedValueOnce(fullRecord)
      .mockRejectedValueOnce(damError)
    mocks.getHoldingDetails.mockResolvedValue(holdingRecord)
    const request = {
      method: 'GET',
      url: '/animals/UK200000000001',
      auth: spokeAuth(user, 'back-office'),
      headers: fromAnimalsOnHolding()
    }

    // Act
    const { result, statusCode } = await server.inject(request)

    // Assert
    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(expect.stringContaining('UK 200000 000098'))
    expect(warnSpy).toHaveBeenCalledWith(
      damError,
      'Dam lookup for UK200000000098 failed; showing the dam ear tag without a link'
    )
  })

  test.each([
    ['times out', 504, 'Sorry, there is a problem with the service'],
    [
      'has its circuit open',
      statusCodes.serviceUnavailable,
      'Sorry, there is a problem with the service'
    ]
  ])(
    'it renders the error page with the status when the BE4FE %s for the animal lookup',
    async (_, statusCode, pageTitle) => {
      // Arrange
      const user = createUser()
      mocks.getCattleDetails.mockRejectedValueOnce(
        Object.assign(new Error(`Request failed - ${statusCode}`), {
          statusCode
        })
      )
      const request = {
        method: 'GET',
        url: '/animals/UK200000000001',
        auth: spokeAuth(user),
        headers: fromAnimalsOnHolding()
      }

      // Act
      const response = await server.inject(request)

      // Assert
      expect(response.statusCode).toBe(statusCode)
      expect(response.result).toEqual(expect.stringContaining(pageTitle))
    }
  )
})
