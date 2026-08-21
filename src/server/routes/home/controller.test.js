import { vi } from 'vitest'
import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'
import {
  createSpokeAuthToken,
  issueHubJwt
} from '@defra/lis-hubs-infra-access/auth'

import { config } from '#config/config.js'
import { createServer } from '#server/server.js'
import {
  buildHoldingActionLinks,
  cphFromParams,
  cphPath,
  homeController
} from './controller.js'

const { getCattleForCph, getCphsForUser } = vi.hoisted(() => ({
  getCattleForCph: vi.fn(),
  getCphsForUser: vi.fn()
}))

vi.mock('#server/services/cattle-home-api.js', () => ({
  createCattleHomeApi: () => ({ getCattleForCph, getCphsForUser })
}))

async function createHubJwt(roles = ['lis-role-cattle-read']) {
  return issueHubJwt(
    {
      sub: 'test-user',
      email: 'test.user@example.com',
      firstName: 'Test',
      lastName: 'User',
      roles,
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

async function createHubServiceToken() {
  return createSpokeAuthToken(
    {
      taxonomyId: 'home',
      spokeId: 'cattle-home',
      user: {
        sub: 'test-user',
        email: 'test.user@example.com',
        firstName: 'Test',
        lastName: 'User',
        roles: ['lis-role-cattle-read']
      }
    },
    {
      secret: config.get('auth.hubJwt.secret'),
      issuer: config.get('auth.hubOrigins')[0],
      audience: config.get('auth.hubJwt.audience'),
      ttlSeconds: config.get('auth.hubJwt.ttlSeconds')
    }
  )
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
    getCphsForUser.mockResolvedValue({
      source: 'cph-provider',
      cached_until_utc: '2026-07-15T12:00:00Z',
      data: [{ name: 'My farm', cph: '10/081/1234', postcode: 'MK11 1AA' }]
    })
    getCattleForCph.mockResolvedValue({
      data: [
        {
          eartag: 'UK123456100001',
          sex: 'Female',
          breed: 'HF',
          status: 'saved'
        },
        {
          eartag: 'UK123456100002',
          sex: 'Male',
          breed: 'AA',
          status: 'draft'
        },
        { eartag: 'UK123456100003', sex: 'Female', breed: 'JE' }
      ]
    })
    const request = {
      method: 'GET',
      url: '/10/081/1234',
      headers: {
        'x-cdp-request-id': 'trace-123'
      }
    }

    const jwt = await createHubJwt()
    request.headers.cookie = `${config.get('auth.hubJwt.cookieName')}=${jwt}`

    const { result, statusCode } = await server.inject(request)

    expect(result).toEqual(expect.stringContaining('Home for Cattle |'))
    expect(result).toEqual(expect.stringContaining('My farm'))
    expect(result).toEqual(expect.stringContaining('10/081/1234'))
    expect(result).toEqual(expect.stringContaining('3 cattle'))
    expect(result).toEqual(expect.stringContaining('MK11 1AA'))
    expect(result).toEqual(
      expect.stringContaining('href="/cattle/register/10/081/1234"')
    )
    expect(result).toEqual(
      expect.stringContaining('href="/cattle/move/10/081/1234"')
    )
    expect(result).toEqual(
      expect.stringContaining('href="/cattle/death/10/081/1234"')
    )
    expect(result).toEqual(expect.stringContaining('UK123456100001'))
    expect(result).toEqual(expect.stringContaining('Female'))
    expect(result).toEqual(expect.stringContaining('HF'))
    expect(result).toEqual(expect.stringContaining('Validated'))
    expect(result).toEqual(expect.stringContaining('Pending'))
    expect(getCphsForUser).toHaveBeenCalledWith(
      'test.user@example.com',
      'trace-123'
    )
    expect(statusCode).toBe(statusCodes.ok)
  })

  test('Should use the first holding when no CPH is selected', async () => {
    getCphsForUser.mockResolvedValue({
      data: [{ name: 'My farm', cph: '10/081/1234' }]
    })
    getCattleForCph.mockResolvedValue({ data: [] })
    const jwt = await createHubJwt()

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/',
      headers: {
        cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}`
      }
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('My farm')
  })

  test('Should return not found for a CPH the user does not hold', async () => {
    getCphsForUser.mockResolvedValue({ data: [] })
    const jwt = await createHubJwt()

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/10/081/9999',
      headers: {
        cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}`
      }
    })

    expect(statusCode).toBe(statusCodes.notFound)
    expect(result).toBe('Page not found')
  })

  test('Should provide a summary fragment to the front-office hub', async () => {
    getCphsForUser.mockResolvedValue({
      data: [{ name: 'My farm', cph: '10/081/1234' }]
    })
    getCattleForCph.mockResolvedValue({ data: [{}, {}] })
    const bearerToken = await createHubServiceToken()

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/summary',
      headers: { authorization: bearerToken }
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(expect.stringContaining('My farm'))
    expect(result).toEqual(expect.stringContaining('10/081/1234'))
    expect(result).toEqual(expect.stringContaining('>2</dd>'))
    expect(result).not.toEqual(expect.stringContaining('<html'))
  })

  test('Should reject summary requests without a hub-service token', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/summary'
    })

    expect(statusCode).toBe(statusCodes.unauthorized)
    expect(result).toEqual({ message: 'Hub service authentication required' })
  })

  test('Should provide structured summary data to the front-office hub', async () => {
    getCphsForUser.mockResolvedValue({
      data: [
        {
          name: 'My farm',
          cph: '10/081/1234',
          postcode: 'MK11 1AA'
        }
      ]
    })
    getCattleForCph.mockResolvedValue({
      data: [
        {
          cattle_id: 'UK123456100001',
          eartag: 'UK123456100001',
          date_of_birth: '2024-01-15',
          sex: 'Female',
          breed: 'HF',
          status: 'saved'
        }
      ]
    })
    const bearerToken = await createHubServiceToken()

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/summary-data',
      headers: { authorization: bearerToken }
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual({
      species: {
        id: 'cattle',
        label: 'Cattle',
        url: '/cattle/home'
      },
      holdings: [
        {
          farmName: 'My farm',
          cph: '10/081/1234',
          postcode: 'MK11 1AA',
          count: 1,
          url: '/cattle/home/10/081/1234',
          animals: [
            {
              id: 'UK123456100001',
              earTag: 'UK123456100001',
              dateOfBirth: '2024-01-15',
              dateRegistered: undefined,
              sex: 'Female',
              breed: 'HF',
              status: 'saved',
              statusLabel: 'Validated'
            }
          ]
        }
      ],
      actions: []
    })
  })

  test('Should map alternate animal property names in summary data', async () => {
    getCphsForUser.mockResolvedValue({
      data: [{ name: 'My farm', cph: '10/081/1234' }]
    })
    getCattleForCph.mockResolvedValue({
      data: [
        {
          cattleId: 'secondary-id',
          eartag: 'UK123',
          dateOfBirth: '2024-02-01',
          dateRegistered: '2024-02-02'
        },
        { eartag: 'fallback-id' }
      ]
    })
    const bearerToken = await createHubServiceToken()

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/summary-data',
      headers: { authorization: bearerToken }
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result.holdings[0].animals).toEqual([
      expect.objectContaining({
        id: 'secondary-id',
        dateOfBirth: '2024-02-01',
        dateRegistered: '2024-02-02'
      }),
      expect.objectContaining({ id: 'fallback-id' })
    ])
  })

  test('Should redirect to the hub when the JWT is missing', async () => {
    const { headers, statusCode } = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(statusCode).toBe(302)
    expect(headers.location).toContain(
      'https://front-office.lis.defra/auth/login?returnUrl=%2Fcattle%2Fhome'
    )
  })

  test('Should return forbidden when the user lacks the cattle module permission', async () => {
    const jwt = await createHubJwt(['lis-role-cattle-move-read'])
    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: '/',
      headers: {
        cookie: `${config.get('auth.hubJwt.cookieName')}=${jwt}`
      }
    })

    expect(statusCode).toBe(statusCodes.forbidden)
    expect(result).toEqual({ message: 'Module access denied' })
  })

  test.each([
    [
      { firstName: 'Ada', lastName: 'Lovelace', email: null, sub: 'subject' },
      'Ada Lovelace',
      'subject'
    ],
    [
      { firstName: '', lastName: '', email: null, sub: 'subject' },
      'subject',
      'subject'
    ],
    [
      { firstName: '', lastName: '', email: null, sub: null },
      'Authenticated user',
      null
    ]
  ])(
    'Should use the available authenticated identity',
    async (hubAuth, signedInAs, expectedUserId) => {
      getCphsForUser.mockResolvedValue({ data: [] })
      const view = vi.fn().mockReturnValue('rendered')

      const result = await homeController.handler(
        {
          app: { hubAuth },
          headers: {},
          params: {}
        },
        { view }
      )

      expect(result).toBe('rendered')
      expect(getCphsForUser).toHaveBeenCalledWith(expectedUserId, undefined)
      expect(view).toHaveBeenCalledWith(
        'home/index',
        expect.objectContaining({ signedInAs, actionLinks: [] })
      )
    }
  )
})

describe('home route helpers', () => {
  test('builds and encodes holding paths', () => {
    expect(
      cphFromParams({ county: '10', parish: '081', holding: '1234' })
    ).toBe('10/081/1234')
    expect(cphFromParams({ county: '10', parish: '081' })).toBeNull()
    expect(cphFromParams()).toBeNull()
    expect(cphPath('10/08 1/12#34')).toBe('10/08%201/12%2334')
    expect(buildHoldingActionLinks('10/081/1234')).toHaveLength(3)
  })
})
