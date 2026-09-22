const defaultItemsPerPage = 25

const sortFields = new Map([
  ['ear_tag', 'eartag'],
  ['date_of_birth', 'date_of_birth'],
  ['age', 'date_of_birth'],
  ['date_on_cph', 'date_on_cph'],
  ['sex', 'sex'],
  ['breed', 'breed_code']
])

const dateSortFields = new Set(['date_of_birth', 'date_on_cph'])

function compareValues(field, a, b) {
  if (dateSortFields.has(field)) {
    return new Date(a[field]) - new Date(b[field])
  }

  return (a[field] ?? '').localeCompare(b[field] ?? '')
}

function sortAnimals(animals, sort, direction) {
  const field = sortFields.get(sort) ?? sortFields.get('ear_tag')
  const sorted = [...animals].sort((a, b) => compareValues(field, a, b))
  // Age sorts on date of birth, where the youngest animal has the latest
  // date - so ascending age is descending date of birth.
  const descending =
    sort === 'age' ? direction !== 'desc' : direction === 'desc'

  return descending ? sorted.reverse() : sorted
}

/**
 * @param {object[]} animals every animal on the holding
 * @param {object} [options]
 * @param {string} [options.orderBy] column to sort by, see sortFields
 * @param {'asc'|'desc'} [options.direction]
 * @param {number} [options.page] 1-indexed page number
 * @param {number} [options.pageSize]
 * @returns {{ animals: object[], totalItems: number, totalPages: number, currentPage: number, itemsPerPage: number }}
 */
export function paginateAnimals(
  animals,
  {
    orderBy = 'ear_tag',
    direction = 'asc',
    page = 1,
    pageSize = defaultItemsPerPage
  } = {}
) {
  const sorted = sortAnimals(animals, orderBy, direction)
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const pageAnimals = sorted.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  return {
    animals: pageAnimals,
    totalItems: sorted.length,
    totalPages,
    currentPage,
    itemsPerPage: pageSize
  }
}
