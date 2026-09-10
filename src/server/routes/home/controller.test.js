import { vi } from 'vitest'
import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'
import { issueHubJwt } from '@defra/lis-hubs-infra-access/auth'

import { config } from '#config/config.js'
import { createServer } from '#server/server.js'
import { cphPath, landingController } from './controller.js'

const { getCphsForUser } = vi.hoisted(() => ({
  getCphsForUser: vi.fn()
}))

vi.mock('#server/services/cattle-home-api.js', () => ({
  createCattleHomeApi: () => ({ getCphsForUser })
}))

async function createHubJwt(
  statements = [{ role: 'lis-role-cattle-read', cphs: '*' }]
) {
  return issueHubJwt(
    {
      sub: 'test-user',
      email: 'test.user@example.com',
      firstName: 'Test',
      lastName: 'User',
      statements,
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
    getCphsForUser.mockResolvedValue({
      data: [{ name: 'My farm', cph: '10/081/1234' }]
    })
    const jwt = await createHubJwt()

    // Act
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/',
      headers: { cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}` }
    })

    // Assert
    expect(statusCode).toBe(302)
    expect(headers.location).toBe('/cattle/holdings/10/081/1234')
  })

  test('Should redirect a keeper with several holdings to the first', async () => {
    // Arrange
    getCphsForUser.mockResolvedValue({
      data: [
        { name: 'First farm', cph: '10/081/1234' },
        { name: 'Second farm', cph: '10/081/5678' }
      ]
    })
    const jwt = await createHubJwt()

    // Act
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/',
      headers: { cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}` }
    })

    // Assert
    expect(statusCode).toBe(302)
    expect(headers.location).toBe('/cattle/holdings/10/081/1234')
  })

  test('Should return not found when the keeper has no holdings', async () => {
    // Arrange
    getCphsForUser.mockResolvedValue({ data: [] })
    const jwt = await createHubJwt()

    // Act
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/',
      headers: { cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}` }
    })

    // Assert
    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('Should resolve the user id from the sub when there is no email', async () => {
    // Arrange
    getCphsForUser.mockResolvedValue({
      data: [{ name: 'Farm', cph: '10/081/1234' }]
    })
    const redirect = vi.fn()

    // Act
    await landingController.handler(
      { app: { hubAuth: { sub: 'subject-id', email: null } }, headers: {} },
      { redirect }
    )

    // Assert
    expect(getCphsForUser).toHaveBeenCalledWith('subject-id')
    expect(redirect).toHaveBeenCalledWith('/cattle/holdings/10/081/1234')
  })

  test('Should redirect to the hub when the JWT is missing', async () => {
    // Act
    const { headers, statusCode } = await server.inject({
      method: 'GET',
      url: '/'
    })

    // Assert
    expect(statusCode).toBe(302)
    expect(headers.location).toContain(
      'https://front-office.lis.defra/auth/login?returnUrl=%2Fcattle'
    )
  })

  test('Should return forbidden when the user lacks the cattle module permission', async () => {
    // Arrange
    const jwt = await createHubJwt([
      { role: 'lis-role-cattle-move-read', cphs: '*' }
    ])

    // Act
    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: '/',
      headers: { cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}` }
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
