import { buildMicrositePath } from '@defra/lis-infra-ui-services'
import { taxonomy } from '@defra/lis-taxonomy-home'
import { species } from '@defra/lis-species-cattle'
import { config } from '#config/config.js'
import { createCattleHomeApi } from '#server/services/cattle-home-api.js'
import { buildCattleHomeSummary } from '#server/services/cattle-home-summary.js'
import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'
import { getLoggerForConfig } from '@defra/lis-infra-ui-services/logging'

const cattleHomeApi = createCattleHomeApi({ config })
const header = 'tracing.header'

export const homeController = {
  async handler(request, h) {
    const logger = getLoggerForConfig(config)
    const traceId = request.headers[config.get(header)]
    const userId = request.app.hubAuth?.email ?? request.app.hubAuth?.sub
    logger.info(
      `Home page request received [traceId=${traceId} | userId=${userId} | path=${request.path}]`
    )

    const viewModel = await buildViewModel(request)
    const selectedCph = cphFromParams(request.params)
    const selectedHolding = selectedCph
      ? viewModel.holdings.find((holding) => holding.cph === selectedCph)
      : viewModel.holdings[0]

    if (selectedCph && !selectedHolding) {
      return h.response('Page not found').code(statusCodes.notFound)
    }
    const actionLinks = selectedHolding
      ? buildHoldingActionLinks(selectedHolding.cph)
      : []
    const homePath = buildMicrositePath(taxonomy.id, species.id)
    const holdingLinks = viewModel.holdings.map((holding) => ({
      ...holding,
      url: `${homePath}/${cphPath(holding.cph)}`,
      selected: holding.cph === selectedHolding?.cph
    }))

    return h.view('home/index', {
      pageTitle: 'Home for Cattle',
      heading: 'Home for Cattle',
      caption: 'Spoke microsite',
      taxonomy,
      species,
      ...viewModel,
      selectedCph,
      selectedHolding,
      holdingLinks,
      actionLinks,
      directPort: 3200,
      hubPath: buildMicrositePath(taxonomy.id, species.id)
    })
  }
}

/**
 * @param {string} cph holding identifier
 * @returns {{ text: string, url: string }[]} holding-scoped action links
 */
export function buildHoldingActionLinks(cph) {
  return [
    { text: 'Register cattle', taxonomyId: 'register' },
    { text: 'Move cattle', taxonomyId: 'move' },
    { text: 'Report a cattle death', taxonomyId: 'death' }
  ].map(({ text, taxonomyId }) => ({
    text,
    url: `${buildMicrositePath(taxonomyId, species.id)}/${cphPath(cph)}`
  }))
}

export const summaryController = {
  async handler(request, h) {
    const logger = getLoggerForConfig(config)
    const traceId = request.headers[config.get(header)]
    const userId = request.app.hubAuth?.email ?? request.app.hubAuth?.sub
    logger.info(
      `Summary page request received [traceId=${traceId} | userId=${userId} | path=${request.path}]`
    )

    const viewModel = await buildViewModel(request)

    return h.view('home/summary', {
      holdings: viewModel.holdings,
      totalCattle: viewModel.totalCattle,
      hubPath: buildMicrositePath(taxonomy.id, species.id)
    })
  }
}

export const summaryDataController = {
  async handler(request, h) {
    const logger = getLoggerForConfig(config)
    const traceId = request.headers[config.get(header)]
    const userId = request.app.hubAuth?.email ?? request.app.hubAuth?.sub
    logger.info(
      `Summary data request received [traceId=${traceId} | userId=${userId} | path=${request.path}]`
    )
    const viewModel = await buildViewModel(request)
    const homePath = buildMicrositePath(taxonomy.id, species.id)

    logger.info(
      `Found CPH(s)=${viewModel.holdings.map((holding) => holding.cph).join(', ')}`
    )

    return h.response({
      species: {
        id: species.id,
        label: species.label,
        url: homePath
      },
      holdings: viewModel.holdings.map((holding) => ({
        farmName: holding.name,
        cph: holding.cph,
        postcode: holding.postcode,
        count: holding.cattleCount,
        url: `${homePath}/${cphPath(holding.cph)}`,
        animals: holding.cattle.map((animal) => ({
          id: animal.cattle_id ?? animal.cattleId ?? animal.eartag,
          earTag: animal.eartag,
          dateOfBirth: animal.date_of_birth ?? animal.dateOfBirth,
          dateRegistered: animal.date_registered ?? animal.dateRegistered,
          sex: animal.sex,
          breed: animal.breed,
          status: animal.status,
          statusLabel: animal.statusLabel
        }))
      })),
      actions: []
    })
  }
}

/**
 * @param {{ county?: string, parish?: string, holding?: string }} params route parameters
 * @returns {string|null} slash-separated CPH
 */
export function cphFromParams({ county, parish, holding } = {}) {
  return county && parish && holding ? `${county}/${parish}/${holding}` : null
}

/**
 * @param {string} cph holding identifier
 * @returns {string} encoded CPH path
 */
export function cphPath(cph) {
  return cph.split('/').map(encodeURIComponent).join('/')
}

async function buildViewModel(request) {
  const logger = getLoggerForConfig(config)
  const displayName =
    [request.app.hubAuth?.firstName, request.app.hubAuth?.lastName]
      .filter(Boolean)
      .join(' ') || null
  const userId = request.app.hubAuth?.email ?? request.app.hubAuth?.sub
  const signedInAs =
    request.app.hubAuth?.email ?? displayName ?? userId ?? 'Authenticated user'
  const traceId = request.headers[config.get(header)]
  const summary = await buildCattleHomeSummary({
    cattleHomeApi,
    userId,
    traceId,
    logger
  })

  return { signedInAs, ...summary }
}
