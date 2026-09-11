import { getBreedName } from './breed-names.js'

describe('getBreedName()', () => {
  test('it returns the full breed name for a known code', () => {
    // Act
    const name = getBreedName('HF')

    // Assert
    expect(name).toBe('Holstein Friesian')
  })

  test('it returns the code itself for an unknown code', () => {
    // Act
    const name = getBreedName('ZZZ')

    // Assert
    expect(name).toBe('ZZZ')
  })
})
