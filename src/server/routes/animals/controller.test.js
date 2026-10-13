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
  getCattleOnHolding: vi.mocked(cattleHomeBe4FeClient.getCattleOnHolding),
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
  cph: '22/001/0001',
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

describe('cattleDetailsController', () => {
  let server

  beforeAll(async () => {
    mocks.getCattleOnHolding.mockResolvedValue({
      animals: [{ eartag: 'UK200000000001' }]
    })
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  test('it renders the cattle details for an authenticated user', async () => {
    // Arrange
    const user = createUser()
    mocks.getCattleDetails.mockResolvedValue(fullRecord)
    const request = {
      method: 'GET',
      url: '/animals/UK200000000001',
      auth: spokeAuth(user),
      headers: fromAnimalsOnHolding()
    }

    // Act
    const { result, statusCode } = await server.inject(request)

    // Assert
    expect(statusCode).toBe(statusCodes.ok)
    expect(mocks.getCattleDetails).toHaveBeenCalledWith('UK200000000001')
    expect(result).toEqual(
      expect.stringContaining(
        '<span class="govuk-caption-l">UK 200000 000001</span>'
      )
    )
    expect(result).toEqual(
      expect.stringContaining('<h1 class="govuk-heading-l">Cattle details</h1>')
    )
    expect(result).toEqual(
      expect.stringContaining(
        'href="/cattle/holdings/22/001/0001/animals" class="govuk-back-link"'
      )
    )
    expect(result).toEqual(expect.stringContaining('Holstein Friesian (HF)'))
    expect(result).toEqual(expect.stringContaining('Active'))
    expect(result).toEqual(expect.stringContaining('Dam details'))
    expect(result).toEqual(expect.stringContaining('Sire details'))
    expect(result).toEqual(expect.stringContaining('Date registered'))
    expect(result).toEqual(expect.stringContaining('Date on holding'))
    expect(result).toEqual(expect.stringContaining('15 Apr 2023'))
    expect(result).not.toEqual(expect.stringContaining('Current location'))
    expect(mocks.getHoldingDetails).not.toHaveBeenCalled()
  })

  test('it renders the back-office layout, with the current location, for a back-office user', async () => {
    // Arrange
    const user = createUser()
    mocks.getCattleDetails.mockResolvedValue(fullRecord)
    mocks.getHoldingDetails.mockResolvedValueOnce(holdingRecord)
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
    expect(result).toEqual(expect.stringContaining('Registered on'))
    expect(result).not.toEqual(expect.stringContaining('Date registered'))
    expect(result).not.toEqual(expect.stringContaining('Date on holding'))
    expect(result).toEqual(expect.stringContaining('Current location'))
    expect(result).toEqual(expect.stringContaining('22/001/0001'))
    expect(result).toEqual(
      expect.stringContaining('Mill Lane<br>Exeter<br>EX1 1AA')
    )
    expect(result).toEqual(expect.stringContaining('Moved to holding on'))
    expect(result).toEqual(expect.stringContaining('15 April 2023'))
    expect(result).not.toEqual(expect.stringContaining('15 Apr 2023'))
  })

  test('it shows "No sire details are recorded." for a back-office user', async () => {
    // Arrange
    const user = createUser()
    mocks.getCattleDetails.mockResolvedValue({
      ...fullRecord,
      sire_tag: null,
      sire_name: null
    })
    mocks.getHoldingDetails.mockResolvedValueOnce(holdingRecord)
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

  test('it uses the referring holding for the current location when the animal record has no CPH', async () => {
    // Arrange
    const user = createUser()
    mocks.getCattleDetails.mockResolvedValue({ ...fullRecord, cph: null })
    mocks.getHoldingDetails.mockResolvedValueOnce(holdingRecord)
    const request = {
      method: 'GET',
      url: '/animals/UK200000000001',
      auth: spokeAuth(user, 'back-office'),
      headers: fromAnimalsOnHolding('22/001/0001')
    }

    // Act
    const { result, statusCode } = await server.inject(request)

    // Assert
    expect(statusCode).toBe(statusCodes.ok)
    expect(mocks.getHoldingDetails).toHaveBeenCalledWith('22/001/0001')
    expect(result).toEqual(expect.stringContaining('Current location'))
    expect(result).toEqual(
      expect.stringContaining('Mill Lane<br>Exeter<br>EX1 1AA')
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

  test('it still renders, with the address not supplied, when the current holding is not found', async () => {
    // Arrange
    const user = createUser()
    mocks.getCattleDetails.mockResolvedValue(fullRecord)
    mocks.getHoldingDetails.mockRejectedValueOnce(
      Object.assign(new Error('Request failed - 404'), {
        statusCode: statusCodes.notFound
      })
    )
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
    expect(result).toEqual(
      expect.stringContaining(
        '<strong class="govuk-tag govuk-tag--red">Not supplied</strong>'
      )
    )
  })

  test('it shows "Not supplied", styled as an error, for missing required fields', async () => {
    // Arrange
    const user = createUser()
    mocks.getCattleDetails.mockResolvedValue({
      ...fullRecord,
      sex: null,
      date_registered: null
    })
    const request = {
      method: 'GET',
      url: '/animals/UK200000000001',
      auth: spokeAuth(user),
      headers: fromAnimalsOnHolding()
    }

    // Act
    const { result } = await server.inject(request)

    // Assert
    const notSuppliedCount = (
      result.match(
        /<strong class="govuk-tag govuk-tag--red">Not supplied<\/strong>/g
      ) ?? []
    ).length
    expect(notSuppliedCount).toBe(2)
  })

  test('it shows "No sire details recorded." when neither the sire tag nor name is present', async () => {
    // Arrange
    const user = createUser()
    mocks.getCattleDetails.mockResolvedValue({
      ...fullRecord,
      sire_tag: null,
      sire_name: null
    })
    const request = {
      method: 'GET',
      url: '/animals/UK200000000001',
      auth: spokeAuth(user),
      headers: fromAnimalsOnHolding()
    }

    // Act
    const { result } = await server.inject(request)

    // Assert
    expect(result).toEqual(expect.stringContaining('No sire details recorded.'))
  })

  test('it shows "Not required", without error styling, for the missing half of the sire pair', async () => {
    // Arrange
    const user = createUser()
    mocks.getCattleDetails.mockResolvedValue({
      ...fullRecord,
      sire_tag: null,
      sire_name: 'Highland Monarch'
    })
    const request = {
      method: 'GET',
      url: '/animals/UK200000000001',
      auth: spokeAuth(user),
      headers: fromAnimalsOnHolding()
    }

    // Act
    const { result } = await server.inject(request)

    // Assert
    expect(result).toEqual(expect.stringContaining('Not required'))
    expect(result).toEqual(expect.stringContaining('Highland Monarch'))
    expect(result).not.toEqual(
      expect.stringContaining(
        '<strong class="govuk-tag govuk-tag--red">Not required</strong>'
      )
    )
  })

  test('it shows the surrogate dam ear tag row only when a surrogate tag is present', async () => {
    // Arrange
    const user = createUser()
    mocks.getCattleDetails.mockResolvedValue({
      ...fullRecord,
      dam_type: 'surrogate',
      genetic_dam_tag: 'UK200000000090',
      surrogate_tag: 'UK200000000091'
    })
    const request = {
      method: 'GET',
      url: '/animals/UK200000000001',
      auth: spokeAuth(user),
      headers: fromAnimalsOnHolding()
    }

    // Act
    const { result } = await server.inject(request)

    // Assert
    expect(result).toEqual(expect.stringContaining('Surrogate dam ear tag'))
    expect(result).toEqual(expect.stringContaining('UK 200000 000091'))
  })

  test('it returns not found when there is no matching cattle record', async () => {
    // Arrange
    const user = createUser()
    mocks.getCattleDetails.mockRejectedValue(
      Object.assign(new Error('Request failed - 404'), {
        statusCode: statusCodes.notFound
      })
    )
    const request = {
      method: 'GET',
      url: '/animals/UK999999999999',
      auth: spokeAuth(user),
      headers: fromAnimalsOnHolding()
    }

    // Act
    const { statusCode } = await server.inject(request)

    // Assert
    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('it keeps the animals-on-holding query in the back link', async () => {
    // Arrange
    const user = createUser()
    mocks.getCattleDetails.mockResolvedValue(fullRecord)
    const request = {
      method: 'GET',
      url: '/animals/UK200000000001',
      auth: spokeAuth(user),
      headers: fromAnimalsOnHolding('22/001/0001', '?page=2')
    }

    // Act
    const { result, statusCode } = await server.inject(request)

    // Assert
    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(
      expect.stringContaining(
        'href="/cattle/holdings/22/001/0001/animals?page=2" class="govuk-back-link"'
      )
    )
  })

  test('it returns not found when the request did not come from an animals-on-holding page', async () => {
    // Arrange
    const user = createUser()
    const request = {
      method: 'GET',
      url: '/animals/UK200000000001',
      auth: spokeAuth(user),
      headers: {
        'x-forwarded-host': hubHost,
        referer: `https://${hubHost}/cattle/holdings/22/001/0001`
      }
    }

    // Act
    const { statusCode } = await server.inject(request)

    // Assert
    expect(statusCode).toBe(statusCodes.notFound)
    expect(mocks.getCattleDetails).not.toHaveBeenCalled()
  })

  test('it returns not found when there is no referrer', async () => {
    // Arrange
    const user = createUser()
    const request = {
      method: 'GET',
      url: '/animals/UK200000000001',
      auth: spokeAuth(user)
    }

    // Act
    const { statusCode } = await server.inject(request)

    // Assert
    expect(statusCode).toBe(statusCodes.notFound)
    expect(mocks.getCattleDetails).not.toHaveBeenCalled()
  })

  test('it returns not found when the referrer is on another host', async () => {
    // Arrange
    const user = createUser()
    const request = {
      method: 'GET',
      url: '/animals/UK200000000001',
      auth: spokeAuth(user),
      headers: {
        'x-forwarded-host': hubHost,
        referer: 'https://elsewhere.example/cattle/holdings/22/001/0001/animals'
      }
    }

    // Act
    const { statusCode } = await server.inject(request)

    // Assert
    expect(statusCode).toBe(statusCodes.notFound)
    expect(mocks.getCattleDetails).not.toHaveBeenCalled()
  })

  test('it returns not found when the user may not read the referring holding', async () => {
    // Arrange
    const user = {
      ...createUser(),
      statements: [
        {
          role: 'lis-role-cattle-read',
          cphs: ['22/002/0002'],
          permissions: ['lis-perm-cattle-read']
        }
      ]
    }
    const request = {
      method: 'GET',
      url: '/animals/UK200000000001',
      auth: spokeAuth(user),
      headers: fromAnimalsOnHolding('22/001/0001')
    }

    // Act
    const { statusCode } = await server.inject(request)

    // Assert
    expect(statusCode).toBe(statusCodes.notFound)
    expect(mocks.getCattleDetails).not.toHaveBeenCalled()
  })

  test('it returns not found when the animal is not on the referring holding', async () => {
    // Arrange
    const user = createUser()
    mocks.getCattleOnHolding.mockResolvedValueOnce({ animals: [] })
    const request = {
      method: 'GET',
      url: '/animals/UK200000000001',
      auth: spokeAuth(user),
      headers: fromAnimalsOnHolding('22/001/0001')
    }

    // Act
    const { statusCode } = await server.inject(request)

    // Assert
    expect(statusCode).toBe(statusCodes.notFound)
    expect(mocks.getCattleOnHolding).toHaveBeenCalledWith('22/001/0001', {
      q: 'UK200000000001'
    })
    expect(mocks.getCattleDetails).not.toHaveBeenCalled()
  })

  test('it renders when the animal record has no CPH, using the referring holding for the back link', async () => {
    // Arrange
    const user = createUser()
    mocks.getCattleDetails.mockResolvedValue({ ...fullRecord, cph: null })
    const request = {
      method: 'GET',
      url: '/animals/UK200000000001',
      auth: spokeAuth(user),
      headers: fromAnimalsOnHolding('22/001/0001')
    }

    // Act
    const { result, statusCode } = await server.inject(request)

    // Assert
    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(
      expect.stringContaining(
        'href="/cattle/holdings/22/001/0001/animals" class="govuk-back-link"'
      )
    )
  })

  test('it matches the ear tag regardless of spacing and case', async () => {
    // Arrange
    const user = createUser()
    mocks.getCattleOnHolding.mockResolvedValueOnce({
      animals: [{ eartag: 'uk 200000 000001' }]
    })
    mocks.getCattleDetails.mockResolvedValue(fullRecord)
    const request = {
      method: 'GET',
      url: '/animals/UK200000000001',
      auth: spokeAuth(user),
      headers: fromAnimalsOnHolding('22/001/0001')
    }

    // Act
    const { statusCode } = await server.inject(request)

    // Assert
    expect(statusCode).toBe(statusCodes.ok)
  })

  test('it returns a server error when the BE4FE fails', async () => {
    // Arrange
    const user = createUser()
    mocks.getCattleDetails.mockRejectedValue(
      Object.assign(new Error('Request failed - 500'), { statusCode: 500 })
    )
    const request = {
      method: 'GET',
      url: '/animals/UK200000000001',
      auth: spokeAuth(user),
      headers: fromAnimalsOnHolding()
    }

    // Act
    const { statusCode } = await server.inject(request)

    // Assert
    expect(statusCode).toBe(500)
  })

  test('it rejects a request without a hub service token', async () => {
    // Arrange
    const request = {
      method: 'GET',
      url: '/animals/UK200000000001'
    }

    // Act
    const { statusCode, result } = await server.inject(request)

    // Assert
    expect(statusCode).toBe(statusCodes.unauthorized)
    expect(result).toEqual({ message: 'Service authentication required' })
    expect(mocks.getCattleDetails).not.toHaveBeenCalled()
  })
})
