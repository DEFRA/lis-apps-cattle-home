import { computeAge } from './animal-age.js'

describe('computeAge()', () => {
  test('it computes whole years and months', () => {
    // Act
    const age = computeAge('2023-03-10', new Date('2026-09-10'))

    // Assert
    expect(age).toBe('3 years, 6 months')
  })

  test('it uses singular units for exactly 1 year and 1 month', () => {
    // Act
    const age = computeAge('2025-08-10', new Date('2026-09-10'))

    // Assert
    expect(age).toBe('1 year, 1 month')
  })

  test('it shows 0 months rather than "undefined" when the birthday just passed', () => {
    // Act
    const age = computeAge('2023-08-19', new Date('2026-09-11'))

    // Assert
    expect(age).toBe('3 years, 0 months')
  })
})
