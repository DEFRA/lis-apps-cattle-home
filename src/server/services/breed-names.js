import { getBreedName as lookupBreedName } from '@defra/lis-species-cattle'

/**
 * @param {string} breedCode
 * @returns {string} the breed's full name, or the code itself if unknown
 */
export function getBreedName(breedCode) {
  return lookupBreedName(breedCode) ?? breedCode
}
