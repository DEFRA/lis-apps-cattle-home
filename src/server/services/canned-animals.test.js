import { getCannedCattleDetails } from './canned-animals.js'

describe('getCannedCattleDetails()', () => {
  test('it returns the animal for a matching ear tag', () => {
    // Arrange
    const earTag = 'UK200000000001'

    // Act
    const result = getCannedCattleDetails(earTag)

    // Assert
    expect(result).toBeDefined()
    expect(result.eartag).toBe('UK200000000001')
  })

  test('it matches an ear tag with spaces and mixed case', () => {
    // Arrange
    const earTag = 'uk 200000 000001'

    // Act
    const result = getCannedCattleDetails(earTag)

    // Assert
    expect(result).toBeDefined()
    expect(result.eartag).toBe('UK200000000001')
  })

  test('it returns undefined for an unknown ear tag', () => {
    // Arrange
    const earTag = 'UK999999999999'

    // Act
    const result = getCannedCattleDetails(earTag)

    // Assert
    expect(result).toBeUndefined()
  })
})
