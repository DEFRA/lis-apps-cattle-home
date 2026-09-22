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

vi.mock('#server/services/cattle-home-be4fe-client.js')

const mocks = {
  getCattleForCph: vi.mocked(cattleHomeBe4FeClient.getCattleForCph)
}

// Inline fixtures rather than the canned JSON: this suite tests what the
// controller renders and what it asks the client for. Search, sort and
// paging behaviour is covered by animals/search and animals/paginate.
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

describe('animalsOnHoldingController', () => {
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
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  test('it renders the results for an authenticated user', async () => {
    // Arrange
    const jwt = await createHubJwt()
    mocks.getCattleForCph.mockResolvedValue(
      page([animal], { totalItems: 34, totalPages: 2 })
    )

    // Act
    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001/animals',
      headers: { cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}` }
    })

    // Assert
    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(expect.stringContaining('Animals on holding'))
    expect(result).toEqual(expect.stringContaining('UK 200000 000001'))
    expect(result).toEqual(expect.stringContaining('Date on holding'))
    expect(result).toEqual(
      expect.stringContaining('Showing 1 to 25 of 34 results')
    )
    expect(result).toEqual(expect.stringContaining('aria-sort="ascending"'))
    expect(result).toEqual(
      expect.stringContaining('Animals on holding (page 1 of 2)')
    )
  })

  test('it renders a no-wrap table, labelled as sortable and scrollable', async () => {
    // Arrange
    const jwt = await createHubJwt()

    // Act
    const { result } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001/animals?search=UK200000000001',
      headers: { cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}` }
    })

    // Assert
    expect(result).toEqual(
      expect.stringContaining(
        '<table class="govuk-table lis-sortable-table--no-wrap">'
      )
    )
    expect(result).toEqual(
      expect.stringContaining(
        '<span class="govuk-visually-hidden"> (column headers with links are sortable).</span>'
      )
    )
    expect(result).toEqual(
      expect.stringContaining(
        'tabindex="0" role="region" aria-label="Animals on holding table"'
      )
    )
  })

  test('it puts the search, page, sort and holding in the page title', async () => {
    // Arrange
    const jwt = await createHubJwt()
    mocks.getCattleForCph.mockResolvedValue(page([animal], { totalItems: 15 }))

    // Act
    const { result } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001/animals?search=male&sort=age&direction=desc',
      headers: { cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}` }
    })

    // Assert
    expect(result).toEqual(
      expect.stringContaining(
        '15 results for &#39;male&#39; - Animals on holding, sorted by age descending - Oakfield Farm - Cattle - Livestock Information'
      )
    )
  })

  test('it does not mention a sort in the page title when none was asked for', async () => {
    // Arrange
    const jwt = await createHubJwt()
    mocks.getCattleForCph.mockResolvedValue(
      page([animal], { totalItems: 34, totalPages: 2 })
    )

    // Act
    const { result } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001/animals',
      headers: { cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}` }
    })

    // Assert
    expect(result).toEqual(
      expect.stringContaining(
        'Animals on holding (page 1 of 2) - Oakfield Farm - Cattle - Livestock Information'
      )
    )
  })

  test('it does not mark the search results as a live region', async () => {
    // Arrange
    const jwt = await createHubJwt()

    // Act
    const { result } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001/animals?search=male',
      headers: { cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}` }
    })

    // Assert
    expect(result).not.toEqual(expect.stringContaining('aria-live'))
  })

  test('it shows dates as day, short month and year', async () => {
    // Arrange
    const jwt = await createHubJwt()

    // Act
    const { result } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001/animals?search=UK200000000001',
      headers: { cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}` }
    })

    // Assert
    expect(result).toEqual(
      expect.stringContaining('<td class="govuk-table__cell">1 Feb 2023</td>')
    )
    expect(result).not.toEqual(expect.stringContaining('2023-02-01'))
  })

  test("it shows each animal's age in years and months", async () => {
    // Arrange
    const jwt = await createHubJwt()
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-09-10') })

    // Act
    const { result } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001/animals?search=UK200000000001',
      headers: { cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}` }
    })

    // Assert
    expect(result).toEqual(
      expect.stringContaining(
        '<td class="govuk-table__cell">3 years, 7 months</td>'
      )
    )
  })

  test('it shows "Not supplied" for the age when the date of birth is in the future', async () => {
    // Arrange
    const jwt = await createHubJwt()
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2020-01-01') })

    // Act
    const { result } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001/animals?search=UK200000000001',
      headers: { cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}` }
    })

    // Assert
    expect(result).toEqual(
      expect.stringContaining(
        '<td class="govuk-table__cell"><strong class="govuk-tag govuk-tag--red">Not supplied</strong></td>'
      )
    )
    expect(result).not.toEqual(expect.stringContaining('-3 years'))
  })

  test('it asks the client for page 2 and renders what it returns', async () => {
    // Arrange
    const jwt = await createHubJwt()
    mocks.getCattleForCph.mockResolvedValue(
      page([animal], { totalItems: 34, totalPages: 2, currentPage: 2 })
    )

    // Act
    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001/animals?page=2',
      headers: { cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}` }
    })

    // Assert
    expect(statusCode).toBe(statusCodes.ok)
    expect(mocks.getCattleForCph).toHaveBeenCalledWith(
      '22/001/0001',
      expect.objectContaining({ page: 2 })
    )
    expect(result).toEqual(
      expect.stringContaining('Showing 26 to 34 of 34 results')
    )
    expect(result).toEqual(
      expect.stringContaining('Animals on holding (page 2 of 2)')
    )
  })

  test('it passes the requested sort column and direction to the client', async () => {
    // Arrange
    const jwt = await createHubJwt()

    // Act
    const { result } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001/animals?sort=date_of_birth&direction=desc',
      headers: { cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}` }
    })

    // Assert
    expect(mocks.getCattleForCph).toHaveBeenCalledWith(
      '22/001/0001',
      expect.objectContaining({ orderBy: 'date_of_birth', direction: 'desc' })
    )
    expect(result).toEqual(expect.stringContaining('aria-sort="descending"'))
  })

  test('it passes the search term to the client and renders the matches', async () => {
    // Arrange
    const jwt = await createHubJwt()
    mocks.getCattleForCph.mockResolvedValue(page([animal]))

    // Act
    const { result } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001/animals?search=UK200000000001',
      headers: { cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}` }
    })

    // Assert
    expect(mocks.getCattleForCph).toHaveBeenCalledWith(
      '22/001/0001',
      expect.objectContaining({ q: 'UK200000000001' })
    )
    expect(result).toEqual(
      expect.stringContaining("1 result for <strong>'UK200000000001'</strong>")
    )
    expect(result).toEqual(expect.stringContaining('UK 200000 000001'))
  })

  test('it shows no table and a "Clear search" link when nothing matches', async () => {
    // Arrange
    const jwt = await createHubJwt()
    mocks.getCattleForCph.mockResolvedValue(page([]))

    // Act
    const { result } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001/animals?search=not-a-real-animal',
      headers: { cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}` }
    })

    // Assert
    expect(result).toEqual(
      expect.stringContaining(
        "0 results for <strong>'not-a-real-animal'</strong>"
      )
    )
    expect(result).toEqual(expect.stringContaining('Clear search'))
    expect(result).not.toEqual(expect.stringContaining('govuk-table__body'))
  })

  test('it shows the no-animals empty state when the holding has none recorded', async () => {
    // Arrange
    const jwt = await createHubJwt()
    mocks.getCattleForCph.mockResolvedValue(page([]))

    // Act
    const { result } = await server.inject({
      method: 'GET',
      url: '/holdings/22/095/0095/animals',
      headers: { cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}` }
    })

    // Assert
    expect(result).toEqual(
      expect.stringContaining(
        'There are no animals currently registered on your holding.'
      )
    )
    expect(result).toEqual(
      expect.stringContaining(
        'href="https://www.gov.uk/government/organisations/british-cattle-movement-service'
      )
    )
    expect(result).not.toEqual(
      expect.stringContaining('Search animals on your holding')
    )
    expect(result).not.toEqual(expect.stringContaining('govuk-table__body'))
  })

  test('it shows "Not supplied", styled as an error, for missing animal fields', async () => {
    // Arrange
    const jwt = await createHubJwt()
    mocks.getCattleForCph.mockResolvedValue(page([incompleteAnimal]))

    // Act
    const { result } = await server.inject({
      method: 'GET',
      url: '/holdings/22/096/0096/animals',
      headers: { cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}` }
    })

    // Assert
    // Date of birth, age and date on holding are all missing for this animal.
    const notSuppliedCount = (
      result.match(
        /<strong class="govuk-tag govuk-tag--red">Not supplied<\/strong>/g
      ) ?? []
    ).length
    expect(notSuppliedCount).toBe(3)
    expect(result).toEqual(expect.stringContaining('UK 400000 000001'))
    expect(result).not.toEqual(expect.stringContaining('page 1 of'))
  })

  test('it returns not found for a CPH with no canned holding', async () => {
    // Arrange
    const jwt = await createHubJwt()

    // Act
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/holdings/99/999/9999/animals',
      headers: { cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}` }
    })

    // Assert
    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('it redirects an unauthenticated request to the hub login', async () => {
    // Act
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/holdings/22/001/0001/animals'
    })

    // Assert
    expect(statusCode).toBe(302)
    expect(headers.location).toBeDefined()
  })
})
