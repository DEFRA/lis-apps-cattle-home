import { BaseClient } from '@defra/lis-hubs-infra-core'

import { config } from '#config/config.js'
import { searchAnimals } from '#server/services/animals/search.js'
import { paginateAnimals } from '#server/services/animals/paginate.js'

/**
 * @typedef {object} UserCph
 * @property {string} cph
 * @property {string} name
 * @property {string} business_name
 * @property {string[]} address
 * @property {string[]} allowed_species
 * @property {string} [holding_type]
 * @property {string} [registered_keeper]
 * @property {string[]} herd_marks
 * @property {string} [postcode]
 * @property {number} [latitude]
 * @property {number} [longitude]
 */

/**
 * @typedef {object} HoldingDetails
 * @property {string} cph
 * @property {string} [name]
 * @property {string} [business_name]
 * @property {string[]} address
 * @property {string} [holding_type]
 * @property {string} [registered_keeper]
 * @property {string[]} herd_marks
 * @property {string[]} allowed_species
 */

/**
 * @typedef {object} CattleSummary
 * @property {string} cattle_id
 * @property {string} eartag
 * @property {string} breed
 * @property {string} [breed_code]
 * @property {string} [breed_name]
 * @property {string} date_of_birth
 * @property {string} [date_on_cph]
 * @property {string} sex
 * @property {string} status
 */

/**
 * @typedef {object} CattleDetails
 * @property {string} eartag
 * @property {string} [cph]
 * @property {string} [breed] breed code, e.g. "HF"
 * @property {string} [sex]
 * @property {string} [date_of_birth] ISO date, e.g. "2023-04-15"
 * @property {string} [date_registered] ISO date
 * @property {string} [date_on_cph] ISO date
 * @property {string} [state] e.g. "Alive", "Dead"
 * @property {string} [restriction_status] e.g. "Restricted", "None"
 * @property {string} [dam_type] "genetic" | "surrogate" (case-insensitive)
 * @property {string} [genetic_dam_tag]
 * @property {string} [surrogate_tag]
 * @property {string} [sire_tag]
 * @property {string} [sire_name]
 */

// Whether cattle-home itself runs as 'local' or 'docker_compose', it runs
// directly on the host, where localhost and host.docker.internal are the
// same destination - so the BE4FE (which always stays in docker per the
// project's local dev workflow) is always reached via its published port.
const localPort = 8087

const cphPattern = /^(\d{2})\/(\d{3})\/(\d{4})$/

class CattleHomeBe4FeClient extends BaseClient {
  /**
   * @param {object} options
   * @param {string} options.environment 'local' | 'docker_compose' | 'dev' | 'test' | 'ext-test' | 'perf-test' | 'prod'
   * @param {string} [options.apiKey] Optional API key sent to the cattle-home BE4FE API
   */
  constructor({ environment, apiKey }) {
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
   * @returns {Promise<UserCph[]>} the CPHs held by this user
   */
  async getCphsForUser(userId) {
    const { payload } = await this._get(
      `api/users/${encodeURIComponent(userId)}/cphs`
    )
    return payload.data
  }

  /**
   * @param {string} cph holding identifier, e.g. '10/081/1234'
   * @returns {string} the CPH re-encoded as three URL path segments
   */
  #encodeCphSegments(cph) {
    if (!cphPattern.test(cph)) {
      throw new TypeError('CPH must contain county, parish and holding')
    }

    return cph
  }

  /**
   * @param {string} cph holding identifier, e.g. '10/081/1234'
   * @returns {Promise<HoldingDetails>} the holding's details
   */
  async getHoldingDetails(cph) {
    const encodedCph = this.#encodeCphSegments(cph)
    const { payload } = await this._get(`api/cphs/${encodedCph}`)
    return payload.data
  }

  /**
   * @param {string} cph holding identifier, e.g. '10/081/1234'
   * @param {object} [options]
   * @param {string} [options.q] free-text match against ear tag, sex or breed
   * @param {string} [options.orderBy] column to sort by, see sortFields
   * @param {'asc'|'desc'} [options.direction]
   * @param {number} [options.page] 1-indexed page number
   * @param {number} [options.pageSize]
   * @returns {Promise<{ animals: CattleSummary[], totalItems: number, totalPages: number, currentPage: number, itemsPerPage: number }>}
   */
  async getCattleOnHolding(cph, options = {}) {
    const encodedCph = this.#encodeCphSegments(cph)

    const { payload } = await this._get(`api/cphs/${encodedCph}/cattle`)
    let animals = payload.data
    if (options.q) {
      animals = searchAnimals(animals, options.q)
    }
    return paginateAnimals(animals, {
      orderBy: options.orderBy,
      direction: options.direction,
      page: options.page,
      pageSize: options.pageSize
    })
  }

  /**
   * @param {string} cattleId
   * @returns {Promise<CattleDetails>} the cattle's details
   */
  async getCattleDetails(cattleId) {
    const { payload } = await this._get(
      `api/cattle/${encodeURIComponent(cattleId)}`
    )
    return payload.data
  }
}

export const cattleHomeBe4FeClient = new CattleHomeBe4FeClient({
  environment: config.get('environment'),
  apiKey: config.get('cattleHomeApi.apiKey')
})
