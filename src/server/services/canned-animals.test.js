import { getAnimalsForCph } from './canned-animals.js'

describe('getAnimalsForCph()', () => {
  test('it returns the animals for a known holding', () => {
    // Act
    const { animals, totalItems } = getAnimalsForCph('22/001/0001')

    // Assert
    expect(animals).toHaveLength(25)
    expect(totalItems).toBe(34)
  })

  test('it returns an empty page for an unknown CPH', () => {
    // Act
    const { animals, totalItems, totalPages } = getAnimalsForCph(
      '99/999/9999'
    )

    // Assert
    expect(animals).toEqual([])
    expect(totalItems).toBe(0)
    expect(totalPages).toBe(1)
  })

  test('it gives each animal a unique ear tag', () => {
    // Act
    const { animals } = getAnimalsForCph('22/001/0001', { itemsPerPage: 34 })

    // Assert
    const eartags = new Set(animals.map((animal) => animal.eartag))
    expect(eartags.size).toBe(34)
  })

  test("it excludes the dead animal in fake/service's fixtures", () => {
    // Act
    const { animals } = getAnimalsForCph('22/001/0001', { itemsPerPage: 34 })

    // Assert
    const eartags = animals.map((animal) => animal.eartag)
    expect(eartags).not.toContain('UK300000000001')
  })

  test('it sorts by the requested column and direction', () => {
    // Act
    const { animals } = getAnimalsForCph('22/001/0001', {
      sort: 'date_of_birth',
      direction: 'desc',
      itemsPerPage: 34
    })

    // Assert
    expect(animals[0].eartag).toBe('UK300000000004')
  })

  test('it sorts by age using the same field as date of birth', () => {
    // Arrange
    const byDateOfBirth = getAnimalsForCph('22/001/0001', {
      sort: 'date_of_birth',
      direction: 'desc',
      itemsPerPage: 34
    })

    // Act
    const byAge = getAnimalsForCph('22/001/0001', {
      sort: 'age',
      direction: 'desc',
      itemsPerPage: 34
    })

    // Assert
    expect(byAge.animals.map((animal) => animal.eartag)).toEqual(
      byDateOfBirth.animals.map((animal) => animal.eartag)
    )
  })

  test('it defaults to ear tag ascending for an unrecognised sort column', () => {
    // Act
    const { animals } = getAnimalsForCph('22/001/0001', {
      sort: 'not-a-real-column',
      itemsPerPage: 34
    })

    // Assert
    expect(animals[0].eartag).toBe('UK200000000001')
  })

  test('it paginates the results', () => {
    // Act
    const page1 = getAnimalsForCph('22/001/0001', { page: 1, itemsPerPage: 25 })
    const page2 = getAnimalsForCph('22/001/0001', { page: 2, itemsPerPage: 25 })

    // Assert
    expect(page1.animals).toHaveLength(25)
    expect(page1.currentPage).toBe(1)
    expect(page1.totalPages).toBe(2)
    expect(page2.animals).toHaveLength(9)
    expect(page2.currentPage).toBe(2)
  })

  test('it clamps a page number past the end to the last page', () => {
    // Act
    const { currentPage, animals } = getAnimalsForCph('22/001/0001', {
      page: 99,
      itemsPerPage: 25
    })

    // Assert
    expect(currentPage).toBe(2)
    expect(animals).toHaveLength(9)
  })
})
