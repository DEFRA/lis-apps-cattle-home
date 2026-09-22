import { getBreedName } from '../breed-names.js'
import { searchAnimals } from './search.js'

vi.mock('../breed-names.js')

const mocks = {
  getBreedName: vi.mocked(getBreedName)
}

describe('searchAnimals()', () => {
  beforeAll(() => {
    mocks.getBreedName.mockImplementation((breedCode) => breedCode ?? '')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  test('it returns every animal when the search term is empty', () => {
    // Arrange
    const animals = [
      { eartag: 'UK001', sex: 'Male', breed_code: 'AA' },
      { eartag: 'UK002', sex: 'Female', breed_code: 'LIM' }
    ]
    const search = ''

    // Act
    const result = searchAnimals(animals, search)

    // Assert
    expect(result).toBe(animals)
  })

  test('it matches an ear tag ignoring spaces and case', () => {
    // Arrange
    const animals = [
      { eartag: 'UK324537113234', sex: 'Male', breed_code: 'AA' },
      { eartag: 'UK999999999999', sex: 'Male', breed_code: 'AA' }
    ]
    const search = 'uk 324537 113234'

    // Act
    const result = searchAnimals(animals, search)

    // Assert
    expect(result).toHaveLength(1)
    expect(result[0].eartag).toBe('UK324537113234')
  })

  test('it matches part of an ear tag', () => {
    // Arrange
    const animals = [
      { eartag: 'UK200000000001', sex: 'Male', breed_code: 'AA' },
      { eartag: 'UK300000000002', sex: 'Male', breed_code: 'AA' }
    ]
    const search = '200000'

    // Act
    const result = searchAnimals(animals, search)

    // Assert
    expect(result).toHaveLength(1)
    expect(result[0].eartag).toBe('UK200000000001')
  })

  test('it matches male exactly, without also matching female', () => {
    // Arrange
    // 'male' is a substring of 'female', so a naive contains check would
    // return both. Sex is matched exactly for this reason.
    const animals = [
      { eartag: 'UK001', sex: 'Male', breed_code: 'AA' },
      { eartag: 'UK002', sex: 'Female', breed_code: 'AA' }
    ]
    const search = 'male'

    // Act
    const result = searchAnimals(animals, search)

    // Assert
    expect(result).toHaveLength(1)
    expect(result[0].sex).toBe('Male')
  })

  test('it matches female exactly', () => {
    // Arrange
    const animals = [
      { eartag: 'UK001', sex: 'Male', breed_code: 'AA' },
      { eartag: 'UK002', sex: 'Female', breed_code: 'AA' }
    ]
    const search = 'FEMALE'

    // Act
    const result = searchAnimals(animals, search)

    // Assert
    expect(result).toHaveLength(1)
    expect(result[0].sex).toBe('Female')
  })

  test('it matches a breed code', () => {
    // Arrange
    const animals = [
      { eartag: 'UK001', sex: 'Male', breed_code: 'lim' },
      { eartag: 'UK002', sex: 'Male', breed_code: 'aa' }
    ]
    const search = 'lim'

    // Act
    const result = searchAnimals(animals, search)

    // Assert
    expect(result).toHaveLength(1)
    expect(result[0].breed_code).toBe('lim')
  })

  test('it matches the breed name resolved from the code', () => {
    // Arrange
    const animals = [
      { eartag: 'UK001', sex: 'Male', breed_code: 'AA' },
      { eartag: 'UK002', sex: 'Male', breed_code: 'HF' }
    ]
    const search = 'aberdeen'
    mocks.getBreedName.mockImplementation((breedCode) =>
      breedCode === 'AA' ? 'aberdeen angus' : 'holstein friesian'
    )

    // Act
    const result = searchAnimals(animals, search)

    // Assert
    expect(result).toHaveLength(1)
    expect(result[0].breed_code).toBe('AA')
    expect(mocks.getBreedName).toHaveBeenCalledWith('AA')
  })

  test('it returns nothing when no animal matches', () => {
    // Arrange
    const animals = [
      { eartag: 'UK001', sex: 'Male', breed_code: 'AA' },
      { eartag: 'UK002', sex: 'Female', breed_code: 'LIM' }
    ]
    const search = 'nothing-matches-this'

    // Act
    const result = searchAnimals(animals, search)

    // Assert
    expect(result).toEqual([])
  })

  test('it handles an animal with missing fields without throwing', () => {
    // Arrange
    const animals = [{}, { eartag: 'UK001', sex: 'Male', breed_code: 'AA' }]
    const search = 'UK001'

    // Act
    let result, error
    try {
      result = searchAnimals(animals, search)
    } catch (e) {
      error = e
    }

    // Assert
    expect(error).not.toBeDefined()
    expect(result).toHaveLength(1)
    expect(result[0].eartag).toBe('UK001')
  })

  test('it matches a sex search against an animal that has no sex recorded', () => {
    // Arrange
    const animals = [{ eartag: 'UK001', breed_code: 'AA' }]
    const search = 'male'

    // Act
    let result, error
    try {
      result = searchAnimals(animals, search)
    } catch (e) {
      error = e
    }

    // Assert
    expect(error).not.toBeDefined()
    expect(result).toEqual([])
  })

  test('it does not mutate the collection it was given', () => {
    // Arrange
    const animals = [
      { eartag: 'UK001', sex: 'Male', breed_code: 'AA' },
      { eartag: 'UK002', sex: 'Female', breed_code: 'LIM' }
    ]
    const search = 'UK001'

    // Act
    searchAnimals(animals, search)

    // Assert
    expect(animals).toHaveLength(2)
  })
})
