import {
  buildCattleDetailsViewModel,
  buildDamDetails,
  buildSireDetails,
  computeAnimalStatus,
  formatBreedDisplay,
  formatDamType
} from './view-model.js'

describe('computeAnimalStatus()', () => {
  test('it returns Dead when state is Dead', () => {
    // Act
    const status = computeAnimalStatus('Dead', 'Restricted')

    // Assert
    expect(status).toBe('Dead')
  })

  test('it matches state case-insensitively', () => {
    // Act
    const status = computeAnimalStatus('dead', 'None')

    // Assert
    expect(status).toBe('Dead')
  })

  test('it returns Restricted when not dead but restriction status is Restricted', () => {
    // Act
    const status = computeAnimalStatus('Alive', 'Restricted')

    // Assert
    expect(status).toBe('Restricted')
  })

  test('it matches restriction status case-insensitively', () => {
    // Act
    const status = computeAnimalStatus('Alive', 'restricted')

    // Assert
    expect(status).toBe('Restricted')
  })

  test('it returns Active when neither dead nor restricted', () => {
    // Act
    const status = computeAnimalStatus('Alive', 'None')

    // Assert
    expect(status).toBe('Active')
  })

  test('it returns Active when state and restriction status are both missing', () => {
    // Act
    const status = computeAnimalStatus(undefined, undefined)

    // Assert
    expect(status).toBe('Active')
  })
})

describe('formatBreedDisplay()', () => {
  test('it returns the name and code for a known breed code', () => {
    // Act
    const display = formatBreedDisplay('HF')

    // Assert
    expect(display).toBe('Holstein Friesian (HF)')
  })

  test('it returns just the code for an unknown breed code', () => {
    // Act
    const display = formatBreedDisplay('ZZZ')

    // Assert
    expect(display).toBe('ZZZ')
  })

  test('it returns null when there is no breed code', () => {
    // Act
    const display = formatBreedDisplay(undefined)

    // Assert
    expect(display).toBeNull()
  })
})

describe('formatDamType()', () => {
  test('it capitalises a genetic dam type', () => {
    // Act
    const display = formatDamType('genetic')

    // Assert
    expect(display).toBe('Genetic')
  })

  test('it capitalises a surrogate dam type given in another case', () => {
    // Act
    const display = formatDamType('SURROGATE')

    // Assert
    expect(display).toBe('Surrogate')
  })

  test('it returns null when there is no dam type', () => {
    // Act
    const display = formatDamType(undefined)

    // Assert
    expect(display).toBeNull()
  })
})

describe('buildDamDetails()', () => {
  test('it shows the surrogate dam row when a surrogate tag is present', () => {
    // Arrange
    const record = {
      dam_type: 'surrogate',
      genetic_dam_tag: 'UK200000000090',
      surrogate_tag: 'UK200000000091'
    }

    // Act
    const dam = buildDamDetails(record)

    // Assert
    expect(dam).toEqual({
      damType: 'Surrogate',
      geneticDamTag: 'UK200000000090',
      showSurrogateRow: true,
      surrogateTag: 'UK200000000091'
    })
  })

  test('it hides the surrogate dam row when there is no surrogate tag', () => {
    // Arrange
    const record = {
      dam_type: 'surrogate',
      genetic_dam_tag: 'UK200000000090',
      surrogate_tag: null
    }

    // Act
    const dam = buildDamDetails(record)

    // Assert
    expect(dam.showSurrogateRow).toBe(false)
    expect(dam.surrogateTag).toBeNull()
  })

  test('it returns nulls for a genetic dam with no surrogate fields', () => {
    // Arrange
    const record = {
      dam_type: 'genetic',
      genetic_dam_tag: 'UK200000000097',
      surrogate_tag: null
    }

    // Act
    const dam = buildDamDetails(record)

    // Assert
    expect(dam).toEqual({
      damType: 'Genetic',
      geneticDamTag: 'UK200000000097',
      showSurrogateRow: false,
      surrogateTag: null
    })
  })
})

