import {
  buildHerdMarks,
  buildHoldingRows,
  buildKeeperDetails,
  buildTelephoneHref,
  findRegisteredKeeper,
  formatTelephone
} from './view-model.js'

describe('buildHerdMarks()', () => {
  test('it uses the singular key for exactly one herd mark', () => {
    // Arrange
    const herdMarks = [
      { mark: 'UK 324537', start_date: '2020-01-01', species: ['cattle'] }
    ]

    // Act
    const result = buildHerdMarks(herdMarks)

    // Assert
    expect(result).toEqual({ key: 'Herd mark', marks: ['UK 324537'] })
  })

  test('it uses the plural key for several herd marks', () => {
    // Arrange
    const herdMarks = [
      { mark: 'UK 324537', species: ['cattle'] },
      { mark: 'UK 324538', species: ['sheep'] }
    ]

    // Act
    const result = buildHerdMarks(herdMarks)

    // Assert
    expect(result).toEqual({
      key: 'Herd marks',
      marks: ['UK 324537', 'UK 324538']
    })
  })

  test('it gives the singular key and no marks when there are none', () => {
    // Act
    const result = buildHerdMarks([])

    // Assert
    expect(result).toEqual({ key: 'Herd mark', marks: [] })
  })

  test('it gives the singular key and no marks when herd marks are null', () => {
    // Act
    const result = buildHerdMarks(null)

    // Assert
    expect(result).toEqual({ key: 'Herd mark', marks: [] })
  })

  test('it gives the singular key and no marks when herd marks are absent', () => {
    // Act
    const result = buildHerdMarks(undefined)

    // Assert
    expect(result).toEqual({ key: 'Herd mark', marks: [] })
  })

  test('it skips a herd mark with no mark', () => {
    // Arrange
    const herdMarks = [
      { mark: 'UK 324537', species: ['cattle'] },
      { mark: null, species: ['cattle'] }
    ]

    // Act
    const result = buildHerdMarks(herdMarks)

    // Assert
    expect(result).toEqual({ key: 'Herd mark', marks: ['UK 324537'] })
  })
})

describe('findRegisteredKeeper()', () => {
  test('it returns the first association with the keeper role', () => {
    // Arrange
    const owner = { customer_number: 'C1', roles: [{ code: 'OWNER' }] }
    const keeper = {
      customer_number: 'C2',
      roles: [{ code: 'keeper', species: ['cattle'] }]
    }
    const secondKeeper = {
      customer_number: 'C3',
      roles: [{ code: 'keeper', species: ['sheep'] }]
    }

    // Act
    const result = findRegisteredKeeper([owner, keeper, secondKeeper])

    // Assert
    expect(result).toBe(keeper)
  })

  test('it matches the role code case-insensitively', () => {
    // Arrange
    const keeper = {
      customer_number: 'C1',
      roles: [{ code: 'owner' }, { code: 'Keeper' }]
    }

    // Act
    const result = findRegisteredKeeper([keeper])

    // Assert
    expect(result).toBe(keeper)
  })

  test('it finds a keeper listed after another role', () => {
    // Arrange
    const owner = { customer_number: 'C1', roles: [{ code: 'owner' }] }
    const keeper = {
      customer_number: 'C2',
      roles: [{ code: 'holder' }, { code: 'keeper' }]
    }

    // Act
    const result = findRegisteredKeeper([owner, keeper])

    // Assert
    expect(result).toBe(keeper)
  })

  test('it returns null when no association is a keeper', () => {
    // Arrange
    const associations = [
      { customer_number: 'C1', roles: [{ code: 'LIVESTOCKOWNER' }] },
      { customer_number: 'C2', roles: [{ code: 'owner' }] },
      { customer_number: 'C3', roles: [{ code: 'holder' }] }
    ]

    // Act
    const result = findRegisteredKeeper(associations)

    // Assert
    expect(result).toBeNull()
  })

  test('it returns null for an association with no roles', () => {
    // Arrange
    const associations = [{ customer_number: 'C1' }]

    // Act
    const result = findRegisteredKeeper(associations)

    // Assert
    expect(result).toBeNull()
  })

  test('it returns null when associations are null', () => {
    // Act
    const result = findRegisteredKeeper(null)

    // Assert
    expect(result).toBeNull()
  })

  test('it returns null when there are no associations', () => {
    // Act
    const result = findRegisteredKeeper(undefined)

    // Assert
    expect(result).toBeNull()
  })
})

describe('formatTelephone()', () => {
  test('it spaces a UK mobile number 5 then 6 digits', () => {
    // Act
    const result = formatTelephone('07700900001')

    // Assert
    expect(result).toBe('07700 900001')
  })

  test('it shows an 11-digit 01 number as given', () => {
    // Act
    const result = formatTelephone('01632960001')

    // Assert
    expect(result).toBe('01632960001')
  })

  test('it shows an 11-digit 02 number as given', () => {
    // Act
    const result = formatTelephone('020 7946 0001')

    // Assert
    expect(result).toBe('020 7946 0001')
  })

  test('it re-spaces a number that already has spaces', () => {
    // Act
    const result = formatTelephone('077 0090 0001')

    // Assert
    expect(result).toBe('07700 900001')
  })

  test('it shows an international number as given', () => {
    // Act
    const result = formatTelephone('+44 7700 900001')

    // Assert
    expect(result).toBe('+44 7700 900001')
  })

  test('it shows a number of another length as given', () => {
    // Act
    const result = formatTelephone('0800123456')

    // Assert
    expect(result).toBe('0800123456')
  })

  test('it shows an 11-digit 08 number as given', () => {
    // Act
    const result = formatTelephone('08001234567')

    // Assert
    expect(result).toBe('08001234567')
  })
})

