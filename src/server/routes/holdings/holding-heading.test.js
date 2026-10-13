import { buildHoldingHeading } from './holding-heading.js'

describe('buildHoldingHeading()', () => {
  test('it leads with the CPH for back office', () => {
    // Arrange
    const holding = { cph: '12/345/0001', name: 'Oakfield Farm' }

    // Act
    const heading = buildHoldingHeading(holding, true)

    // Assert
    expect(heading).toBe('12/345/0001 - Oakfield Farm')
  })

  test('it shows the CPH alone for back office when there is no name', () => {
    // Arrange
    const holding = { cph: '12/345/0001', name: null }

    // Act
    const heading = buildHoldingHeading(holding, true)

    // Assert
    expect(heading).toBe('12/345/0001')
  })

  test('it shows the name for front office', () => {
    // Arrange
    const holding = { cph: '12/345/0001', name: 'Oakfield Farm' }

    // Act
    const heading = buildHoldingHeading(holding, false)

    // Assert
    expect(heading).toBe('Oakfield Farm')
  })

  test('it falls back to the CPH for front office when there is no name', () => {
    // Arrange
    const holding = { cph: '12/345/0001', name: null }

    // Act
    const heading = buildHoldingHeading(holding, false)

    // Assert
    expect(heading).toBe('12/345/0001')
  })

  test('it treats an empty name as missing for back office', () => {
    // Arrange
    const holding = { cph: '12/345/0001', name: '' }

    // Act
    const heading = buildHoldingHeading(holding, true)

    // Assert
    expect(heading).toBe('12/345/0001')
  })

  test('it treats an empty name as missing for front office', () => {
    // Arrange
    const holding = { cph: '12/345/0001', name: '' }

    // Act
    const heading = buildHoldingHeading(holding, false)

    // Assert
    expect(heading).toBe('12/345/0001')
  })
})
