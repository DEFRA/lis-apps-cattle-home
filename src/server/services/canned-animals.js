// Steel-thread placeholder cattle detail data, standing in for
// be4fe/cattle-home's GET api/cattle/{cattleId} until it's updated to the
// target contract by LREG-313. A flat list, like fake/service's own animal
// fixtures (fake/service/data/fixtures/animals/) - sourced from its records
// for CPH 22/001/0001 (UK2*.json, UK3*.json), reformatted to the shape
// LREG-313 will return, then enriched so every rule on the cattle details
// page can be seen in the browser:
// - UK200000000001: genetic dam, sire ear tag only (no sire name)
// - UK200000000002: surrogate dam, both genetic and surrogate dam tags
// - UK200000000003: surrogate dam with no surrogate tag recorded
// - UK200000000004: sire name only (sire ear tag shows "Not required")
// - UK200000000005: both sire ear tag and sire name recorded
// - UK200000000006: missing sex and date registered ("Not supplied")
// - UK200000000007: Restricted status, genetic dam, no sire recorded
// - UK200000000008: unknown breed code
// - UK300000000001: Dead status (has a date of death in the fixture)
// - UK300000000002: a second surrogate dam, both tags recorded
// All other animals have no dam or sire recorded.
import animals from './canned-animals.json' with { type: 'json' }

function stripSpaces(value) {
  return value.replace(/\s+/g, '')
}

/**
 * @param {string} earTag the animal's ear tag, e.g. "UK200000000001"
 * @returns {object|undefined} the animal's cattle details, if found
 */
export function getCannedCattleDetails(earTag) {
  const target = stripSpaces(earTag).toLowerCase()
  return animals.find(
    (animal) => stripSpaces(animal.eartag).toLowerCase() === target
  )
}
