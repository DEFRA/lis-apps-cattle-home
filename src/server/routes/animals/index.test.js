import { describe, expect, test, vi } from 'vitest'

import { animals } from './index.js'

describe('animals plugin', () => {
  test('it registers the cattle details route', () => {
    // Arrange
    const route = vi.fn()

    // Act
    animals.plugin.register({ route })

    // Assert
    expect(route).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          method: 'GET',
          path: '/animals/{earTag}'
        })
      ])
    )
  })
})
