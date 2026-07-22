import { buildMicrositePath } from '@livestock/ui-services'
import { taxonomy } from '@livestock/taxonomy-home'
import { species } from '@livestock/species-cattle'
import { config } from '#config/config.js'
import { createCattleHomeApi } from '#server/services/cattle-home-api.js'
import { buildCattleHomeSummary } from '#server/services/cattle-home-summary.js'

const cattleHomeApi = createCattleHomeApi({ config })

export const homeController = {
  async handler(request, h) {
    const viewModel = await buildViewModel(request)
    const selectedCph = request.query?.cph
    const selectedHolding = selectedCph
      ? viewModel.holdings.find((holding) => holding.cph === selectedCph)
      : viewModel.holdings[0]
    const actionLinks = selectedHolding
      ? buildHoldingActionLinks(selectedHolding.cph)
      : []

    return h.view('home/index', {
      pageTitle: 'Home for Cattle',
      heading: 'Home for Cattle',
      caption: 'Spoke microsite',
      taxonomy,
      species,
      ...viewModel,
      selectedCph,
      selectedHolding,
      actionLinks,
      directPort: 3221,
      hubPath: buildMicrositePath(taxonomy.id, species.id)
    })
  }
}

function buildHoldingActionLinks(cph) {
  return [
    { text: 'Register cattle', taxonomyId: 'register' },
    { text: 'Move cattle', taxonomyId: 'move' },
    { text: 'Report a cattle death', taxonomyId: 'death' }
  ].map(({ text, taxonomyId }) => ({
    text,
    url: `${buildMicrositePath(taxonomyId, species.id)}?${new URLSearchParams({ cph })}`
  }))
}

export const summaryController = {
  async handler(request, h) {
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
    const viewModel = await buildViewModel(request)
    const homePath = buildMicrositePath(taxonomy.id, species.id)

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
        url: `${homePath}?${new URLSearchParams({ cph: holding.cph })}`
      })),
      actions: []
    })
  }
}

async function buildViewModel(request) {
  const displayName =
    [request.app.hubAuth?.firstName, request.app.hubAuth?.lastName]
      .filter(Boolean)
      .join(' ') || null
  const userId = request.app.hubAuth?.email ?? request.app.hubAuth?.sub
  const signedInAs =
    request.app.hubAuth?.email ?? displayName ?? userId ?? 'Authenticated user'
  const traceId = request.headers[config.get('tracing.header')]
  const summary = await buildCattleHomeSummary({
    cattleHomeApi,
    userId,
    traceId
  })

  return { signedInAs, ...summary }
}
