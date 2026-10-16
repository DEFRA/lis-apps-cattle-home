import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
  vi
} from 'vitest'

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

describe('holdingDetailsController (back office) back link', () => {
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

  test('it links back to the holdings search a back-office user came from, carrying it on the tabs', async () => {
    // Arrange
    const user = createUser()
    mocks.getHoldingDetails.mockResolvedValueOnce({
      cph: '22/001/0001',
      name: 'Oakfield Farm',
      address: [],
      herd_marks: []
    })
    const request = {
      method: 'GET',
      url: '/holdings/22/001/0001',
      auth: spokeAuth(user, 'back-office'),
      headers: {
        'x-forwarded-host': 'back-office.lis.defra',
        referer: 'https://back-office.lis.defra/holdings?search=oak&page=2'
      }
    }

    // Act
    const { result } = await server.inject(request)

    // Assert
    expect(result).toEqual(
      expect.stringContaining(
        'href="/holdings?search=oak&amp;page=2" class="govuk-back-link"'
      )
    )
    expect(result).toMatch(
      /href="\/cattle\/holdings\/22\/001\/0001\/animals\?referrer=[0-9a-f-]{36}"/
    )
  })

  test('it links back to the holdings list when a back-office user did not come from a search', async () => {
    // Arrange
    const user = createUser()
    mocks.getHoldingDetails.mockResolvedValueOnce({
      cph: '22/001/0001',
      name: 'Oakfield Farm',
      address: [],
      herd_marks: []
    })
    const request = {
      method: 'GET',
      url: '/holdings/22/001/0001',
      auth: spokeAuth(user, 'back-office')
    }

    // Act
    const { result } = await server.inject(request)

    // Assert
    expect(result).toEqual(
      expect.stringContaining('href="/holdings" class="govuk-back-link"')
    )
    expect(result).not.toEqual(expect.stringContaining('referrer='))
  })

  test('it links back to the holdings list when a back-office user came from a page that is not the list', async () => {
    // Arrange
    const user = createUser()
    mocks.getHoldingDetails.mockResolvedValueOnce({
      cph: '22/001/0001',
      name: 'Oakfield Farm',
      address: [],
      herd_marks: []
    })
    const request = {
      method: 'GET',
      url: '/holdings/22/001/0001',
      auth: spokeAuth(user, 'back-office'),
      headers: {
        'x-forwarded-host': 'back-office.lis.defra',
        referer:
          'https://back-office.lis.defra/cattle/holdings/22/002/0002/animals'
      }
    }

    // Act
    const { result } = await server.inject(request)

    // Assert
    expect(result).toEqual(
      expect.stringContaining('href="/holdings" class="govuk-back-link"')
    )
    expect(result).not.toEqual(expect.stringContaining('referrer='))
  })
})
