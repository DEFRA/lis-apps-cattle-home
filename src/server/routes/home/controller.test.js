import { vi } from 'vitest'
import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'

import { spokeAuth } from '#test-helpers/spoke-auth.js'
import { createServer } from '#server/server.js'
import { cphPath, landingController } from './controller.js'

function createUser({
  statements = [
    {
      role: 'lis-role-cattle-read',
      cphs: '*',
      permissions: ['lis-perm-cattle-read']
    }
  ],
  holdings = []
} = {}) {
  return {
    sub: 'test-user',
    email: 'test.user@example.com',
    firstName: 'Test',
    lastName: 'User',
    statements,
    holdings,
    serviceId: 'test-service'
  }
}

describe('#landingController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should redirect a keeper with one holding to its details page', async () => {
    // Arrange
    const user = createUser({
      holdings: [{ countyParishHoldingNumber: '10/081/1234' }]
    })

    // Act
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/',
      auth: spokeAuth(user)
    })

    // Assert
    expect(statusCode).toBe(302)
    expect(headers.location).toBe('/cattle/holdings/10/081/1234')
  })

  test('Should redirect a keeper with several holdings to the first', async () => {
    // Arrange
    const user = createUser({
      holdings: [
        { countyParishHoldingNumber: '10/081/1234' },
        { countyParishHoldingNumber: '10/081/5678' }
      ]
    })

    // Act
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/',
      auth: spokeAuth(user)
    })

    // Assert
    expect(statusCode).toBe(302)
    expect(headers.location).toBe('/cattle/holdings/10/081/1234')
  })

  test('Should return not found when the keeper has no holdings', async () => {
    // Arrange
    const user = createUser()

    // Act
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/',
      auth: spokeAuth(user)
    })

    // Assert
    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('Should resolve the user id from the sub when there is no email', async () => {
    // Arrange
    const redirect = vi.fn()
    const request = {
      auth: {
        credentials: {
          user: {
            sub: 'subject-id',
            email: null,
            holdings: [{ countyParishHoldingNumber: '10/081/1234' }]
          }
        }
      },
      headers: {}
    }

    // Act
    landingController.handler(request, { redirect })

    // Assert
    expect(redirect).toHaveBeenCalledWith('/cattle/holdings/10/081/1234')
  })

  test('Should reject a request without a hub service token', async () => {
    // Act
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/'
    })

    // Assert
    expect(statusCode).toBe(statusCodes.unauthorized)
    expect(result).toEqual({ message: 'Service authentication required' })
  })

  test('Should return forbidden when the user lacks the cattle module permission', async () => {
    // Arrange
    const user = createUser({
      statements: [
        {
          role: 'lis-role-cattle-move-read',
          cphs: '*',
          permissions: ['lis-perm-cattle-move-read']
        }
      ]
    })

    // Act
    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: '/',
      auth: spokeAuth(user)
    })

    // Assert
    expect(statusCode).toBe(statusCodes.forbidden)
    expect(result).toEqual(expect.stringContaining('Forbidden'))
  })
})

describe('cphPath()', () => {
  test('it percent-encodes each segment and keeps the slashes', () => {
    // Act
    const encoded = cphPath('10/08 1/12#34')

    // Assert
    expect(encoded).toBe('10/08%201/12%2334')
  })
})
