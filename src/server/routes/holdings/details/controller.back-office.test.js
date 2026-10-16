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
  getHoldingDetails: vi.mocked(cattleHomeBe4FeClient.getHoldingDetails)
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

describe('holdingDetailsController (back office)', () => {
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

  test('it renders the back-office layout with the holding information', async () => {
    // Arrange
    const user = createUser()
    mocks.getHoldingDetails.mockResolvedValueOnce({
      cph: '12/345/0001',
      name: 'Oakfield Farm',
      holding_type: 'AH',
      start_date: '2008-03-17T00:00:00Z',
      address: ['Oakfield Farm', 'Church Lane', 'Shrewsbury', 'England'],
      herd_marks: [{ mark: 'UK 654322', species: ['cattle'] }],
      associations: []
    })

    // Act
    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: '/holdings/12/345/0001',
      auth: spokeAuth(user, 'back-office')
    })

    // Assert
    expect(statusCode).toBe(statusCodes.ok)
    expect(mocks.getHoldingDetails).toHaveBeenCalledWith('12/345/0001')
    expect(result).toEqual(
      expect.stringContaining('href="/holdings" class="govuk-back-link"')
    )
    expect(result).toEqual(
      expect.stringContaining('<span class="govuk-caption-l">Holding</span>')
    )
    expect(result).toEqual(
      expect.stringContaining(
        '<h1 class="govuk-heading-l">12/345/0001 - Oakfield Farm</h1>'
      )
    )
    expect(result).toEqual(
      expect.stringContaining(
        '12/345/0001 - Oakfield Farm - Holding details - Cattle - Livestock Information'
      )
    )
    expect(result).toEqual(
      expect.stringContaining('govuk-grid-column-two-thirds')
    )
    expect(result).not.toEqual(
      expect.stringContaining('govuk-grid-column-full')
    )
    expect(result).toEqual(
      expect.stringContaining(
        '<h2 class="govuk-heading-m">Holding information</h2>'
      )
    )
    expect(result).toMatch(
      /CPH number[\s\S]*Holding type[\s\S]*Status[\s\S]*Holding start date[\s\S]*Holding name[\s\S]*Address[\s\S]*<\/dl>[\s\S]*<dl[^>]*>[\s\S]*Herd mark/
    )
    expect(result).toMatch(
      /Holding start date\s*<\/dt>\s*<dd[^>]*>\s*17 March 2008\s*<\/dd>/
    )
    expect(result).toMatch(
      /Holding type\s*<\/dt>\s*<dd[^>]*>\s*Agricultural Holding \(AH\)\s*<\/dd>/
    )
    expect(result).toMatch(/Status\s*<\/dt>\s*<dd[^>]*>\s*Active\s*<\/dd>/)
    expect(result).toMatch(
      /Holding name\s*<\/dt>\s*<dd[^>]*>\s*Oakfield Farm\s*<\/dd>/
    )
    expect(result).toEqual(
      expect.stringContaining(
        'Oakfield Farm<br>Church Lane<br>Shrewsbury<br>England'
      )
    )
    expect(result).toMatch(
      /Herd mark\s*<\/dt>\s*<dd[^>]*>\s*UK 654322\s*<\/dd>/
    )
    expect(result).toEqual(
      expect.stringContaining('href="/cattle/holdings/12/345/0001/animals"')
    )
  })

  test('it shows the CPH alone as the heading and title, and omits the holding name row, when the holding has no name', async () => {
    // Arrange
    const user = createUser()
    mocks.getHoldingDetails.mockResolvedValueOnce({
      cph: '12/345/0001',
      name: null,
      holding_type: 'AH',
      start_date: '2008-03-17T00:00:00Z',
      address: ['Church Lane'],
      herd_marks: [],
      associations: []
    })

    // Act
    const { result } = await server.inject({
      method: 'GET',
      url: '/holdings/12/345/0001',
      auth: spokeAuth(user, 'back-office')
    })

    // Assert
    expect(result).toEqual(
      expect.stringContaining('<h1 class="govuk-heading-l">12/345/0001</h1>')
    )
    expect(result).toEqual(
      expect.stringContaining(
        '12/345/0001 - Holding details - Cattle - Livestock Information'
      )
    )
    expect(result).not.toEqual(expect.stringContaining('Holding name'))
    expect(result).not.toEqual(expect.stringContaining('govuk-tag--red'))
  })

  test('it shows the status as Inactive when the holding is not active', async () => {
    // Arrange
    const user = createUser()
    mocks.getHoldingDetails.mockResolvedValueOnce({
      cph: '22/008/0008',
      name: 'Cancelled Holding',
      holding_type: 'AH',
      address: ['22/008/0008', 'Lavendon', 'Buckinghamshire', 'England'],
      herd_marks: [],
      associations: [],
      start_date: '2005-01-01T00:00:00+00:00',
      end_date: '2020-06-30T00:00:00+00:00',
      active: false
    })

    // Act
    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: '/holdings/22/008/0008',
      auth: spokeAuth(user, 'back-office')
    })

    // Assert
    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toMatch(/Status\s*<\/dt>\s*<dd[^>]*>\s*Inactive\s*<\/dd>/)
  })

  test('it shows the bare code for an unknown holding type', async () => {
    // Arrange
    const user = createUser()
    mocks.getHoldingDetails.mockResolvedValueOnce({
      cph: '12/345/0001',
      name: 'Oakfield Farm',
      holding_type: 'ZZ',
      address: [],
      herd_marks: [],
      associations: []
    })

    // Act
    const { result } = await server.inject({
      method: 'GET',
      url: '/holdings/12/345/0001',
      auth: spokeAuth(user, 'back-office')
    })

    // Assert
    expect(result).toMatch(/Holding type\s*<\/dt>\s*<dd[^>]*>\s*ZZ\s*<\/dd>/)
  })

  test('it shows the registered keeper details with mailto and tel links', async () => {
    // Arrange
    const user = createUser()
    mocks.getHoldingDetails.mockResolvedValueOnce({
      cph: '12/345/0001',
      name: 'Oakfield Farm',
      holding_type: 'AH',
      address: [],
      herd_marks: [],
      associations: [
        {
          customer_number: 'C0',
          name: 'Owner Person',
          address: [],
          roles: [{ code: 'owner', species: ['cattle'] }]
        },
        {
          customer_number: 'C1',
          name: null,
          first_name: 'James',
          last_name: 'Williams',
          email: 'james.williams@example.com',
          telephone: null,
          mobile: '07700900001',
          address: ['1 Church Lane', 'Shrewsbury', 'SY4 1AB', 'England'],
          roles: [
            { code: 'holder', species: ['cattle'] },
            { code: 'keeper', species: ['cattle'] }
          ]
        }
      ]
    })

    // Act
    const { result } = await server.inject({
      method: 'GET',
      url: '/holdings/12/345/0001',
      auth: spokeAuth(user, 'back-office')
    })

    // Assert
    expect(result).toEqual(
      expect.stringContaining(
        '<h2 class="govuk-heading-m">Registered keeper details</h2>'
      )
    )
    expect(result).toMatch(
      /Name\s*<\/dt>\s*<dd[^>]*>\s*James Williams\s*<\/dd>/
    )
    expect(result).toEqual(
      expect.stringContaining(
        '<a class="govuk-link" href="mailto:james.williams@example.com">james.williams@example.com</a>'
      )
    )
    expect(result).toEqual(
      expect.stringContaining(
        '<a class="govuk-link" href="tel:07700900001">07700 900001</a>'
      )
    )
    expect(result).toEqual(
      expect.stringContaining(
        '1 Church Lane<br>Shrewsbury<br>SY4 1AB<br>England'
      )
    )
    expect(result).not.toEqual(expect.stringContaining('Owner Person'))
    expect(result).not.toEqual(
      expect.stringContaining('No registered keeper details are recorded.')
    )
  })

  test('it shows "Not supplied" for keeper fields that are not recorded', async () => {
    // Arrange
    const user = createUser()
    mocks.getHoldingDetails.mockResolvedValueOnce({
      cph: '12/345/0001',
      name: 'Oakfield Farm',
      holding_type: 'AH',
      start_date: '2008-03-17T00:00:00Z',
      address: ['Church Lane'],
      herd_marks: [],
      associations: [
        {
          customer_number: 'C1',
          address: [],
          roles: [{ code: 'keeper', species: ['cattle'] }]
        }
      ]
    })

    // Act
    const { result } = await server.inject({
      method: 'GET',
      url: '/holdings/12/345/0001',
      auth: spokeAuth(user, 'back-office')
    })

    // Assert
    const notSuppliedCount = (
      result.match(
        /<strong class="govuk-tag govuk-tag--red">Not supplied<\/strong>/g
      ) ?? []
    ).length
    expect(notSuppliedCount).toBe(4)
    expect(result).not.toEqual(expect.stringContaining('mailto:'))
    expect(result).not.toEqual(expect.stringContaining('tel:'))
  })

  test('it escapes markup in the keeper details', async () => {
    // Arrange
    const user = createUser()
    mocks.getHoldingDetails.mockResolvedValueOnce({
      cph: '12/345/0001',
      name: 'Oakfield Farm',
      holding_type: 'AH',
      address: [],
      herd_marks: [],
      associations: [
        {
          customer_number: 'C1',
          name: 'Tom "<b>" & Co',
          email: 'a"<b>&@example.com',
          telephone: '07700 "<b>"&',
          address: ['1 "<b>" & Lane'],
          roles: [{ code: 'keeper', species: ['cattle'] }]
        }
      ]
    })

    // Act
    const { result } = await server.inject({
      method: 'GET',
      url: '/holdings/12/345/0001',
      auth: spokeAuth(user, 'back-office')
    })

    // Assert
    expect(result).toEqual(
      expect.stringContaining('Tom &quot;&lt;b&gt;&quot; &amp; Co')
    )
    expect(result).toEqual(
      expect.stringContaining(
        'href="mailto:a&quot;&lt;b&gt;&amp;@example.com">a&quot;&lt;b&gt;&amp;@example.com</a>'
      )
    )
    expect(result).toEqual(
      expect.stringContaining(
        'href="tel:07700">07700 &quot;&lt;b&gt;&quot;&amp;</a>'
      )
    )
    expect(result).toEqual(
      expect.stringContaining('1 &quot;&lt;b&gt;&quot; &amp; Lane')
    )
    expect(result).not.toEqual(expect.stringContaining('"<b>"'))
    expect(result).not.toEqual(expect.stringContaining('a"<b>&'))
    expect(result).not.toEqual(expect.stringContaining('& Co'))
    expect(result).not.toEqual(expect.stringContaining('& Lane'))
  })

  test('it matches the keeper role case-insensitively', async () => {
    // Arrange
    const user = createUser()
    mocks.getHoldingDetails.mockResolvedValueOnce({
      cph: '12/345/0001',
      name: 'Oakfield Farm',
      holding_type: 'AH',
      address: [],
      herd_marks: [],
      associations: [
        {
          customer_number: 'C1',
          name: 'James Williams',
          address: [],
          roles: [{ code: 'KEEPER', species: ['cattle'] }]
        }
      ]
    })

    // Act
    const { result } = await server.inject({
      method: 'GET',
      url: '/holdings/12/345/0001',
      auth: spokeAuth(user, 'back-office')
    })

    // Assert
    expect(result).toEqual(expect.stringContaining('James Williams'))
    expect(result).not.toEqual(
      expect.stringContaining('No registered keeper details are recorded.')
    )
  })

  test('it shows the keeper empty state when no association is a keeper', async () => {
    // Arrange
    const user = createUser()
    mocks.getHoldingDetails.mockResolvedValueOnce({
      cph: '12/345/0001',
      name: 'Oakfield Farm',
      holding_type: 'AH',
      address: [],
      herd_marks: [],
      associations: [
        {
          customer_number: 'C1',
          name: 'Owen Owner',
          address: [],
          roles: [{ code: 'LIVESTOCKOWNER', species: ['cattle'] }]
        }
      ]
    })

    // Act
    const { result } = await server.inject({
      method: 'GET',
      url: '/holdings/12/345/0001',
      auth: spokeAuth(user, 'back-office')
    })

    // Assert
    expect(result).toEqual(
      expect.stringContaining(
        '<h2 class="govuk-heading-m">Registered keeper details</h2>'
      )
    )
    expect(result).toEqual(
      expect.stringContaining(
        '<p class="govuk-body">No registered keeper details are recorded.</p>'
      )
    )
    expect(result).not.toEqual(expect.stringContaining('Owen Owner'))
  })

  test('it labels an organisation keeper with its business name', async () => {
    // Arrange
    const user = createUser()
    mocks.getHoldingDetails.mockResolvedValueOnce({
      cph: '12/345/0001',
      name: 'Oakfield Farm',
      holding_type: 'AH',
      address: [],
      herd_marks: [],
      associations: [
        {
          customer_number: 'C2',
          name: 'Oakfield Livestock Ltd',
          party_type: 'Organisation',
          email: null,
          telephone: null,
          mobile: null,
          address: [],
          roles: [{ code: 'keeper', species: ['cattle'] }]
        }
      ]
    })
    const request = {
      method: 'GET',
      url: '/holdings/12/345/0001',
      auth: spokeAuth(user, 'back-office')
    }

    // Act
    const { result } = await server.inject(request)

    // Assert
    expect(result).toEqual(expect.stringContaining('Business name'))
    expect(result).toEqual(expect.stringContaining('Oakfield Livestock Ltd'))
    expect(result).not.toMatch(/govuk-summary-list__key">\s*Name\s*</)
  })

  test('it shows the keeper empty state when the holding has no associations', async () => {
    // Arrange
    const user = createUser()
    mocks.getHoldingDetails.mockResolvedValueOnce({
      cph: '12/345/0001',
      name: 'Oakfield Farm',
      address: [],
      herd_marks: []
    })

    // Act
    const { result } = await server.inject({
      method: 'GET',
      url: '/holdings/12/345/0001',
      auth: spokeAuth(user, 'back-office')
    })

    // Assert
    expect(result).toEqual(
      expect.stringContaining(
        '<p class="govuk-body">No registered keeper details are recorded.</p>'
      )
    )
  })
})
