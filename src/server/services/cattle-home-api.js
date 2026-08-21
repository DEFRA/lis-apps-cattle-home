import { getLoggerForConfig } from '@defra/lis-infra-ui-services/logging'

const cphSegmentCount = 3

/**
 * Error returned for an unsuccessful or invalid cattle-home API response.
 */
export class CattleHomeApiError extends Error {
  /**
   * @param {string} message Error description
   * @param {{ cause?: Error, statusCode?: number }} options Error metadata
   */
  constructor(message, options = {}) {
    super(message, options)
    this.name = 'CattleHomeApiError'
    this.statusCode = options.statusCode
  }
}

/**
 * @param {{ config: object, fetchImpl?: Function }} options
 * @returns {object} Cattle-home API operations
 */
export function createCattleHomeApi({ config, fetchImpl = globalThis.fetch }) {
  if (!config?.get) {
    throw new TypeError(
      'Cattle home API client requires a config object with a get method'
    )
  }

  if (typeof fetchImpl !== 'function') {
    throw new TypeError(
      'Cattle home API client requires a fetch implementation'
    )
  }

  const logger = getLoggerForConfig(config)
  const baseUrl = new URL(config.get('cattleHomeApi.url'))
  const apiKey = config.get('cattleHomeApi.apiKey')
  const apiKeyHeader = config.get('cattleHomeApi.apiKeyHeader')
  const timeout = config.get('cattleHomeApi.timeout')
  const tracingHeader = config.get('tracing.header')

  async function getJson(path, traceId) {
    const url = new URL(path, ensureTrailingSlash(baseUrl))
    const headers = { accept: 'application/json' }

    if (apiKey) {
      headers[apiKeyHeader] = apiKey
    }

    if (traceId) {
      headers[tracingHeader] = traceId
    }

    logger.info('Getting data from the cattle-home API')

    const response = await fetchImpl(url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(timeout)
    })

    if (!response.ok) {
      throw new CattleHomeApiError(
        `Cattle home API request failed with status ${response.status}`,
        { statusCode: response.status }
      )
    }

    try {
      return await response.json()
    } catch (error) {
      throw new CattleHomeApiError(
        'Cattle home API returned an invalid JSON response',
        { cause: error, statusCode: response.status }
      )
    }
  }

  return {
    getCphsForUser(userId, traceId) {
      return getJson(`api/users/${encodeURIComponent(userId)}/cphs`, traceId)
    },

    getCattleForCph(cph, traceId) {
      const cphSegments = cph.split('/')

      if (
        cphSegments.length !== cphSegmentCount ||
        cphSegments.some((part) => !part)
      ) {
        throw new TypeError('CPH must contain county, parish and holding')
      }

      const encodedCph = cphSegments.map(encodeURIComponent).join('/')
      return getJson(`api/cphs/${encodedCph}/cattle`, traceId)
    },

    getCattleDetails(cattleId, traceId) {
      return getJson(`api/cattle/${encodeURIComponent(cattleId)}`, traceId)
    }
  }
}

function ensureTrailingSlash(url) {
  const value = new URL(url)
  value.pathname = `${value.pathname.replace(/\/$/, '')}/`
  return value
}
