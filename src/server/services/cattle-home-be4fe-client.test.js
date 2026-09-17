import { afterEach, describe, expect, test, vi } from 'vitest'

import { cattleHomeBe4FeClient as client } from './cattle-home-be4fe-client.js'

describe('CattleHomeBe4FeClient', () => {
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

  test('Passes eartag/breed/sex filters through as query parameters', async () => {
    // Arrange
    const get = vi
      .spyOn(client, '_get')
      .mockResolvedValue({ res: { statusCode: 200 }, payload: { data: [] } })

    // Act
    await client.getCattleForCph('10/081/1234', {
      eartag: 'UK 123',
      breed: 'Limousin',
      sex: 'Female'
    })

    // Assert
    expect(get).toHaveBeenCalledWith(
      'api/cphs/10/081/1234/cattle?eartag=UK+123&breed=Limousin&sex=Female'
    )
  })

  test('Omits the query string when no filters are supplied', async () => {
    // Arrange
    const get = vi
      .spyOn(client, '_get')
      .mockResolvedValue({ res: { statusCode: 200 }, payload: { data: [] } })

    // Act
    await client.getCattleForCph('10/081/1234', { eartag: '' })

    // Assert
    expect(get).toHaveBeenCalledWith('api/cphs/10/081/1234/cattle')
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
