import { TextEncoder } from 'node:util'

import { SignJWT } from 'jose'
import { statusCodes } from '@livestock/ui-services/status-codes'

import { config } from '#config/config.js'
import { createServer } from '#server/server.js'

const encoder = new TextEncoder()

async function createHubJwt(permissions = ['lis-perm-cattle-read']) {
  return new SignJWT({
    email: 'test.user@example.com',
    firstName: 'Test',
    lastName: 'User',
    roles: [],
    permissions,
    serviceId: 'test-service'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('test-user')
    .setIssuer(config.get('auth.hubJwt.issuer'))
    .setAudience(config.get('auth.hubJwt.audience'))
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(encoder.encode(config.get('auth.hubJwt.secret')))
}

describe('#homeController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should provide expected response', async () => {
    const request = {
      method: 'GET',
      url: '/'
    }

    const jwt = await createHubJwt()
    request.headers = {
      cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}`
    }

    const { result, statusCode } = await server.inject(request)

    expect(result).toEqual(expect.stringContaining('Home for Cattle |'))
    expect(statusCode).toBe(statusCodes.ok)
  })

  test('Should redirect to the hub when the JWT is missing', async () => {
    const { headers, statusCode } = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(statusCode).toBe(302)
    expect(headers.location).toContain(
      'http://localhost:3000/auth/login?returnUrl='
    )
  })

  test('Should return forbidden when the user lacks the cattle module permission', async () => {
    const jwt = await createHubJwt(['lis-perm-cattle-move-read'])
    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: '/',
      headers: {
        cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}`
      }
    })

    expect(statusCode).toBe(statusCodes.forbidden)
    expect(result).toEqual({ message: 'Forbidden' })
  })
})
