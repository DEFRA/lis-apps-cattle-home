import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { searchAnimals } from '#server/services/animals/search.js'
import { paginateAnimals } from '#server/services/animals/paginate.js'
import { cattleHomeBe4FeClient as client } from './cattle-home-be4fe-client.js'

vi.mock('#server/services/animals/search.js')
vi.mock('#server/services/animals/paginate.js')

const mocks = {
  searchAnimals: vi.mocked(searchAnimals),
  paginateAnimals: vi.mocked(paginateAnimals)
}

describe('CattleHomeBe4FeClient', () => {
  // beforeEach rather than beforeAll: this file restores mocks after each
  // test, which clears implementations as well as call history.
  beforeEach(() => {
    mocks.searchAnimals.mockReturnValue([])
    mocks.paginateAnimals.mockReturnValue({ animals: [] })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('Gets CPHs for an encoded user ID', async () => {
    // Arrange
    const payload = { data: [{ cph: '10/081/1234' }] }
    const get = vi
      .spyOn(client, '_get')
      .mockResolvedValue({ res: { statusCode: 200 }, payload })

    // Act
    const result = await client.getCphsForUser('test.user+home@example.com')

    // Assert
    expect(get).toHaveBeenCalledWith(
      'api/users/test.user%2Bhome%40example.com/cphs'
    )
    expect(result).toEqual(payload.data)
  })

  test('Gets cattle using the three CPH route segments', async () => {
    // Arrange
    const get = vi
      .spyOn(client, '_get')
      .mockResolvedValue({ res: { statusCode: 200 }, payload: { data: [] } })

    // Act
    await client.getCattleForCph('10/081/1234')

    // Assert
    expect(get).toHaveBeenCalledWith('api/cphs/10/081/1234/cattle')
  })

  test('Passes the fetched animals and the search term to searchAnimals', async () => {
    // Arrange
    const animals = [{ eartag: 'UK123' }, { eartag: 'UK999' }]
    const searched = [{ eartag: 'UK123' }]
    vi.spyOn(client, '_get').mockResolvedValue({
      res: { statusCode: 200 },
      payload: { data: animals }
    })
    mocks.searchAnimals.mockReturnValue(searched)
    mocks.paginateAnimals.mockReturnValue({ animals: searched })

    // Act
    await client.getCattleForCph('10/081/1234', { q: 'UK123' })

    // Assert
    expect(mocks.searchAnimals).toHaveBeenCalledWith(animals, 'UK123')
    expect(mocks.paginateAnimals).toHaveBeenCalledWith(
      searched,
      expect.anything()
    )
  })

  test('Skips searchAnimals when no search term is given', async () => {
    // Arrange
    const animals = [{ eartag: 'UK123' }]
    vi.spyOn(client, '_get').mockResolvedValue({
      res: { statusCode: 200 },
      payload: { data: animals }
    })
    mocks.paginateAnimals.mockReturnValue({ animals })

    // Act
    await client.getCattleForCph('10/081/1234')

    // Assert
    expect(mocks.searchAnimals).not.toHaveBeenCalled()
    expect(mocks.paginateAnimals).toHaveBeenCalledWith(
      animals,
      expect.anything()
    )
  })

  test('Passes the sort and paging options through to paginateAnimals', async () => {
    // Arrange
    const animals = [{ eartag: 'UK123' }]
    vi.spyOn(client, '_get').mockResolvedValue({
      res: { statusCode: 200 },
      payload: { data: animals }
    })
    mocks.paginateAnimals.mockReturnValue({ animals })

    // Act
    await client.getCattleForCph('10/081/1234', {
      orderBy: 'date_of_birth',
      direction: 'desc',
      page: 3,
      pageSize: 10
    })

    // Assert
    expect(mocks.paginateAnimals).toHaveBeenCalledWith(animals, {
      orderBy: 'date_of_birth',
      direction: 'desc',
      page: 3,
      pageSize: 10
    })
  })

  test('Returns whatever paginateAnimals produced', async () => {
    // Arrange
    const paginated = {
      animals: [{ eartag: 'UK123' }],
      totalItems: 30,
      totalPages: 2,
      currentPage: 2,
      itemsPerPage: 25
    }
    vi.spyOn(client, '_get').mockResolvedValue({
      res: { statusCode: 200 },
      payload: { data: [{ eartag: 'UK123' }] }
    })
    mocks.paginateAnimals.mockReturnValue(paginated)

    // Act
    const result = await client.getCattleForCph('10/081/1234')

    // Assert
    expect(result).toBe(paginated)
  })

  test('Rejects malformed CPH values without making a request', async () => {
    // Arrange
    const get = vi.spyOn(client, '_get')

    // Act
    let error
    try {
      await client.getCattleForCph('10/081')
    } catch (e) {
      error = e
    }

    // Assert
    expect(error).toBeInstanceOf(TypeError)
    expect(error.message).toBe('CPH must contain county, parish and holding')
    expect(get).not.toHaveBeenCalled()
  })

  test('Rejects a CPH containing an empty segment', async () => {
    // Arrange
    const get = vi.spyOn(client, '_get')

    // Act
    let error
    try {
      await client.getCattleForCph('10//1234')
    } catch (e) {
      error = e
    }

    // Assert
    expect(error).toBeInstanceOf(TypeError)
    expect(get).not.toHaveBeenCalled()
  })

  test('Gets holding details using the three CPH route segments', async () => {
    // Arrange
    const payload = { data: { cph: '10/081/1234', name: 'Oakfield Farm' } }
    const get = vi
      .spyOn(client, '_get')
      .mockResolvedValue({ res: { statusCode: 200 }, payload })

    // Act
    const result = await client.getHoldingDetails('10/081/1234')

    // Assert
    expect(get).toHaveBeenCalledWith('api/cphs/10/081/1234')
    expect(result).toEqual(payload.data)
  })

  test('Rejects a malformed CPH for holding details without making a request', async () => {
    // Arrange
    const get = vi.spyOn(client, '_get')

    // Act
    let error
    try {
      await client.getHoldingDetails('10/081')
    } catch (e) {
      error = e
    }

    // Assert
    expect(error).toBeInstanceOf(TypeError)
    expect(get).not.toHaveBeenCalled()
  })

  test('Gets details using an encoded cattle ID', async () => {
    // Arrange
    const payload = { data: { cattle_id: 'UK 123/456' } }
    const get = vi
      .spyOn(client, '_get')
      .mockResolvedValue({ res: { statusCode: 200 }, payload })

    // Act
    const result = await client.getCattleDetails('UK 123/456')

    // Assert
    expect(get).toHaveBeenCalledWith('api/cattle/UK%20123%2F456')
    expect(result).toEqual(payload.data)
  })
})
