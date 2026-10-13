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
  getCattleForCph: vi.mocked(cattleHomeBe4FeClient.getCattleOnHolding),
  getHoldingDetails: vi.mocked(cattleHomeBe4FeClient.getHoldingDetails)
}

// Inline fixtures: this suite tests what the controller renders and what it
// asks the client for. Search, sort and paging behaviour is covered by
// animals/search and animals/paginate.
const animal = {
  cattle_id: 'UK200000000001',
  eartag: 'UK200000000001',
  date_of_birth: '2023-02-01',
  date_on_cph: '2023-02-10',
  sex: 'Male',
  breed_code: 'AA',
  breed_name: 'Aberdeen Angus'
}

const incompleteAnimal = {
  cattle_id: 'UK400000000001',
  eartag: 'UK400000000001',
  sex: 'Female',
  breed_code: 'AA',
  breed_name: 'Aberdeen Angus'
}

function page(animals, overrides = {}) {
  return {
    animals,
    totalItems: animals.length,
    totalPages: 1,
    currentPage: 1,
    itemsPerPage: 25,
    ...overrides
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

describe('animalsOnHoldingController (back office)', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()

    mocks.getCattleForCph.mockResolvedValue(page([animal]))
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    mocks.getCattleForCph.mockResolvedValue(page([animal]))
    mocks.getHoldingDetails.mockResolvedValue({
      cph: '22/001/0001',
      name: 'Oakfield Farm'
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  test('it renders the back-office layout for a back-office user', async () => {
    // Arrange
    const user = createUser()
    mocks.getCattleForCph.mockResolvedValue(
      page([animal], { totalItems: 34, totalPages: 2 })
    )

    // Act
    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001/animals',
      auth: spokeAuth(user, 'back-office')
    })

    // Assert
    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(
      expect.stringContaining('href="/holdings" class="govuk-back-link"')
    )
    expect(result).toEqual(
      expect.stringContaining('<span class="govuk-caption-l">Holding</span>')
    )
    expect(result).toEqual(
      expect.stringContaining(
        '<h1 class="govuk-heading-l">22/001/0001 - Oakfield Farm</h1>'
      )
    )
    expect(result).toEqual(
      expect.stringContaining(
        'Animals on holding (page 1 of 2) - 22/001/0001 - Oakfield Farm'
      )
    )
    expect(result).toEqual(expect.stringContaining('Search animals on holding'))
    expect(result).not.toEqual(
      expect.stringContaining('Search animals on your holding')
    )
    expect(result).not.toEqual(expect.stringContaining('Recent changes'))
    expect(result).toEqual(expect.stringContaining('34 registered cattle'))
    expect(result).toEqual(expect.stringContaining('Cattle search results'))
    expect(result).toMatch(/>Ear tag\s*</)
    expect(result).not.toEqual(expect.stringContaining('Ear tag number'))
    expect(result).toEqual(expect.stringContaining('<th scope="row"'))
    expect(result).toEqual(expect.stringContaining('Showing 1 to 25 of 34<'))
    expect(result).not.toEqual(
      expect.stringContaining('Showing 1 to 25 of 34 results')
    )
    expect(result.indexOf('</table>')).toBeLessThan(
      result.indexOf('Showing 1 to 25 of 34<')
    )
  })

  test('it shows "N/A", styled as an error, for missing animal fields on back office', async () => {
    // Arrange
    const user = createUser()
    mocks.getCattleForCph.mockResolvedValue(page([incompleteAnimal]))

    // Act
    const { result } = await server.inject({
      method: 'GET',
      url: '/holdings/22/096/0096/animals',
      auth: spokeAuth(user, 'back-office')
    })

    // Assert
    // Date of birth, age and date on holding are all missing for this animal.
    const notAvailableCount = (
      result.match(
        /<strong class="govuk-tag govuk-tag--red">N\/A<\/strong>/g
      ) ?? []
    ).length
    expect(notAvailableCount).toBe(3)
    expect(result).not.toEqual(expect.stringContaining('Not supplied'))
    expect(result).toEqual(expect.stringContaining('Showing 1 to 1 of 1<'))
  })

  test('it shows the CPH alone as the back-office heading when the holding has no name', async () => {
    // Arrange
    const user = createUser()
    mocks.getHoldingDetails.mockResolvedValue({
      cph: '22/001/0001',
      name: null
    })

    // Act
    const { result } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001/animals',
      auth: spokeAuth(user, 'back-office')
    })

    // Assert
    expect(result).toEqual(
      expect.stringContaining('<h1 class="govuk-heading-l">22/001/0001</h1>')
    )
    expect(result).toEqual(
      expect.stringContaining(
        'Animals on holding - 22/001/0001 - Cattle - Livestock Information'
      )
    )
  })

  test('it shows the same no-animals empty state for a back-office user', async () => {
    // Arrange
    const user = createUser()
    mocks.getCattleForCph.mockResolvedValue(page([]))

    // Act
    const { result } = await server.inject({
      method: 'GET',
      url: '/holdings/22/095/0095/animals',
      auth: spokeAuth(user, 'back-office')
    })

    // Assert
    expect(result).toEqual(
      expect.stringContaining(
        'There are no animals currently registered on your holding.'
      )
    )
    expect(result).toEqual(
      expect.stringContaining('british-cattle-movement-service')
    )
    expect(result).not.toEqual(
      expect.stringContaining('Search animals on holding')
    )
    expect(result).not.toEqual(expect.stringContaining('registered cattle'))
    expect(result).not.toEqual(expect.stringContaining('govuk-table__body'))
  })

  test('it counts the matching records for a back-office search', async () => {
    // Arrange
    const user = createUser()
    mocks.getCattleForCph.mockResolvedValue(page([animal]))

    // Act
    const { result } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001/animals?search=UK200000000001',
      auth: spokeAuth(user, 'back-office')
    })

    // Assert
    expect(result).toEqual(
      expect.stringContaining(
        '1 registered cattle record matches <strong>‘UK200000000001’</strong>'
      )
    )
    expect(result).toEqual(expect.stringContaining('UK 200000 000001'))
  })

  test('it shows no table and a "Clear search" link when nothing matches a back-office search', async () => {
    // Arrange
    const user = createUser()
    mocks.getCattleForCph.mockResolvedValue(page([]))

    // Act
    const { result } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001/animals?search=not-a-real-animal',
      auth: spokeAuth(user, 'back-office')
    })

    // Assert
    expect(result).toEqual(
      expect.stringContaining(
        '0 registered cattle records match <strong>‘not-a-real-animal’</strong>'
      )
    )
    expect(result).toEqual(expect.stringContaining('Clear search'))
    expect(result).not.toEqual(expect.stringContaining('govuk-table__body'))
  })

  test('it remembers the holdings search a back-office user came from and carries it through search, sort, paging and the tabs', async () => {
    // Arrange
    const user = createUser()
    mocks.getCattleForCph.mockResolvedValue(
      page([animal], { totalItems: 34, totalPages: 2 })
    )
    const fromSearch = {
      method: 'GET',
      url: '/holdings/22/001/0001/animals',
      auth: spokeAuth(user, 'back-office'),
      headers: {
        'x-forwarded-host': 'back-office.lis.defra',
        referer: 'https://back-office.lis.defra/holdings?search=oak&page=2'
      }
    }

    // Act
    const first = await server.inject(fromSearch)
    const referrerId = first.result.match(/referrer=([0-9a-f-]{36})/)?.[1]
    const second = await server.inject({
      method: 'GET',
      url: `/holdings/22/001/0001/animals?search=male&referrer=${referrerId}`,
      auth: spokeAuth(user, 'back-office')
    })

    // Assert
    expect(first.result).toEqual(
      expect.stringContaining(
        'href="/holdings?search=oak&amp;page=2" class="govuk-back-link"'
      )
    )
    expect(referrerId).toBeDefined()
    expect(first.result).toEqual(
      expect.stringContaining(
        `<input type="hidden" name="referrer" value="${referrerId}">`
      )
    )
    expect(first.result).toEqual(
      expect.stringContaining(
        `href="/cattle/holdings/22/001/0001?referrer=${referrerId}"`
      )
    )
    expect(first.result).toMatch(
      new RegExp(`href="[^"]*referrer=${referrerId}[^"]*sort=ear_tag[^"]*"`)
    )
    expect(first.result).toMatch(
      new RegExp(`href="[^"]*referrer=${referrerId}[^"]*page=2"`)
    )
    expect(second.result).toEqual(
      expect.stringContaining(
        'href="/holdings?search=oak&amp;page=2" class="govuk-back-link"'
      )
    )
    expect(second.result).toEqual(
      expect.stringContaining(
        `href="/cattle/holdings/22/001/0001/animals?referrer=${referrerId}">Clear search</a>`
      )
    )
  })

  test("it links back to the holdings list when the carried referrer id is not the user's", async () => {
    // Arrange
    const user = createUser()
    const otherUser = { ...createUser(), sub: 'someone-else' }
    const fromSearch = {
      method: 'GET',
      url: '/holdings/22/001/0001/animals',
      auth: spokeAuth(user, 'back-office'),
      headers: {
        'x-forwarded-host': 'back-office.lis.defra',
        referer: 'https://back-office.lis.defra/holdings?search=oak'
      }
    }

    // Act
    const first = await server.inject(fromSearch)
    const referrerId = first.result.match(/referrer=([0-9a-f-]{36})/)?.[1]
    const second = await server.inject({
      method: 'GET',
      url: `/holdings/22/001/0001/animals?referrer=${referrerId}`,
      auth: spokeAuth(otherUser, 'back-office')
    })

    // Assert
    expect(referrerId).toBeDefined()
    expect(second.result).toEqual(
      expect.stringContaining('href="/holdings" class="govuk-back-link"')
    )
    expect(second.result).not.toEqual(expect.stringContaining('referrer='))
  })
})
