import { getBreedName } from '../breed-names.js'

const stripSpaces = (value) => value.replace(/\s+/g, '')

function animalMatchesSearch(animal, search) {
  if (['male', 'female'].includes(search.toLowerCase())) {
    return animal.sex?.toLowerCase() === search.toLowerCase()
  }

  // Ear tags are matched ignoring spaces - "UK 324537 113234",
  // "UK324537113234" and "uk 324537 113234" all match the same animal.
  const eartagMatches = stripSpaces(animal.eartag ?? '')
    .toLowerCase()
    .includes(stripSpaces(search).toLowerCase())
  const otherFields = [animal.breed_code, getBreedName(animal.breed_code)]

  return (
    eartagMatches ||
    otherFields.some((field) => (field ?? '').toLowerCase().includes(search))
  )
}

/**
 * Narrows a list of animals by a free-text term, matching ear tag (ignoring
 * spaces), sex, or breed code and name.
 *
 * @param {object[]} animals
 * @param {string} search
 * @returns {object[]} the animals matching the term, or all of them when it is empty
 */
export function searchAnimals(animals, search) {
  if (!search) {
    return animals
  }

  const term = search.toLowerCase()

  return animals.filter((animal) => animalMatchesSearch(animal, term))
}
