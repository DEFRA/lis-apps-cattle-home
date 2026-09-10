import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'
import { issueHubJwt } from '@defra/lis-hubs-infra-access/auth'

import { config } from '#config/config.js'
import { createServer } from '#server/server.js'
import { cphFromParams } from './controller.js'
import { holdings } from './index.js'

async function createHubJwt() {
  return issueHubJwt(
    {
      sub: 'test-user',
      email: 'test.user@example.com',
      firstName: 'Test',
      lastName: 'User',
      statements: [{ role: 'lis-role-cattle-read', cphs: '*' }],
      serviceId: 'test-service'
    },
    {
      secret: config.get('auth.hubJwt.secret'),
      issuer: config.get('auth.hubOrigins')[0],
      audience: config.get('auth.hubJwt.audience'),
      ttlSeconds: config.get('auth.hubJwt.ttlSeconds')
    }
  )
}

describe('cphFromParams()', () => {
  test('it builds a CPH from the three route segments', () => {
    // Arrange
    const params = { county: '22', parish: '001', holding: '0001' }

    // Act
    const cph = cphFromParams(params)

    // Assert
    expect(cph).toBe('22/001/0001')
  })

  test('it returns null when a segment is missing', () => {
    // Arrange
    const params = { county: '22', parish: '001' }

    // Act
    const cph = cphFromParams(params)

    // Assert
    expect(cph).toBeNull()
  })

  test('it returns null when no params are given', () => {
    // Act
    const cph = cphFromParams()

    // Assert
    expect(cph).toBeNull()
  })
})

describe('holdings plugin', () => {
  test('it registers the holding details route', () => {
    // Arrange
    const route = vi.fn()

    // Act
    holdings.plugin.register({ route })

    // Assert
    expect(route).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: '/holdings/{county}/{parish}/{holding}'
      })
    )
  })
})

describe('holdingDetailsController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('it renders the hardcoded Oakfield Farm holding for an authenticated user', async () => {
    // Arrange
    const jwt = await createHubJwt()
    const request = {
      method: 'GET',
      url: '/holdings/22/001/0001',
      headers: {
        cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}`
      }
    }

    // Act
    const { result, statusCode } = await server.inject(request)

    // Assert
    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(
      expect.stringContaining(
        'Holding details - Cattle - Livestock Information'
      )
    )
    expect(result).toEqual(
      expect.stringContaining(
        '<h1 class="govuk-heading-l">Holding details</h1>'
      )
    )
    expect(result).toEqual(expect.stringContaining('govuk-grid-column-full'))
    expect(result).toEqual(expect.stringContaining('Oakfield Farm'))
    expect(result).toEqual(expect.stringContaining('22/001/0001'))
    expect(result).toEqual(expect.stringContaining('Oakfield Livestock Ltd'))
    expect(result).toEqual(expect.stringContaining('UK 324537'))
    expect(result).not.toEqual(expect.stringContaining('Registered keeper'))
    expect(result).toEqual(
      expect.stringContaining('href="/cattle/holdings/22/001/0001"')
    )
  })

  test('it redirects an unauthenticated request to the hub login', async () => {
    // Arrange
    const request = {
      method: 'GET',
      url: '/holdings/22/001/0001'
    }

    // Act
    const { statusCode, headers } = await server.inject(request)

    // Assert
    expect(statusCode).toBe(302)
    expect(headers.location).toBeDefined()
  })
})
