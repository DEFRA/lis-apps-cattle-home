/** @import { CattleDetails } from '#server/services/cattle-home-be4fe-client.js' */
import { getBreedName } from '#server/services/breed-names.js'

/**
 * @param {string} [state] e.g. "Alive", "Dead"
 * @param {string} [restrictionStatus] e.g. "Restricted", "None"
 * @returns {'Dead'|'Restricted'|'Active'}
 */
export function computeAnimalStatus(state, restrictionStatus) {
  if (state?.toLowerCase() === 'dead') {
    return 'Dead'
  }
  if (restrictionStatus?.toLowerCase() === 'restricted') {
    return 'Restricted'
  }
  return 'Active'
}

/**
 * @param {string} [breedCode]
 * @returns {string|null} "<name> (<CODE>)", or just the code if the name is
 *   unknown, or null when there's no code at all
 */
export function formatBreedDisplay(breedCode) {
  if (!breedCode) {
    return null
  }
  const breedName = getBreedName(breedCode)
  return breedName === breedCode ? breedCode : `${breedName} (${breedCode})`
}

/**
 * @param {string} [damType] "genetic" | "surrogate" (case-insensitive)
 * @returns {string|null} "Genetic" | "Surrogate" | null
 */
export function formatDamType(damType) {
  if (!damType) {
    return null
  }
  return damType.charAt(0).toUpperCase() + damType.slice(1).toLowerCase()
}

/**
 * @param {object} record cattle details record
 * @param {string} [record.dam_type]
 * @param {string} [record.genetic_dam_tag]
 * @param {string} [record.surrogate_tag]
 * @returns {{ damType: string|null, geneticDamTag: string|null, showSurrogateRow: boolean, surrogateTag: string|null }}
 */
export function buildDamDetails(record) {
  return {
    damType: formatDamType(record.dam_type),
    geneticDamTag: record.genetic_dam_tag || null,
    showSurrogateRow: Boolean(record.surrogate_tag),
    surrogateTag: record.surrogate_tag || null
  }
}

/**
 * @param {object} record cattle details record
 * @param {string} [record.sire_tag]
 * @param {string} [record.sire_name]
 * @returns {{ hasDetails: boolean, tag: string|null, tagNotRequired: boolean, name: string|null, nameNotRequired: boolean }}
 */
export function buildSireDetails(record) {
  const hasTag = Boolean(record.sire_tag)
  const hasName = Boolean(record.sire_name)

  if (!hasTag && !hasName) {
    return {
      hasDetails: false,
      tag: null,
      tagNotRequired: false,
      name: null,
      nameNotRequired: false
    }
  }

  return {
    hasDetails: true,
    tag: record.sire_tag || null,
    tagNotRequired: !hasTag,
    name: record.sire_name || null,
    nameNotRequired: !hasName
  }
}

/**
 * @param {CattleDetails} record
 * @returns {object} the view model for the cattle details page
 */
export function buildCattleDetailsViewModel(record) {
  return {
    eartag: record.eartag,
    dateOfBirth: record.date_of_birth || null,
    dateRegistered: record.date_registered || null,
    dateOnCph: record.date_on_cph || null,
    sex: record.sex || null,
    breedDisplay: formatBreedDisplay(record.breed),
    status: computeAnimalStatus(record.state, record.restriction_status),
    dam: buildDamDetails(record),
    sire: buildSireDetails(record)
  }
}
