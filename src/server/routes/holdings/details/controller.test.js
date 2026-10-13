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
import { cphFromParams } from './controller.js'

const mocks = {
  getHoldingDetails: vi.spyOn(cattleHomeBe4FeClient, 'getHoldingDetails')
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
    const user = createUser()
    const request = {
      method: 'GET',
      url: '/holdings/22/001/0001',
      auth: spokeAuth(user)
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
      herd_marks: [{ mark: 'UK 324537', species: ['cattle'] }]
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
    expect(result).not.toEqual(expect.stringContaining('Not supplied'))
    expect(result).not.toEqual(expect.stringContaining('Business name'))
    expect(result).toEqual(expect.stringContaining('UK 324537'))
    expect(result).not.toEqual(expect.stringContaining('Registered keeper'))
    expect(result).toEqual(
      expect.stringContaining('href="/cattle/holdings/22/001/0001"')
    )
  })

  test('it shows a single herd mark under the singular key', async () => {
    // Arrange
    const user = createUser()
    mocks.getHoldingDetails.mockResolvedValueOnce({
      cph: '22/001/0001',
      name: 'Oakfield Farm',
      address: ['Oakfield Farm'],
      herd_marks: [
        { mark: 'UK 324537', start_date: '2020-01-01', species: ['cattle'] }
      ]
    })

    // Act
    const { result } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001',
      auth: spokeAuth(user)
    })

    // Assert
    expect(result).toMatch(
      /Herd mark\s*<\/dt>\s*<dd[^>]*>\s*UK 324537\s*<\/dd>/
    )
    expect(result).not.toEqual(expect.stringContaining('Herd marks'))
    expect(result).not.toEqual(expect.stringContaining('[object Object]'))
  })

  test('it stacks several herd marks under the plural key', async () => {
    // Arrange
    const user = createUser()
    mocks.getHoldingDetails.mockResolvedValueOnce({
      cph: '22/001/0001',
      name: 'Oakfield Farm',
      address: ['Oakfield Farm'],
      herd_marks: [
        { mark: 'UK 324537', species: ['cattle'] },
        { mark: 'UK 324538', species: ['sheep'] }
      ]
    })

    // Act
    const { result } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001',
      auth: spokeAuth(user)
    })

    // Assert
    expect(result).toMatch(/Herd marks\s*<\/dt>/)
    expect(result).toEqual(expect.stringContaining('UK 324537<br>UK 324538'))
  })

  test('it shows "Not recorded" as plain text when the holding has no herd marks', async () => {
    // Arrange
    const user = createUser()
    mocks.getHoldingDetails.mockResolvedValueOnce({
      cph: '22/001/0001',
      name: 'Oakfield Farm',
      address: ['Oakfield Farm'],
      herd_marks: []
    })

    // Act
    const { result } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001',
      auth: spokeAuth(user)
    })

    // Assert
    expect(result).toMatch(
      /Herd mark\s*<\/dt>\s*<dd[^>]*>\s*Not recorded\s*<\/dd>/
    )
    expect(result).not.toEqual(expect.stringContaining('govuk-tag--red'))
  })

  test('it keeps the front-office layout without the back-office sections', async () => {
    // Arrange
    const user = createUser()
    mocks.getHoldingDetails.mockResolvedValueOnce({
      cph: '22/001/0001',
      name: 'Oakfield Farm',
      holding_type: 'AH',
      address: ['Oakfield Farm'],
      herd_marks: [],
      associations: [
        {
          customer_number: 'C1',
          name: 'James Williams',
          address: [],
          roles: [{ code: 'LIVESTOCKKEEPER' }]
        }
      ]
    })

    // Act
    const { result } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001',
      auth: spokeAuth(user)
    })

    // Assert
    expect(result).toEqual(
      expect.stringContaining(
        '<span class="govuk-caption-l">Oakfield Farm</span>'
      )
    )
    expect(result).toEqual(
      expect.stringContaining(
        '<h1 class="govuk-heading-l">Holding details</h1>'
      )
    )
    expect(result).toEqual(expect.stringContaining('govuk-grid-column-full'))
    expect(result).not.toEqual(expect.stringContaining('Holding information'))
    expect(result).not.toEqual(expect.stringContaining('Holding type'))
    expect(result).not.toEqual(expect.stringContaining('Status'))
    expect(result).not.toEqual(expect.stringContaining('Registered keeper'))
    expect(result).not.toEqual(expect.stringContaining('James Williams'))
  })

  test('it rejects a request without a hub service token', async () => {
    // Arrange
    const request = {
      method: 'GET',
      url: '/holdings/22/001/0001'
    }

    // Act
    const { statusCode, result } = await server.inject(request)

    // Assert
    expect(statusCode).toBe(statusCodes.unauthorized)
    expect(result).toEqual({ message: 'Service authentication required' })
    expect(mocks.getHoldingDetails).not.toHaveBeenCalled()
  })

  test('it returns not found when the BE4FE has no matching holding', async () => {
    // Arrange
    const user = createUser()
    const request = {
      method: 'GET',
      url: '/holdings/99/999/9999',
      auth: spokeAuth(user)
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
    const user = createUser()
    const request = {
      method: 'GET',
      url: '/holdings/22/098/0098',
      auth: spokeAuth(user)
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

  test('it shows "Not supplied", styled as an error, for a missing holding name and "Not recorded" for a missing herd mark', async () => {
    // Arrange
    const user = createUser()
    const request = {
      method: 'GET',
      url: '/holdings/22/098/0098',
      auth: spokeAuth(user)
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
    expect(notSuppliedCount).toBe(1)
    expect(result).toMatch(
      /Herd mark\s*<\/dt>\s*<dd[^>]*>\s*Not recorded\s*<\/dd>/
    )
    expect(result).not.toEqual(expect.stringContaining('Unnamed Holding Ltd'))
    expect(result).toEqual(expect.stringContaining('Long Lane'))
  })

  test('it shows "Not supplied" for the address when none is recorded', async () => {
    // Arrange
    const user = createUser()
    const request = {
      method: 'GET',
      url: '/holdings/22/097/0097',
      auth: spokeAuth(user)
    }
    mocks.getHoldingDetails.mockResolvedValue({
      cph: '22/097/0097',
      name: 'No Address Farm',
      business_name: 'No Address Ltd',
      address: [],
      herd_marks: [{ mark: 'UK 999999', species: ['cattle'] }]
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

  test('it shows no back link for a front-office user', async () => {
    // Arrange
    const user = createUser()
    mocks.getHoldingDetails.mockResolvedValue({
      cph: '22/001/0001',
      name: 'Oakfield Farm',
      address: [],
      herd_marks: []
    })
    const request = {
      method: 'GET',
      url: '/holdings/22/001/0001',
      auth: spokeAuth(user),
      headers: {
        'x-forwarded-host': 'front-office.lis.defra',
        referer: 'https://front-office.lis.defra/holdings?search=oak'
      }
    }

    // Act
    const { result } = await server.inject(request)

    // Assert
    expect(result).not.toEqual(expect.stringContaining('govuk-back-link'))
    expect(result).not.toEqual(expect.stringContaining('referrer='))
  })
})
