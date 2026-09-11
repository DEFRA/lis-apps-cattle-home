import { describe, expect, test, vi } from 'vitest'

import { CattleHomeBe4Fe } from './cattle-home-be4fe.js'

function createClient() {
  return new CattleHomeBe4Fe('local', 'test-api-key')
}

describe('CattleHomeBe4Fe', () => {
  test('Gets CPHs for an encoded user ID', async () => {
    // Arrange
    const client = createClient()
    const payload = { data: [] }
    const get = vi
      .spyOn(client, '_get')
      .mockResolvedValue({ res: { statusCode: 200 }, payload })

    // Act
    const result = await client.getCphsForUser('test.user+home@example.com')

    // Assert
    expect(get).toHaveBeenCalledWith(
      'api/users/test.user%2Bhome%40example.com/cphs'
    )
    expect(result).toEqual(payload)
  })

  test('Gets cattle using the three CPH route segments', async () => {
    // Arrange
    const client = createClient()
    const get = vi
      .spyOn(client, '_get')
      .mockResolvedValue({ res: { statusCode: 200 }, payload: { data: [] } })

    // Act
    await client.getCattleForCph('10/081/1234')

    // Assert
    expect(get).toHaveBeenCalledWith('api/cphs/10/081/1234/cattle')
  })

  test('Rejects malformed CPH values without making a request', async () => {
    // Arrange
    const client = createClient()
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
    const client = createClient()
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

  test('Gets details using an encoded cattle ID', async () => {
    // Arrange
    const client = createClient()
    const payload = { data: {} }
    const get = vi
      .spyOn(client, '_get')
      .mockResolvedValue({ res: { statusCode: 200 }, payload })

    // Act
    const result = await client.getCattleDetails('UK 123/456')

    // Assert
    expect(get).toHaveBeenCalledWith('api/cattle/UK%20123%2F456')
    expect(result).toEqual(payload)
  })
})
