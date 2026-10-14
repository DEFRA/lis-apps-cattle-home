import { getBasePathForModule } from '@defra/lis-hubs-infra-registry'

import { cphFromParams } from '../details/controller.js'
import { buildHoldingHeading } from '../holding-heading.js'
import { cattleHomeBe4FeClient } from '#server/services/cattle-home-be4fe-client.js'
import { isFromBackOffice } from '#server/common/helpers/hub.js'

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
const backOfficeColumns = [{ text: 'Ear tag', sortKey: 'ear_tag' }].concat(
  columns.slice(1)
)

/**
 * @param {{ currentPage: number, itemsPerPage: number, totalItems: number }} page
 * @returns {string} the back-office count below the list, e.g. "Showing 1 to 25 of 34"
 */
export function buildRangeSummary({ currentPage, itemsPerPage, totalItems }) {
  const first = (currentPage - 1) * itemsPerPage + 1
  const last = Math.min(currentPage * itemsPerPage, totalItems)

  return `Showing ${first} to ${last} of ${totalItems}`
}

/**
 * The page reloads on every search, sort and page change, so the title is
 * what tells a screen reader user what they have landed on.
 * @param {object} state
 * @param {string} state.holdingHeading
 * @param {string} state.search
 * @param {number} state.totalItems
 * @param {number} state.totalPages
 * @param {number} state.currentPage
 * @param {string} [state.requestedSort] the sort column asked for, if any
 * @param {'asc'|'desc'} state.direction
 * @param {Array<{ text: string, sortKey: string }>} state.columns
 * @returns {string} e.g. "15 results for 'male' - Animals on holding (page 1 of 2), sorted by age ascending - Oakfield Farm"
 */
function buildPageTitle({
  holdingHeading,
  search,
  totalItems,
  totalPages,
  currentPage,
  requestedSort,
  direction,
  columns: pageColumns
}) {
  const resultsNoun = totalItems === 1 ? 'result' : 'results'
  const results = search
    ? `${totalItems} ${resultsNoun} for '${search}' - `
    : ''
  const page = totalPages > 1 ? ` (page ${currentPage} of ${totalPages})` : ''
  const sortColumn = pageColumns.find(
    ({ sortKey }) => sortKey === requestedSort
  )
  const directionText = direction === 'desc' ? 'descending' : 'ascending'
  const sorted = sortColumn
    ? `, sorted by ${sortColumn.text.toLowerCase()} ${directionText}`
    : ''

  return `${results}Animals on holding${page}${sorted} - ${holdingHeading}`
}

export const animalsOnHoldingController = {
  async handler(request, h) {
    const cph = cphFromParams(request.params)
    const isBackOffice = isFromBackOffice(request)
    const pageColumns = isBackOffice ? backOfficeColumns : columns
    const search = [request.query.search].flat()[0]?.trim() || ''
    const sort = request.query.sort || 'ear_tag'
    const direction = request.query.direction === 'desc' ? 'desc' : 'asc'
    const [
      holding,
      { animals, totalItems, totalPages, currentPage, itemsPerPage }
    ] = await Promise.all([
      cattleHomeBe4FeClient.getHoldingDetails(cph),
      cattleHomeBe4FeClient.getCattleOnHolding(cph, {
        q: search,
        orderBy: sort,
        direction,
        page: Number(request.query.page) || 1,
        pageSize: PAGE_SIZE
      })
    ])
    const holdingHeading = buildHoldingHeading(holding, isBackOffice)
    const { listReferrer } = request.pre
    const { link } = request.server.app.listReferrer
    const baseHref = `${holdingsBasePath}/${cph}/animals`

    return h.view('holdings/animals/index', {
      pageTitle: buildPageTitle({
        holdingHeading,
        search,
        totalItems,
        totalPages,
        currentPage,
        requestedSort: request.query.sort,
        direction,
        columns: pageColumns
      }),
      isBackOffice,
      backLinkHref: listReferrer?.href,
      referrerId: listReferrer?.id,
      holdingHeading,
      summaryText: buildRangeSummary({ currentPage, itemsPerPage, totalItems }),
      columns: pageColumns,
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
      baseHref,
      clearSearchHref: link(baseHref, listReferrer?.id),
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
          href: link(`${holdingsBasePath}/${cph}`, listReferrer?.id)
        },
        {
          text: 'Animals on holding',
          href: link(baseHref, listReferrer?.id),
          active: true
        }
      ]
    })
  }
}
