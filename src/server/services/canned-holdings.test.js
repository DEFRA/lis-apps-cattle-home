import { getHoldingByCph, getHoldingsForUser } from './canned-holdings.js'

describe('getHoldingsForUser()', () => {
  test('it returns the holdings for a known user', () => {
    // Arrange
    const userId = 'oakfield.farmer@oakhill-farms.co.uk'

    // Act
    const holdings = getHoldingsForUser(userId)

    // Assert
    expect(holdings).toEqual([expect.objectContaining({ cph: '22/001/0001' })])
  })

  test('it returns an empty array for an unknown user', () => {
    // Arrange
    const userId = 'unknown@example.com'

    // Act
    const holdings = getHoldingsForUser(userId)

    // Assert
    expect(holdings).toEqual([])
  })
})

describe('getHoldingByCph()', () => {
  test('it returns the holding with a matching CPH', () => {
    // Arrange
    const cph = '22/003/0003'

    // Act
    const holding = getHoldingByCph(cph)

    // Assert
    expect(holding).toEqual(
      expect.objectContaining({ cph, name: 'Meadow View Farm' })
    )
  })

  test('it returns undefined for an unknown CPH', () => {
    // Arrange
    const cph = '99/999/9999'

    // Act
    const holding = getHoldingByCph(cph)

    // Assert
    expect(holding).toBeUndefined()
  })
})
