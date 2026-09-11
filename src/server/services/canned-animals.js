// Steel-thread placeholder animal data, standing in for be4fe/cattle-home
// until it's wired to lis-fake-service (LREG-457/458). Sourced from
// fake/service's own animal fixtures for CPH 22/001/0001
// (fake/service/data/fixtures/animals/UK2*.json, UK3*.json), reformatted to
// match the shape be4fe/cattle-home's CattleSummary response model already
// returns. Only animals still alive and on this CPH are included (neither
// dateOfDeath nor dateOffCph set) - fake/service's own fixtures for this CPH
// include one dead animal (UK300000000001) that's deliberately excluded here.
import animalsByCph from './canned-animals.json' with { type: 'json' }

const defaultItemsPerPage = 25

const sortFields = new Map([
  ['ear_tag', 'eartag'],
  ['date_of_birth', 'date_of_birth'],
  ['age', 'date_of_birth'],
  ['date_on_cph', 'date_on_cph'],
  ['sex', 'sex'],
  ['breed', 'breed_code']
])

function sortAnimals(animals, sort, direction) {
  const field = sortFields.get(sort) ?? sortFields.get('ear_tag')
  const sorted = [...animals].sort((a, b) => a[field].localeCompare(b[field]))
  return direction === 'desc' ? sorted.reverse() : sorted
}

/**
 * @param {string} cph holding identifier
 * @param {object} [options]
 * @param {string} [options.sort] column to sort by, see sortFields
 * @param {'asc'|'desc'} [options.direction]
 * @param {number} [options.page] 1-indexed page number
 * @param {number} [options.itemsPerPage]
 * @returns {{ animals: object[], totalItems: number, totalPages: number, currentPage: number }}
 */
export function getAnimalsForCph(
  cph,
  { sort = 'ear_tag', direction = 'asc', page = 1, itemsPerPage = defaultItemsPerPage } = {}
) {
  const animals = sortAnimals(animalsByCph[cph] ?? [], sort, direction)
  const totalPages = Math.max(1, Math.ceil(animals.length / itemsPerPage))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const pageAnimals = animals.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return {
    animals: pageAnimals,
    totalItems: animals.length,
    totalPages,
    currentPage,
    itemsPerPage
  }
}
