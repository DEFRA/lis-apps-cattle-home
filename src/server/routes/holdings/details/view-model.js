/** @import { HerdMark, HoldingAssociation } from '#server/services/cattle-home-be4fe-client.js' */

const registeredKeeperRole = 'LIVESTOCKKEEPER'
const ukNumberWithAreaCodeOrMobile = /^0[127]\d{9}$/
const telephonePrefixLength = 5

/**
 * @param {HerdMark[]} [herdMarks]
 * @returns {{ key: string, marks: string[] }} the row key, singular unless
 *   there are several marks, and the marks as the API sends them
 */
export function buildHerdMarks(herdMarks = []) {
  const marks = herdMarks.map(({ mark }) => mark).filter(Boolean)
  return {
    key: marks.length > 1 ? 'Herd marks' : 'Herd mark',
    marks
  }
}

/**
 * @param {HoldingAssociation[]} [associations]
 * @returns {HoldingAssociation|null} the first party holding the livestock
 *   keeper role, or null if there is none
 */
export function findRegisteredKeeper(associations = []) {
  return (
    associations.find((association) =>
      (association.roles ?? []).some(
        ({ code }) => code?.toUpperCase() === registeredKeeperRole
      )
    ) ?? null
  )
}

/**
 * @param {string} number
 * @returns {string} 11-digit UK mobile and geographic numbers spaced 5 then 6
 *   digits, e.g. "07700 900001"; anything else as given
 */
export function formatTelephone(number) {
  const digits = number.replaceAll(/\s/g, '')
  return ukNumberWithAreaCodeOrMobile.test(digits)
    ? `${digits.slice(0, telephonePrefixLength)} ${digits.slice(telephonePrefixLength)}`
    : number
}

/**
 * @param {HoldingAssociation} association
 * @returns {{ name: string|null, email: string|null, telephone: { text: string, href: string }|null, addressLines: string[] }}
 */
export function buildKeeperDetails(association) {
  const fullName = [association.first_name, association.last_name]
    .filter(Boolean)
    .join(' ')
  const number = association.telephone || association.mobile

  return {
    name: association.name || fullName || null,
    email: association.email || null,
    telephone: number
      ? {
          text: formatTelephone(number),
          href: `tel:${number.replaceAll(/\s/g, '')}`
        }
      : null,
    addressLines: (association.address ?? []).filter(Boolean)
  }
}
