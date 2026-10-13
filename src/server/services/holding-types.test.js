import { formatHoldingType, getHoldingTypeName } from './holding-types.js'

describe('getHoldingTypeName()', () => {
  test('it returns the name for a known code', () => {
    // Act
    const name = getHoldingTypeName('AH')

    // Assert
    expect(name).toBe('Agricultural Holding')
  })

  test('it returns the name for the last code in the list', () => {
    // Act
    const name = getHoldingTypeName('PO')

    // Assert
    expect(name).toBe('Port')
  })

  test('it returns the name for a code from the site type filter list', () => {
    // Act
    const name = getHoldingTypeName('KY')

    // Assert
    expect(name).toBe("Knacker's Yard")
  })

  test('it matches the code case-insensitively', () => {
    // Act
    const name = getHoldingTypeName('sw')

    // Assert
    expect(name).toBe('Slaughter House White Meat')
  })

  test('it returns null for an unknown code', () => {
    // Act
    const name = getHoldingTypeName('ZZ')

    // Assert
    expect(name).toBeNull()
  })

  test('it returns null when there is no code', () => {
    // Act
    const name = getHoldingTypeName(undefined)

    // Assert
    expect(name).toBeNull()
  })
})

describe('formatHoldingType()', () => {
  test('it shows the name followed by the code for a known code', () => {
    // Act
    const display = formatHoldingType('SH')

    // Assert
    expect(display).toBe('Slaughterhouse (SH)')
  })

  test('it upper-cases a lower-case code', () => {
    // Act
    const display = formatHoldingType('ah')

    // Assert
    expect(display).toBe('Agricultural Holding (AH)')
  })

  test('it shows the bare code for an unknown code', () => {
    // Act
    const display = formatHoldingType('ZZ')

    // Assert
    expect(display).toBe('ZZ')
  })

  test('it shows an unknown lower-case code upper-cased', () => {
    // Act
    const display = formatHoldingType('zz')

    // Assert
    expect(display).toBe('ZZ')
  })

  test('it returns null when there is no code', () => {
    // Act
    const display = formatHoldingType(null)

    // Assert
    expect(display).toBeNull()
  })
})
