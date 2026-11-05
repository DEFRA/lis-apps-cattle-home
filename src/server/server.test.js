import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { createServer } from './server.js'

describe('createServer() CSRF protection', () => {
  let server

  beforeEach(async () => {
    server = await createServer()
  })

  afterEach(async () => {
    await server.stop({ timeout: 0 })
  })

  test('registers the CSRF plugin', () => {
    // Arrange / Act / Assert
    expect(server.registrations['lis-csrf']).toBeDefined()
  })

  test('refuses an unsafe-method request that carries no CSRF token', async () => {
    // Arrange
    server.route({
      method: 'POST',
      path: '/csrf-probe',
      options: { auth: false },
      handler: () => 'ok'
    })
    await server.initialize()

    // Act
    const response = await server.inject({
      method: 'POST',
      url: '/csrf-probe',
      headers: {
        'sec-fetch-site': 'same-origin',
        'x-lis-csrf-token': 't'
      },
      payload: {}
    })

    // Assert
    expect(response.statusCode).toBe(403)
  })

  test('refuses a cross-site request even when the CSRF token matches', async () => {
    // Arrange
    server.route({
      method: 'POST',
      path: '/csrf-probe',
      options: { auth: false },
      handler: () => 'ok'
    })
    await server.initialize()

    // Act
    const response = await server.inject({
      method: 'POST',
      url: '/csrf-probe',
      headers: {
        'sec-fetch-site': 'cross-site',
        'x-lis-csrf-token': 't'
      },
      payload: { _csrf: 't' }
    })

    // Assert
    expect(response.statusCode).toBe(403)
  })

  test('lets an unsafe-method request with a matching CSRF token through', async () => {
    // Arrange
    server.route({
      method: 'POST',
      path: '/csrf-probe',
      options: { auth: false },
      handler: () => 'ok'
    })
    await server.initialize()

    // Act
    const response = await server.inject({
      method: 'POST',
      url: '/csrf-probe',
      headers: {
        'sec-fetch-site': 'same-origin',
        'x-lis-csrf-token': 't'
      },
      payload: { _csrf: 't' }
    })

    // Assert
    expect(response.statusCode).toBe(200)
    expect(response.payload).toBe('ok')
  })
})
