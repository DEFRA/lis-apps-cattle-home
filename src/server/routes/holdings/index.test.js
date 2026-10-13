import { describe, expect, test, vi } from 'vitest'

import { holdings } from './index.js'

describe('holdings plugin', () => {
  test('it registers the holding details route', () => {
    // Arrange
    const route = vi.fn()
    const cache = vi.fn().mockReturnValue({ get: vi.fn(), set: vi.fn() })

    // Act
    holdings.plugin.register({ route, cache, app: {} })

    // Assert
    expect(route).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          method: 'GET',
          path: '/holdings/{county}/{parish}/{holding}'
        })
      ])
    )
  })

  test('it registers the animals on holding route', () => {
    // Arrange
    const route = vi.fn()
    const cache = vi.fn().mockReturnValue({ get: vi.fn(), set: vi.fn() })

    // Act
    holdings.plugin.register({ route, cache, app: {} })

    // Assert
    expect(route).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          method: 'GET',
          path: '/holdings/{county}/{parish}/{holding}/animals'
        })
      ])
    )
  })
})
