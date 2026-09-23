import { getBasePathForModule } from '@defra/lis-hubs-infra-registry'
import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'

import { getHoldingByCph } from '#server/services/canned-holdings.js'
import { cphFromParams } from '../details/controller.js'
import { cattleHomeBe4FeClient } from '#server/services/cattle-home-be4fe-client.js'

const holdingsBasePath = `${getBasePathForModule('cattle-home')}/holdings`
const animalsBasePath = `${getBasePathForModule('cattle-home')}/animals`
const PAGE_SIZE = 25
const columns = [
  { text: 'Ear tag number', sortKey: 'ear_tag' },
  { text: 'Date of birth', sortKey: 'date_of_birth' },
  { text: 'Age', sortKey: 'age' },
  { text: 'Date on holding', sortKey: 'date_on_cph' },
  { text: 'Sex', sortKey: 'sex' },
  { text: 'Breed', sortKey: 'breed' }
]

/**
 * The page reloads on every search, sort and page change, so the title is
 * what tells a screen reader user what they have landed on.
 * @param {object} state
 * @param {{ name: string|null, cph: string }} state.holding
 * @param {string} state.search
 * @param {number} state.totalItems
 * @param {number} state.totalPages
 * @param {number} state.currentPage
 * @param {string} [state.requestedSort] the sort column asked for, if any
 * @param {'asc'|'desc'} state.direction
 * @returns {string} e.g. "15 results for 'male' - Animals on holding (page 1 of 2), sorted by age ascending - Oakfield Farm"
 */
function buildPageTitle({
  holding,
  search,
  totalItems,
  totalPages,
  currentPage,
  requestedSort,
  direction
}) {
  const resultsNoun = totalItems === 1 ? 'result' : 'results'
  const results = search
    ? `${totalItems} ${resultsNoun} for '${search}' - `
    : ''
  const page = totalPages > 1 ? ` (page ${currentPage} of ${totalPages})` : ''
  const sortColumn = columns.find(({ sortKey }) => sortKey === requestedSort)
  const directionText = direction === 'desc' ? 'descending' : 'ascending'
  const sorted = sortColumn
    ? `, sorted by ${sortColumn.text.toLowerCase()} ${directionText}`
    : ''

  return `${results}Animals on holding${page}${sorted} - ${holding.name ?? holding.cph}`
}

export const animalsOnHoldingController = {
  async handler(request, h) {
    const cph = cphFromParams(request.params)
    const holding = getHoldingByCph(cph)

    if (!holding) {
      return h.response('Page not found').code(statusCodes.notFound)
    }

    const search = request.query.search?.trim() || ''
    const sort = request.query.sort || 'ear_tag'
    const direction = request.query.direction === 'desc' ? 'desc' : 'asc'
    const { animals, totalItems, totalPages, currentPage, itemsPerPage } =
      await cattleHomeBe4FeClient.getCattleOnHolding(cph, {
        q: search,
        orderBy: sort,
        direction,
        page: Number(request.query.page) || 1,
        pageSize: PAGE_SIZE
      })

    return h.view('holdings/animals/index', {
      pageTitle: buildPageTitle({
        holding,
        search,
        totalItems,
        totalPages,
        currentPage,
        requestedSort: request.query.sort,
        direction
      }),
      holding,
      columns,
      animals: animals.map((animal) => ({
        eartag: animal.eartag,
        dateOfBirth: animal.date_of_birth,
        dateOnCph: animal.date_on_cph,
        sex: animal.sex,
        breedCode: animal.breed_code,
        breedName: animal.breed_name
      })),
      search,
      totalItems,
      sort,
      direction,
      baseHref: `${holdingsBasePath}/${cph}/animals`,
      animalsBasePath,
      pagination: {
        currentPage,
        totalPages,
        totalItems,
        itemsPerPage
      },
      tabs: [
        {
          text: 'Holding details',
          href: `${holdingsBasePath}/${cph}`
        },
        {
          text: 'Animals on holding',
          href: `${holdingsBasePath}/${cph}/animals`,
          active: true
        }
      ]
    })
  }
}
