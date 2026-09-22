import { paginateAnimals } from './paginate.js'

describe('paginateAnimals()', () => {
  test('it sorts by ear tag ascending and pages by 25 by default', () => {
    // Arrange
    const animals = [
      { eartag: 'UK003' },
      { eartag: 'UK001' },
      { eartag: 'UK002' }
    ]

    // Act
    const result = paginateAnimals(animals)

    // Assert
    expect(result.animals.map(({ eartag }) => eartag)).toEqual([
      'UK001',
      'UK002',
      'UK003'
    ])
    expect(result.totalItems).toBe(3)
    expect(result.totalPages).toBe(1)
    expect(result.currentPage).toBe(1)
    expect(result.itemsPerPage).toBe(25)
  })

  test('it reverses the order when the direction is desc', () => {
    // Arrange
    const animals = [
      { eartag: 'UK001' },
      { eartag: 'UK002' },
      { eartag: 'UK003' }
    ]

    // Act
    const result = paginateAnimals(animals, {
      orderBy: 'ear_tag',
      direction: 'desc'
    })

    // Assert
    expect(result.animals.map(({ eartag }) => eartag)).toEqual([
      'UK003',
      'UK002',
      'UK001'
    ])
  })

  test('it sorts dates chronologically rather than as strings', () => {
    // Arrange
    const animals = [
      { eartag: 'UK001', date_of_birth: '2023-02-01' },
      { eartag: 'UK002', date_of_birth: '1990-01-01' },
      { eartag: 'UK003', date_of_birth: '2020-12-31' }
    ]

    // Act
    const result = paginateAnimals(animals, { orderBy: 'date_of_birth' })

    // Assert
    expect(result.animals.map(({ eartag }) => eartag)).toEqual([
      'UK002',
      'UK003',
      'UK001'
    ])
  })

  test('it sorts by date on holding', () => {
    // Arrange
    const animals = [
      { eartag: 'UK001', date_on_cph: '2024-06-01' },
      { eartag: 'UK002', date_on_cph: '2022-01-15' }
    ]

    // Act
    const result = paginateAnimals(animals, { orderBy: 'date_on_cph' })

    // Assert
    expect(result.animals.map(({ eartag }) => eartag)).toEqual([
      'UK002',
      'UK001'
    ])
  })

  test('it treats ascending age as descending date of birth', () => {
    // Arrange
    // The youngest animal has the latest date of birth, so ascending age has
    // to invert the underlying date sort.
    const animals = [
      { eartag: 'oldest', date_of_birth: '2010-01-01' },
      { eartag: 'youngest', date_of_birth: '2024-01-01' }
    ]

    // Act
    const result = paginateAnimals(animals, {
      orderBy: 'age',
      direction: 'asc'
    })

    // Assert
    expect(result.animals.map(({ eartag }) => eartag)).toEqual([
      'youngest',
      'oldest'
    ])
  })

  test('it treats descending age as ascending date of birth', () => {
    // Arrange
    const animals = [
      { eartag: 'youngest', date_of_birth: '2024-01-01' },
      { eartag: 'oldest', date_of_birth: '2010-01-01' }
    ]

    // Act
    const result = paginateAnimals(animals, {
      orderBy: 'age',
      direction: 'desc'
    })

    // Assert
    expect(result.animals.map(({ eartag }) => eartag)).toEqual([
      'oldest',
      'youngest'
    ])
  })

  test('it sorts by breed code when asked to sort by breed', () => {
    // Arrange
    const animals = [
      { eartag: 'UK001', breed_code: 'LIM' },
      { eartag: 'UK002', breed_code: 'AA' }
    ]

    // Act
    const result = paginateAnimals(animals, { orderBy: 'breed' })

    // Assert
    expect(result.animals.map(({ eartag }) => eartag)).toEqual([
      'UK002',
      'UK001'
    ])
  })

  test('it falls back to ear tag for an unrecognised sort column', () => {
    // Arrange
    const animals = [{ eartag: 'UK002' }, { eartag: 'UK001' }]

    // Act
    const result = paginateAnimals(animals, { orderBy: 'not_a_column' })

    // Assert
    expect(result.animals.map(({ eartag }) => eartag)).toEqual([
      'UK001',
      'UK002'
    ])
  })

  test('it returns the requested page and reports the totals', () => {
    // Arrange
    const animals = Array.from({ length: 30 }, (_, index) => ({
      eartag: `UK${String(index).padStart(3, '0')}`
    }))

    // Act
    const result = paginateAnimals(animals, { page: 2, pageSize: 25 })

    // Assert
    expect(result.animals).toHaveLength(5)
    expect(result.animals[0].eartag).toBe('UK025')
    expect(result.totalItems).toBe(30)
    expect(result.totalPages).toBe(2)
    expect(result.currentPage).toBe(2)
  })

  test('it clamps a page past the end back to the last page', () => {
    // Arrange
    const animals = Array.from({ length: 8 }, (_, index) => ({
      eartag: `UK${String(index).padStart(3, '0')}`
    }))

    // Act
    const result = paginateAnimals(animals, { page: 99, pageSize: 3 })

    // Assert
    expect(result.currentPage).toBe(3)
    expect(result.totalPages).toBe(3)
    expect(result.animals).toHaveLength(2)
  })

  test('it clamps a page below one back to the first page', () => {
    // Arrange
    const animals = [{ eartag: 'UK001' }, { eartag: 'UK002' }]

    // Act
    const result = paginateAnimals(animals, { page: 0 })

    // Assert
    expect(result.currentPage).toBe(1)
    expect(result.animals).toHaveLength(2)
  })

  test('it reports one page, not zero, for an empty collection', () => {
    // Arrange
    const animals = []

    // Act
    const result = paginateAnimals(animals)

    // Assert
    expect(result.animals).toEqual([])
    expect(result.totalItems).toBe(0)
    expect(result.totalPages).toBe(1)
    expect(result.currentPage).toBe(1)
  })

  test('it sorts animals with a missing value without throwing', () => {
    // Arrange
    const animals = [{ eartag: 'UK002', breed_code: 'AA' }, { eartag: 'UK001' }]

    // Act
    let result, error
    try {
      result = paginateAnimals(animals, { orderBy: 'breed' })
    } catch (e) {
      error = e
    }

    // Assert
    expect(error).not.toBeDefined()
    expect(result.animals).toHaveLength(2)
  })

  test('it does not mutate the collection it was given', () => {
    // Arrange
    const animals = [
      { eartag: 'UK003' },
      { eartag: 'UK001' },
      { eartag: 'UK002' }
    ]

    // Act
    paginateAnimals(animals, { direction: 'desc' })

    // Assert
    expect(animals.map(({ eartag }) => eartag)).toEqual([
      'UK003',
      'UK001',
      'UK002'
    ])
  })
})
