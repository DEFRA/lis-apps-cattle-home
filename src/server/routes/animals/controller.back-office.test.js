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

vi.mock('#server/services/cattle-home-be4fe-client.js')

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
  registered_location: {
    identifier: '22/004/0004',
    sub_identifier: null,
    full_identifier: '22/004/0004',
    name: 'Hilltop Farm',
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

function fromAnimalsOnHolding(cph = '22/001/0001', query = '') {
  return {
    'x-forwarded-host': hubHost,
    referer: `https://${hubHost}/cattle/holdings/${cph}/animals${query}`
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

describe('cattleDetailsController (back office)', () => {
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

  test('it renders the back-office layout, with the current location, for a back-office user', async () => {
    // Arrange
    const user = createUser()
    mocks.getCattleDetails.mockResolvedValue(fullRecord)
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
    expect(mocks.getHoldingDetails).toHaveBeenCalledWith('22/001/0001')
    expect(result).toEqual(
      expect.stringContaining(
        '<span class="govuk-caption-l">Registered animal</span>'
      )
    )
    expect(result).toEqual(
      expect.stringContaining(
        '<h1 class="govuk-heading-l">UK 200000 000001</h1>'
      )
    )
    expect(result).toEqual(
      expect.stringContaining('govuk-grid-column-three-quarters')
    )
    expect(result).toEqual(expect.stringContaining('Animal details'))
    expect(result).not.toEqual(expect.stringContaining('Registered on'))
    expect(result).not.toEqual(expect.stringContaining('Date registered'))
    expect(result).not.toEqual(expect.stringContaining('18 April 2023'))
    expect(result).not.toEqual(expect.stringContaining('Date on holding'))
    expect(result).toEqual(expect.stringContaining('Current location'))
    expect(result).toEqual(expect.stringContaining('22/001/0001'))
    expect(result).toEqual(
      expect.stringContaining('Mill Lane<br>Exeter<br>EX1 1AA')
    )
    expect(result).toEqual(expect.stringContaining('Moved to holding on'))
    expect(result).toEqual(expect.stringContaining('15 April 2023'))
    expect(result).not.toEqual(expect.stringContaining('15 Apr 2023'))
    expect(result).toEqual(expect.stringContaining('Place of birth'))
    expect(mocks.getHoldingDetails).toHaveBeenCalledWith('22/004/0004')
    expect(result.indexOf('Place of birth')).toBeGreaterThan(
      result.indexOf('Current location')
    )
  })

  test('it omits the place of birth for a back-office user when the animal is not UK tagged', async () => {
    // Arrange
    const user = createUser()
    mocks.getCattleDetails.mockResolvedValue({
      ...fullRecord,
      eartag: 'IE200000000001'
    })
    mocks.getHoldingDetails.mockResolvedValue(holdingRecord)
    const request = {
      method: 'GET',
      url: '/animals/IE200000000001',
      auth: spokeAuth(user, 'back-office')
    }

    // Act
    const { result, statusCode } = await server.inject(request)

    // Assert
    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(expect.stringContaining('Current location'))
    expect(result).not.toEqual(expect.stringContaining('Place of birth'))
    expect(mocks.getHoldingDetails).not.toHaveBeenCalledWith('22/004/0004')
  })

  test('it omits the place of birth for a back-office user when the registered location is unknown', async () => {
    // Arrange
    const user = createUser()
    mocks.getCattleDetails.mockResolvedValue({
      ...fullRecord,
      registered_location: {
        identifier: null,
        sub_identifier: null,
        full_identifier: null,
        name: null,
        premises_type: null
      }
    })
    mocks.getHoldingDetails.mockResolvedValue(holdingRecord)
    const request = {
      method: 'GET',
      url: '/animals/UK200000000001',
      auth: spokeAuth(user, 'back-office')
    }

    // Act
    const { result } = await server.inject(request)

    // Assert
    expect(result).not.toEqual(expect.stringContaining('Place of birth'))
  })

  test('it shows "No sire details are recorded." for a back-office user', async () => {
    // Arrange
    const user = createUser()
    mocks.getCattleDetails.mockResolvedValue({
      ...fullRecord,
      sire_tag: null,
      sire_name: null
    })
    mocks.getHoldingDetails.mockResolvedValue(holdingRecord)
    const request = {
      method: 'GET',
      url: '/animals/UK200000000001',
      auth: spokeAuth(user, 'back-office'),
      headers: fromAnimalsOnHolding()
    }

    // Act
    const { result } = await server.inject(request)

    // Assert
    expect(result).toEqual(
      expect.stringContaining('No sire details are recorded.')
    )
  })

  test('it returns a server error when the current holding lookup fails', async () => {
    // Arrange
    const user = createUser()
    mocks.getCattleDetails.mockResolvedValue(fullRecord)
    mocks.getHoldingDetails.mockRejectedValueOnce(
      Object.assign(new Error('Request failed - 500'), { statusCode: 500 })
    )
    const request = {
      method: 'GET',
      url: '/animals/UK200000000001',
      auth: spokeAuth(user, 'back-office'),
      headers: fromAnimalsOnHolding()
    }

    // Act
    const { statusCode } = await server.inject(request)

    // Assert
    expect(statusCode).toBe(500)
  })

  test('it still renders, without the address row, when the current holding is not found', async () => {
    // Arrange
    const user = createUser()
    mocks.getCattleDetails.mockResolvedValue(fullRecord)
    const holdingNotFound = Object.assign(new Error('Request failed - 404'), {
      statusCode: statusCodes.notFound
    })
    mocks.getHoldingDetails
      .mockRejectedValueOnce(holdingNotFound)
      .mockRejectedValueOnce(holdingNotFound)
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
    expect(result).toEqual(expect.stringContaining('Current location'))
    expect(result).toEqual(expect.stringContaining('22/001/0001'))
    expect(result).toEqual(expect.stringContaining('Moved to holding on'))
    expect(result).not.toEqual(expect.stringContaining('Address'))
    expect(result).not.toEqual(
      expect.stringContaining(
        '<strong class="govuk-tag govuk-tag--red">Not supplied</strong>'
      )
    )
  })
})