describe('buildSireDetails()', () => {
  test('it reports no sire details when neither tag nor name is present', () => {
    // Arrange
    const record = { sire_tag: null, sire_name: null }

    // Act
    const sire = buildSireDetails(record)

    // Assert
    expect(sire).toEqual({
      hasDetails: false,
      tag: null,
      tagNotRequired: false,
      name: null,
      nameNotRequired: false
    })
  })

  test('it marks the sire name as not required when only the ear tag is present', () => {
    // Arrange
    const record = { sire_tag: 'UK200000000099', sire_name: null }

    // Act
    const sire = buildSireDetails(record)

    // Assert
    expect(sire).toEqual({
      hasDetails: true,
      tag: 'UK200000000099',
      tagNotRequired: false,
      name: null,
      nameNotRequired: true
    })
  })

  test('it marks the sire ear tag as not required when only the name is present', () => {
    // Arrange
    const record = { sire_tag: null, sire_name: 'Highland Monarch' }

    // Act
    const sire = buildSireDetails(record)

    // Assert
    expect(sire).toEqual({
      hasDetails: true,
      tag: null,
      tagNotRequired: true,
      name: 'Highland Monarch',
      nameNotRequired: false
    })
  })

  test('it returns both fields when both the ear tag and name are present', () => {
    // Arrange
    const record = {
      sire_tag: 'UK200000000095',
      sire_name: 'Meadowbrook Victor'
    }

    // Act
    const sire = buildSireDetails(record)

    // Assert
    expect(sire).toEqual({
      hasDetails: true,
      tag: 'UK200000000095',
      tagNotRequired: false,
      name: 'Meadowbrook Victor',
      nameNotRequired: false
    })
  })
})

describe('buildCattleDetailsViewModel()', () => {
  test('it builds the full view model from a complete record', () => {
    // Arrange
    const record = {
      eartag: 'UK200000000001',
      date_of_birth: '2023-02-01',
      date_registered: '2023-02-05',
      date_on_cph: '2023-02-01',
      sex: 'Male',
      breed: 'AA',
      state: 'Alive',
      restriction_status: 'None',
      dam_type: 'genetic',
      genetic_dam_tag: 'UK200000000098',
      surrogate_tag: null,
      sire_tag: 'UK200000000099',
      sire_name: null
    }

    // Act
    const model = buildCattleDetailsViewModel(record)

    // Assert
    expect(model.eartag).toBe('UK200000000001')
    expect(model.dateOfBirth).toBe('2023-02-01')
    expect(model.dateRegistered).toBe('2023-02-05')
    expect(model.dateOnCph).toBe('2023-02-01')
    expect(model.sex).toBe('Male')
    expect(model.breedDisplay).toBe('Aberdeen Angus (AA)')
    expect(model.status).toBe('Active')
    expect(model.dam.damType).toBe('Genetic')
    expect(model.dam.geneticDamTag).toBe('UK200000000098')
    expect(model.sire.hasDetails).toBe(true)
    expect(model.sire.tag).toBe('UK200000000099')
    expect(model.sire.nameNotRequired).toBe(true)
  })

  test('it shows empty required fields as null for an incomplete record', () => {
    // Arrange
    const record = {
      eartag: 'UK200000000006',
      date_of_birth: '2023-03-08',
      date_registered: null,
      date_on_cph: '2023-03-08',
      sex: null,
      breed: null,
      state: null,
      restriction_status: 'None',
      dam_type: null,
      genetic_dam_tag: null,
      surrogate_tag: null,
      sire_tag: null,
      sire_name: null
    }

    // Act
    const model = buildCattleDetailsViewModel(record)

    // Assert
    expect(model.dateRegistered).toBeNull()
    expect(model.sex).toBeNull()
    expect(model.breedDisplay).toBeNull()
    expect(model.dam.damType).toBeNull()
    expect(model.dam.geneticDamTag).toBeNull()
    expect(model.sire.hasDetails).toBe(false)
  })
})
