import { describe, expect, test } from 'vitest'

import { buildRangeSummary } from './controller.js'

describe('buildRangeSummary()', () => {
  test('it states the range on the current page and the total', () => {
    // Arrange
    const page = { currentPage: 2, itemsPerPage: 25, totalItems: 34 }

    // Act
    const result = buildRangeSummary(page)

    // Assert
    expect(result).toBe('Showing 26 to 34 of 34')
  })

  test('it states the full range when everything fits on one page', () => {
    // Arrange
    const page = { currentPage: 1, itemsPerPage: 25, totalItems: 12 }

    // Act
    const result = buildRangeSummary(page)

    // Assert
    expect(result).toBe('Showing 1 to 12 of 12')
  })

  test('it caps the last item at the page size on a full page', () => {
    // Arrange
    const page = { currentPage: 1, itemsPerPage: 25, totalItems: 50 }

    // Act
    const result = buildRangeSummary(page)

    // Assert
    expect(result).toBe('Showing 1 to 25 of 50')
  })
})
