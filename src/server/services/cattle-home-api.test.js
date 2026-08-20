import { createCattleHomeApi, CattleHomeApiError } from './cattle-home-api.js'

const configValues = {
  'cattleHomeApi.url': 'http://localhost:8085',
  'cattleHomeApi.apiKey': 'test-api-key',
  'cattleHomeApi.apiKeyHeader': 'x-api-key',
  'cattleHomeApi.timeout': 5000,
  'tracing.header': 'x-cdp-request-id',
  log: {
    enabled: false,
    level: 'silent',
    format: 'json',
    redact: []
  },
  serviceName: 'Cattle home API client test',
  serviceVersion: null
}

const config = {
  get(key) {
    return configValues[key]
  }
}

function jsonResponse(data, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(data)
  }
}

describe('#createCattleHomeApi', () => {
  test('Creates an API error without optional metadata', () => {
    const error = new CattleHomeApiError('Failed')

    expect(error).toEqual(
      expect.objectContaining({
        name: 'CattleHomeApiError',
        message: 'Failed',
        statusCode: undefined
      })
    )
  })

  test('Requires a config object and fetch implementation', () => {
    expect(() => createCattleHomeApi({})).toThrow(
      'Cattle home API client requires a config object with a get method'
    )
    expect(() => createCattleHomeApi({ config, fetchImpl: null })).toThrow(
      'Cattle home API client requires a fetch implementation'
    )
  })

  test('Gets CPHs for an encoded user ID with API and tracing headers', async () => {
    const payload = { source: 'cph-provider', data: [] }
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(payload))
    const client = createCattleHomeApi({ config, fetchImpl })

    const result = await client.getCphsForUser(
      'test.user+home@example.com',
      'trace-123'
    )

    expect(result).toEqual(payload)
    expect(fetchImpl).toHaveBeenCalledWith(
      new URL(
        'http://localhost:8085/api/users/test.user%2Bhome%40example.com/cphs'
      ),
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'x-api-key': 'test-api-key',
          'x-cdp-request-id': 'trace-123'
        },
        signal: expect.any(AbortSignal)
      }
    )
  })

  test('Gets cattle using the three CPH route segments', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: [] }))
    const client = createCattleHomeApi({ config, fetchImpl })

    await client.getCattleForCph('10/081/1234')

    expect(fetchImpl.mock.calls[0][0].toString()).toBe(
      'http://localhost:8085/api/cphs/10/081/1234/cattle'
    )
  })

  test('Omits optional request headers when they are not configured', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: [] }))
    const configWithoutApiKey = {
      get(key) {
        return key === 'cattleHomeApi.apiKey' ? '' : configValues[key]
      }
    }
    const client = createCattleHomeApi({
      config: configWithoutApiKey,
      fetchImpl
    })

    await client.getCphsForUser('test-user')

    expect(fetchImpl.mock.calls[0][1].headers).toEqual({
      accept: 'application/json'
    })
  })

  test('Rejects malformed CPH values without making a request', async () => {
    const fetchImpl = vi.fn()
    const client = createCattleHomeApi({ config, fetchImpl })

    expect(() => client.getCattleForCph('10/081')).toThrow(
      'CPH must contain county, parish and holding'
    )
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  test('Rejects a CPH containing an empty segment', () => {
    const fetchImpl = vi.fn()
    const client = createCattleHomeApi({ config, fetchImpl })

    expect(() => client.getCattleForCph('10//1234')).toThrow(
      'CPH must contain county, parish and holding'
    )
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  test('Gets details using an encoded cattle ID', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: {} }))
    const client = createCattleHomeApi({ config, fetchImpl })

    await client.getCattleDetails('UK 123/456')

    expect(fetchImpl.mock.calls[0][0].toString()).toBe(
      'http://localhost:8085/api/cattle/UK%20123%2F456'
    )
  })

  test('Raises a typed error when the API request fails', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(null, { ok: false, status: 503 }))
    const client = createCattleHomeApi({ config, fetchImpl })

    await expect(client.getCphsForUser('test-user')).rejects.toEqual(
      expect.objectContaining({
        name: 'CattleHomeApiError',
        statusCode: 503,
        message: 'Cattle home API request failed with status 503'
      })
    )
  })

  test('Raises a typed error when the response is not JSON', async () => {
    const response = jsonResponse(null)
    response.json.mockRejectedValue(new SyntaxError('Invalid JSON'))
    const fetchImpl = vi.fn().mockResolvedValue(response)
    const client = createCattleHomeApi({ config, fetchImpl })

    await expect(client.getCphsForUser('test-user')).rejects.toBeInstanceOf(
      CattleHomeApiError
    )
  })
})
