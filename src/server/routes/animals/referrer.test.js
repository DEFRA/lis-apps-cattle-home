import { describe, expect, test } from 'vitest'

import { getSameHostReferrerPath } from './controller.js'

describe('getSameHostReferrerPath()', () => {
  test('it returns the path and query of a referrer on the forwarded host', () => {
    // Arrange
    const request = {
      headers: {
        referer:
          'https://front-office.lis.defra/cattle/holdings/22/002/0002/animals?page=2&sort=sex',
        'x-forwarded-host': 'front-office.lis.defra',
        host: 'localhost:3221'
      }
    }

    // Act
    const result = getSameHostReferrerPath(request)

    // Assert
    expect(result).toBe('/cattle/holdings/22/002/0002/animals?page=2&sort=sex')
  })

  test('it uses the first forwarded host when there are several', () => {
    // Arrange
    const request = {
      headers: {
        referer: 'https://front-office.lis.defra/cattle',
        'x-forwarded-host': 'front-office.lis.defra, proxy.internal'
      }
    }

    // Act
    const result = getSameHostReferrerPath(request)

    // Assert
    expect(result).toBe('/cattle')
  })

  test('it falls back to the host header when the request was not proxied', () => {
    // Arrange
    const request = {
      headers: {
        referer: 'http://localhost:3221/cattle/holdings/22/002/0002/animals',
        host: 'localhost:3221'
      }
    }

    // Act
    const result = getSameHostReferrerPath(request)

    // Assert
    expect(result).toBe('/cattle/holdings/22/002/0002/animals')
  })

  test('it ignores a referrer on another host', () => {
    // Arrange
    const request = {
      headers: {
        referer: 'https://evil.example/cattle/holdings/22/002/0002/animals',
        'x-forwarded-host': 'front-office.lis.defra'
      }
    }

    // Act
    const result = getSameHostReferrerPath(request)

    // Assert
    expect(result).toBeUndefined()
  })

  test('it ignores a referrer path that would point at another site', () => {
    // Arrange
    const request = {
      headers: {
        referer: 'https://front-office.lis.defra//evil.example/x',
        'x-forwarded-host': 'front-office.lis.defra'
      }
    }

    // Act
    const result = getSameHostReferrerPath(request)

    // Assert
    expect(result).toBeUndefined()
  })

  test('it ignores a malformed referrer', () => {
    // Arrange
    const request = {
      headers: { referer: 'not a url', host: 'front-office.lis.defra' }
    }

    // Act
    const result = getSameHostReferrerPath(request)

    // Assert
    expect(result).toBeUndefined()
  })

  test('it returns undefined when there is no referrer', () => {
    // Arrange
    const request = { headers: { host: 'front-office.lis.defra' } }

    // Act
    const result = getSameHostReferrerPath(request)

    // Assert
    expect(result).toBeUndefined()
  })
})