describe('buildTelephoneHref()', () => {
  test('it keeps only the digits of a formatted number', () => {
    // Act
    const result = buildTelephoneHref('(01234) 567-890')

    // Assert
    expect(result).toBe('tel:01234567890')
  })

  test('it keeps a leading plus', () => {
    // Act
    const result = buildTelephoneHref(' +44 7700 900001')

    // Assert
    expect(result).toBe('tel:+447700900001')
  })

  test('it drops a plus that is not leading', () => {
    // Act
    const result = buildTelephoneHref('07700+900001')

    // Assert
    expect(result).toBe('tel:07700900001')
  })
})

describe('buildHoldingRows()', () => {
  test('it builds the front-office rows', () => {
    // Arrange
    const holding = {
      cph: '12/345/0001',
      name: 'Oakfield Farm',
      holding_type: 'AH',
      address: ['Oakfield Farm', '', 'England'],
      herd_marks: [{ mark: 'UK 654322', species: ['cattle'] }]
    }

    // Act
    const rows = buildHoldingRows(holding, {
      isBackOffice: false,
      status: 'Active'
    })

    // Assert
    expect(rows).toEqual([
      { key: 'CPH number', text: '12/345/0001' },
      { key: 'Holding name', text: 'Oakfield Farm' },
      { key: 'Address', lines: ['Oakfield Farm', 'England'] },
      { key: 'Herd mark', lines: ['UK 654322'], emptyText: 'Not recorded' }
    ])
  })

  test('it keeps an empty holding name row for front office', () => {
    // Arrange
    const holding = {
      cph: '12/345/0001',
      name: null,
      address: null,
      herd_marks: null
    }

    // Act
    const rows = buildHoldingRows(holding, {
      isBackOffice: false,
      status: 'Active'
    })

    // Assert
    expect(rows).toEqual([
      { key: 'CPH number', text: '12/345/0001' },
      { key: 'Holding name', text: null },
      { key: 'Address', lines: [] },
      { key: 'Herd mark', lines: [], emptyText: 'Not recorded' }
    ])
  })

  test('it builds the back-office rows in order', () => {
    // Arrange
    const holding = {
      cph: '12/345/0001',
      name: 'Oakfield Farm',
      holding_type: 'ah',
      address: ['Oakfield Farm'],
      herd_marks: [
        { mark: 'UK 654322', species: ['cattle'] },
        { mark: 'UK 654323', species: ['sheep'] }
      ]
    }

    // Act
    const rows = buildHoldingRows(holding, {
      isBackOffice: true,
      status: 'Active'
    })

    // Assert
    expect(rows).toEqual([
      { key: 'CPH number', text: '12/345/0001' },
      { key: 'Holding type', text: 'Agricultural Holding (AH)' },
      { key: 'Status', text: 'Active' },
      { key: 'Holding name', text: 'Oakfield Farm' },
      { key: 'Address', lines: ['Oakfield Farm'] },
      {
        key: 'Herd marks',
        lines: ['UK 654322', 'UK 654323'],
        emptyText: 'Not recorded'
      }
    ])
  })

  test('it leaves out the holding name row for back office when no name is recorded', () => {
    // Arrange
    const holding = {
      cph: '12/345/0001',
      name: '',
      address: [],
      herd_marks: []
    }

    // Act
    const rows = buildHoldingRows(holding, {
      isBackOffice: true,
      status: 'Active'
    })

    // Assert
    expect(rows.map(({ key }) => key)).toEqual([
      'CPH number',
      'Holding type',
      'Status',
      'Address',
      'Herd mark'
    ])
    expect(rows[1]).toEqual({ key: 'Holding type', text: null })
  })
})

describe('buildKeeperDetails()', () => {
  test('it builds the keeper details from a full association', () => {
    // Arrange
    const association = {
      customer_number: 'C1',
      name: 'James Williams',
      first_name: 'Jim',
      last_name: 'Williams',
      email: 'james@example.com',
      telephone: '01632960001',
      mobile: '07700900001',
      address: ['1 Church Lane', '', 'Shrewsbury', 'England'],
      roles: [{ code: 'keeper' }]
    }

    // Act
    const result = buildKeeperDetails(association)

    // Assert
    expect(result).toEqual({
      name: 'James Williams',
      email: 'james@example.com',
      telephone: { text: '01632960001', href: 'tel:01632960001' },
      addressLines: ['1 Church Lane', 'Shrewsbury', 'England']
    })
  })

  test('it falls back to first and last name when there is no name', () => {
    // Arrange
    const association = {
      customer_number: 'C1',
      name: null,
      first_name: 'James',
      last_name: 'Williams',
      address: [],
      roles: []
    }

    // Act
    const result = buildKeeperDetails(association)

    // Assert
    expect(result.name).toBe('James Williams')
  })

  test('it uses whichever of first and last name is recorded', () => {
    // Arrange
    const association = {
      customer_number: 'C1',
      last_name: 'Williams',
      address: [],
      roles: []
    }

    // Act
    const result = buildKeeperDetails(association)

    // Assert
    expect(result.name).toBe('Williams')
  })

  test('it uses the mobile when there is no telephone', () => {
    // Arrange
    const association = {
      customer_number: 'C1',
      telephone: null,
      mobile: '07700 900001',
      address: [],
      roles: []
    }

    // Act
    const result = buildKeeperDetails(association)

    // Assert
    expect(result.telephone).toEqual({
      text: '07700 900001',
      href: 'tel:07700900001'
    })
  })

  test('it leaves name, email, telephone and address empty when none are recorded', () => {
    // Arrange
    const association = { customer_number: 'C1', roles: [] }

    // Act
    const result = buildKeeperDetails(association)

    // Assert
    expect(result).toEqual({
      name: null,
      email: null,
      telephone: null,
      addressLines: []
    })
  })
})
