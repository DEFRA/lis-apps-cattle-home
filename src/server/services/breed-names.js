import breedNames from './breed-names.json' with { type: 'json' }

/**
 * @param {string} breedCode
 * @returns {string} the breed's full name, or the code itself if unknown
 */
export function getBreedName(breedCode) {
  return breedNames[breedCode] ?? breedCode
}
