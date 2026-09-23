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
import { getCannedCattleDetails } from '#server/services/canned-animals.js'

vi.mock('#server/services/canned-animals.js')

const mocks = {
  getCannedCattleDetails: vi.mocked(getCannedCattleDetails)
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

describe('cattleDetailsController', () => {
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

  test('it renders the cattle details for an authenticated user', async () => {
    // Arrange
    const jwt = await createHubJwt()
    mocks.getCannedCattleDetails.mockReturnValue(fullRecord)
    const request = {
      method: 'GET',
      url: '/animals/UK200000000001',
      headers: {
        cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}`
      }
    }

    // Act
    const { result, statusCode } = await server.inject(request)

    // Assert
    expect(statusCode).toBe(statusCodes.ok)
    expect(mocks.getCannedCattleDetails).toHaveBeenCalledWith('UK200000000001')
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
  })

  test('it shows "Not supplied", styled as an error, for missing required fields', async () => {
    // Arrange
    const jwt = await createHubJwt()
    mocks.getCannedCattleDetails.mockReturnValue({
      ...fullRecord,
      sex: null,
      date_registered: null
    })
    const request = {
      method: 'GET',
      url: '/animals/UK200000000001',
      headers: {
        cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}`
      }
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
    const jwt = await createHubJwt()
    mocks.getCannedCattleDetails.mockReturnValue({
      ...fullRecord,
      sire_tag: null,
      sire_name: null
    })
    const request = {
      method: 'GET',
      url: '/animals/UK200000000001',
      headers: {
        cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}`
      }
    }

    // Act
    const { result } = await server.inject(request)

    // Assert
    expect(result).toEqual(expect.stringContaining('No sire details recorded.'))
  })

  test('it shows "Not required", without error styling, for the missing half of the sire pair', async () => {
    // Arrange
    const jwt = await createHubJwt()
    mocks.getCannedCattleDetails.mockReturnValue({
      ...fullRecord,
      sire_tag: null,
      sire_name: 'Highland Monarch'
    })
    const request = {
      method: 'GET',
      url: '/animals/UK200000000001',
      headers: {
        cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}`
      }
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
    const jwt = await createHubJwt()
    mocks.getCannedCattleDetails.mockReturnValue({
      ...fullRecord,
      dam_type: 'surrogate',
      genetic_dam_tag: 'UK200000000090',
      surrogate_tag: 'UK200000000091'
    })
    const request = {
      method: 'GET',
      url: '/animals/UK200000000001',
      headers: {
        cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}`
      }
    }

    // Act
    const { result } = await server.inject(request)

    // Assert
    expect(result).toEqual(expect.stringContaining('Surrogate dam ear tag'))
    expect(result).toEqual(expect.stringContaining('UK 200000 000091'))
  })

  test('it returns not found when there is no matching cattle record', async () => {
    // Arrange
    const jwt = await createHubJwt()
    mocks.getCannedCattleDetails.mockReturnValue(undefined)
    const request = {
      method: 'GET',
      url: '/animals/UK999999999999',
      headers: {
        cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}`
      }
    }

    // Act
    const { statusCode } = await server.inject(request)

    // Assert
    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('it redirects an unauthenticated request to the hub login', async () => {
    // Arrange
    const request = {
      method: 'GET',
      url: '/animals/UK200000000001'
    }

    // Act
    const { statusCode, headers } = await server.inject(request)

    // Assert
    expect(statusCode).toBe(302)
    expect(headers.location).toBeDefined()
    expect(mocks.getCannedCattleDetails).not.toHaveBeenCalled()
  })
})
