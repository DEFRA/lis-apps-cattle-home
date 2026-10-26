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

describe('cattleDetailsController parentage', () => {
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

  test('it labels the sire ear tag row "Sire ear tag number" for a back-office user', async () => {
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
    expect(result).toMatch(
      /Sire ear tag number\s*<\/dt>\s*<dd[^>]*>\s*UK 200000 000099\s*<\/dd>/
    )
  })

  test('it labels the sire ear tag row "Sire ear tag" for a front-office user', async () => {
    // Arrange
    const user = createUser()
    mocks.getCattleDetails.mockResolvedValue(fullRecord)
    const request = {
      method: 'GET',
      url: '/animals/UK200000000001',
      auth: spokeAuth(user, 'front-office'),
      headers: fromAnimalsOnHolding()
    }

    // Act
    const { result, statusCode } = await server.inject(request)

    // Assert
    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toMatch(
      /Sire ear tag\s*<\/dt>\s*<dd[^>]*>\s*UK 200000 000099\s*<\/dd>/
    )
    expect(result).not.toEqual(expect.stringContaining('Sire ear tag number'))
  })

  test('it links a dam that is on the same holding for a back-office user', async () => {
    // Arrange
    const user = createUser()
    mocks.getCattleDetails.mockImplementation(async (earTag) => {
      if (earTag === 'UK200000000001') {
        return fullRecord
      }
      return {
        ...fullRecord,
        eartag: earTag,
        current_location: { ...fullRecord.current_location }
      }
    })
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
    expect(mocks.getCattleDetails).toHaveBeenCalledWith('UK200000000098')
    expect(result).toEqual(
      expect.stringContaining(
        '<a class="govuk-link" href="/cattle/animals/UK200000000098">UK 200000 000098</a>'
      )
    )
  })

  test('it shows a dam on another holding as plain text for a back-office user', async () => {
    // Arrange
    const user = createUser()
    mocks.getCattleDetails.mockImplementation(async (earTag) => {
      if (earTag === 'UK200000000001') {
        return fullRecord
      }
      return {
        ...fullRecord,
        eartag: earTag,
        current_location: {
          ...fullRecord.current_location,
          identifier: '22/002/0002',
          full_identifier: '22/002/0002'
        }
      }
    })
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
    expect(result).toMatch(
      /Genetic dam ear tag\s*<\/dt>\s*<dd[^>]*>\s*UK 200000 000098\s*<\/dd>/
    )
    expect(result).not.toContain('href="/cattle/animals/UK200000000098"')
  })

  test('it shows a dam that is not found as plain text for a back-office user', async () => {
    // Arrange
    const user = createUser()
    mocks.getCattleDetails.mockImplementation(async (earTag) => {
      if (earTag === 'UK200000000001') {
        return fullRecord
      }
      throw Object.assign(new Error('Not Found'), {
        statusCode: statusCodes.notFound
      })
    })
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
    expect(result).toMatch(
      /Genetic dam ear tag\s*<\/dt>\s*<dd[^>]*>\s*UK 200000 000098\s*<\/dd>/
    )
    expect(result).not.toContain('href="/cattle/animals/UK200000000098"')
  })

  test('it links both dams of a surrogate birth that are on the holding for a back-office user', async () => {
    // Arrange
    const user = createUser()
    const surrogateRecord = {
      ...fullRecord,
      dam_type: 'surrogate',
      surrogate_tag: 'UK200000000097'
    }
    mocks.getCattleDetails.mockImplementation(async (earTag) => {
      if (earTag === 'UK200000000001') {
        return surrogateRecord
      }
      return { ...fullRecord, eartag: earTag }
    })
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
    expect(result).toEqual(
      expect.stringContaining('href="/cattle/animals/UK200000000098"')
    )
    expect(result).toEqual(
      expect.stringContaining('href="/cattle/animals/UK200000000097"')
    )
  })

  test('it still renders, with the dam as plain text, when the dam lookup fails for a reason other than not found', async () => {
    // Arrange
    const user = createUser()
    mocks.getCattleDetails.mockImplementation(async (earTag) => {
      if (earTag === 'UK200000000001') {
        return fullRecord
      }
      throw Object.assign(new Error('Internal Server Error'), {
        statusCode: statusCodes.internalServerError
      })
    })
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
    expect(result).toMatch(
      /Genetic dam ear tag\s*<\/dt>\s*<dd[^>]*>\s*UK 200000 000098\s*<\/dd>/
    )
    expect(result).not.toContain('href="/cattle/animals/UK200000000098"')
  })

  test('it still renders, with the dam as plain text, when the dam lookup throws without a status', async () => {
    // Arrange
    const user = createUser()
    mocks.getCattleDetails.mockImplementation(async (earTag) => {
      if (earTag === 'UK200000000001') {
        return fullRecord
      }
      throw new TypeError('fetch failed')
    })
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
    expect(result).toMatch(
      /Genetic dam ear tag\s*<\/dt>\s*<dd[^>]*>\s*UK 200000 000098\s*<\/dd>/
    )
    expect(result).not.toContain('href="/cattle/animals/UK200000000098"')
  })

  test('it does not link a dam whose location is unknown', async () => {
    // Arrange
    const user = createUser()
    mocks.getCattleDetails.mockImplementation(async (earTag) => {
      if (earTag === 'UK200000000001') {
        return fullRecord
      }
      return {
        ...fullRecord,
        eartag: earTag,
        current_location: {
          identifier: null,
          sub_identifier: null,
          full_identifier: null,
          name: null,
          premises_type: null
        }
      }
    })
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
    expect(result).not.toContain('href="/cattle/animals/UK200000000098"')
  })

  test('it links only the surrogate dam when no genetic dam tag is recorded', async () => {
    // Arrange
    const user = createUser()
    const surrogateOnly = {
      ...fullRecord,
      dam_type: 'surrogate',
      genetic_dam_tag: null,
      surrogate_tag: 'UK200000000097'
    }
    mocks.getCattleDetails.mockImplementation(async (earTag) => {
      if (earTag === 'UK200000000001') {
        return surrogateOnly
      }
      return { ...fullRecord, eartag: earTag }
    })
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
    expect(mocks.getCattleDetails).toHaveBeenCalledTimes(2)
    expect(result).toEqual(
      expect.stringContaining('href="/cattle/animals/UK200000000097"')
    )
  })

  test('it never links a dam, and does not look it up, for a front-office user', async () => {
    // Arrange
    const user = createUser()
    mocks.getCattleDetails.mockResolvedValue(fullRecord)
    const request = {
      method: 'GET',
      url: '/animals/UK200000000001',
      auth: spokeAuth(user, 'front-office'),
      headers: fromAnimalsOnHolding()
    }

    // Act
    const { result, statusCode } = await server.inject(request)

    // Assert
    expect(statusCode).toBe(statusCodes.ok)
    expect(mocks.getCattleDetails).toHaveBeenCalledTimes(1)
    expect(result).not.toContain('href="/cattle/animals/UK200000000098"')
  })
})
