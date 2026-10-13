import { describe, expect, test } from 'vitest'

import { isHubHoldingsList } from './list-referrer.js'

describe('isHubHoldingsList()', () => {
  test('it accepts the holdings list with or without a query or trailing slash', () => {
    // Arrange
    const paths = [
      '/holdings',
      '/holdings/',
      '/holdings?search=oak&page=2',
      '/holdings/?search=oak'
    ]

    // Act
    const results = paths.map((path) => isHubHoldingsList(path))

    // Assert
    expect(results).toEqual([true, true, true, true])
  })

  test('it rejects other paths, including ones that merely start with the list path', () => {
    // Arrange
    const paths = [
      '/',
      '/holdingsx',
      '/holdings/22/001/0001',
      '/animals',
      '/cattle/holdings'
    ]

    // Act
    const results = paths.map((path) => isHubHoldingsList(path))

    // Assert
    expect(results).toEqual([false, false, false, false, false])
  })
})
