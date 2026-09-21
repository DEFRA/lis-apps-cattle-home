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
import { cphFromParams } from './controller.js'

const mocks = {
  getHoldingDetails: vi.spyOn(cattleHomeBe4FeClient, 'getHoldingDetails')
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

describe('cphFromParams()', () => {
  test('it builds a CPH from the three route segments', () => {
    // Arrange
    const params = { county: '22', parish: '001', holding: '0001' }

    // Act
    const cph = cphFromParams(params)

    // Assert
    expect(cph).toBe('22/001/0001')
  })

  test('it returns null when a segment is missing', () => {
    // Arrange
    const params = { county: '22', parish: '001' }

    // Act
    const cph = cphFromParams(params)

    // Assert
    expect(cph).toBeNull()
  })

  test('it returns null when no params are given', () => {
    // Act
    const cph = cphFromParams()

    // Assert
    expect(cph).toBeNull()
  })
})

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

  test('it renders the Oakfield Farm holding for an authenticated user', async () => {
    // Arrange
    const jwt = await createHubJwt()
    const request = {
      method: 'GET',
      url: '/holdings/22/001/0001',
      headers: {
        cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}`
      }
    }
    mocks.getHoldingDetails.mockResolvedValue({
      cph: '22/001/0001',
      name: 'Oakfield Farm',
      business_name: null,
      address: [
        'Oakfield Farm',
        'Church Lane',
        'Shrewsbury',
        'Shropshire',
        'SY4 1AB',
        'England'
      ],
      herd_marks: ['UK 324537']
    })

    // Act
    const { result, statusCode } = await server.inject(request)

    // Assert
    expect(statusCode).toBe(statusCodes.ok)
    expect(mocks.getHoldingDetails).toHaveBeenCalledWith('22/001/0001')
    expect(result).toEqual(
      expect.stringContaining(
        'Holding details - Oakfield Farm - Cattle - Livestock Information'
      )
    )
    expect(result).toEqual(
      expect.stringContaining(
        '<h1 class="govuk-heading-l">Holding details</h1>'
      )
    )
    expect(result).toEqual(expect.stringContaining('govuk-grid-column-full'))
    expect(result).toEqual(expect.stringContaining('Oakfield Farm'))
    expect(result).toEqual(expect.stringContaining('22/001/0001'))
    expect(result).toEqual(
      expect.stringContaining(
        '<strong class="govuk-tag govuk-tag--red">Not supplied</strong>'
      )
    )
    expect(result).toEqual(expect.stringContaining('UK 324537'))
    expect(result).not.toEqual(expect.stringContaining('Registered keeper'))
    expect(result).toEqual(
      expect.stringContaining('href="/cattle/holdings/22/001/0001"')
    )
  })

  test('it redirects an unauthenticated request to the hub login', async () => {
    // Arrange
    const request = {
      method: 'GET',
      url: '/holdings/22/001/0001'
    }

    // Act
    const { statusCode, headers } = await server.inject(request)

    // Assert
    expect(statusCode).toBe(302)
    expect(headers.location).toBeDefined()
    expect(mocks.getHoldingDetails).not.toHaveBeenCalled()
  })

  test('it returns not found when the BE4FE has no matching holding', async () => {
    // Arrange
    const jwt = await createHubJwt()
    const request = {
      method: 'GET',
      url: '/holdings/99/999/9999',
      headers: {
        cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}`
      }
    }
    const notFoundError = new Error('Request failed - 404')
    notFoundError.statusCode = statusCodes.notFound
    mocks.getHoldingDetails.mockRejectedValue(notFoundError)

    // Act
    const { statusCode } = await server.inject(request)

    // Assert
    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('it shows the CPH as the caption, above the "Holding details" heading, when the holding has no name', async () => {
    // Arrange
    const jwt = await createHubJwt()
    const request = {
      method: 'GET',
      url: '/holdings/22/098/0098',
      headers: {
        cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}`
      }
    }
    mocks.getHoldingDetails.mockResolvedValue({
      cph: '22/098/0098',
      name: null,
      business_name: 'Unnamed Holding Ltd',
      address: [
        'Long Lane',
        'Lavendon',
        'Buckinghamshire',
        'MK1 1AZ',
        'England'
      ],
      herd_marks: []
    })

    // Act
    const { result } = await server.inject(request)

    // Assert
    expect(result).toEqual(
      expect.stringContaining(
        '<span class="govuk-caption-l">22/098/0098</span>'
      )
    )
    expect(result).toEqual(
      expect.stringContaining(
        '<h1 class="govuk-heading-l">Holding details</h1>'
      )
    )
  })

  test('it shows "Not supplied", styled as an error, for a missing holding name and herd mark', async () => {
    // Arrange
    const jwt = await createHubJwt()
    const request = {
      method: 'GET',
      url: '/holdings/22/098/0098',
      headers: {
        cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}`
      }
    }
    mocks.getHoldingDetails.mockResolvedValue({
      cph: '22/098/0098',
      name: null,
      business_name: 'Unnamed Holding Ltd',
      address: [
        'Long Lane',
        'Lavendon',
        'Buckinghamshire',
        'MK1 1AZ',
        'England'
      ],
      herd_marks: []
    })

    // Act
    const { result } = await server.inject(request)

    // Assert
    const notSuppliedCount = (
      result.match(
        /<strong class="govuk-tag govuk-tag--red">Not supplied<\/strong>/g
      ) ?? []
    ).length
    expect(notSuppliedCount).toBe(2)
    expect(result).toEqual(expect.stringContaining('Unnamed Holding Ltd'))
    expect(result).toEqual(expect.stringContaining('Long Lane'))
  })

  test('it shows "Not supplied" for the address when none is recorded', async () => {
    // Arrange
    const jwt = await createHubJwt()
    const request = {
      method: 'GET',
      url: '/holdings/22/097/0097',
      headers: {
        cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}`
      }
    }
    mocks.getHoldingDetails.mockResolvedValue({
      cph: '22/097/0097',
      name: 'No Address Farm',
      business_name: 'No Address Ltd',
      address: [],
      herd_marks: ['UK 999999']
    })

    // Act
    const { result } = await server.inject(request)

    // Assert
    expect(result).toEqual(
      expect.stringContaining(
        '<strong class="govuk-tag govuk-tag--red">Not supplied</strong>'
      )
    )
    expect(result).toEqual(expect.stringContaining('No Address Farm'))
    expect(result).toEqual(expect.stringContaining('UK 999999'))
  })
})
