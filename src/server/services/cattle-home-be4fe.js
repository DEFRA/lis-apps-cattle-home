import { BaseClient } from '@defra/lis-hubs-infra-core'

// Whether cattle-home itself runs as 'local' or 'docker_compose', it runs
// directly on the host, where localhost and host.docker.internal are the
// same destination - so the BE4FE (which always stays in docker per the
// project's local dev workflow) is always reached via its published port.
const localPort = 8087

const cphSegmentCount = 3

export class CattleHomeBe4Fe extends BaseClient {
  /**
   * @param {string} environment 'local' | 'docker_compose' | 'dev' | 'test' | 'ext-test' | 'perf-test' | 'prod'
   * @param {string} [apiKey] Optional API key sent to the cattle-home BE4FE API
   */
  constructor(environment, apiKey) {
    super({
      environment,
      serviceName: 'lis-be4fe-cattle-home',
      port: localPort,
      apiKeyHeader: 'x-api-key',
      apiKey
    })
  }

  /**
   * @param {string} userId
   * @returns {Promise<object>} the CPHs held by this user
   */
  async getCphsForUser(userId) {
    const { payload } = await this._get(
      `api/users/${encodeURIComponent(userId)}/cphs`
    )
    return payload
  }

  /**
   * @param {string} cph holding identifier, e.g. '10/081/1234'
   * @returns {Promise<object>} the cattle on this CPH
   */
  async getCattleForCph(cph) {
    const cphSegments = cph.split('/')

    if (
      cphSegments.length !== cphSegmentCount ||
      cphSegments.some((part) => !part)
    ) {
      throw new TypeError('CPH must contain county, parish and holding')
    }

    const encodedCph = cphSegments.map(encodeURIComponent).join('/')
    const { payload } = await this._get(`api/cphs/${encodedCph}/cattle`)
    return payload
  }

  /**
   * @param {string} cattleId
   * @returns {Promise<object>} the cattle's details
   */
  async getCattleDetails(cattleId) {
    const { payload } = await this._get(
      `api/cattle/${encodeURIComponent(cattleId)}`
    )
    return payload
  }
}
