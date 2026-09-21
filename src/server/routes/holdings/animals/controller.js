import { getBasePathForModule } from '@defra/lis-hubs-infra-registry'
import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'

import { getAnimalsForCph } from '#server/services/canned-animals.js'
import { getHoldingByCph } from '#server/services/canned-holdings.js'
import { getBreedName } from '#server/services/breed-names.js'
import { cphFromParams } from '../details/controller.js'

const holdingsBasePath = `${getBasePathForModule('cattle-home')}/holdings`

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
  handler(request, h) {
    const cph = cphFromParams(request.params)
    const holding = getHoldingByCph(cph)

    if (!holding) {
      return h.response('Page not found').code(statusCodes.notFound)
    }

    const search = request.query.search?.trim() || ''
    const sort = request.query.sort || 'ear_tag'
    const direction = request.query.direction === 'desc' ? 'desc' : 'asc'
    const {
      animals: pageAnimals,
      totalItems,
      totalPages,
      currentPage,
      itemsPerPage
    } = getAnimalsForCph(cph, {
      search,
      sort,
      direction,
      page: Number(request.query.page) || 1
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
      animals: pageAnimals.map((animal) => ({
        eartag: animal.eartag,
        dateOfBirth: animal.date_of_birth,
        dateOnCph: animal.date_on_cph,
        sex: animal.sex,
        breedCode: animal.breed_code,
        breedName: getBreedName(animal.breed_code)
      })),
      search,
      totalItems,
      sort,
      direction,
      baseHref: `${holdingsBasePath}/${cph}/animals`,
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
