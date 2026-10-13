/** @import { HerdMark, HoldingAssociation, HoldingDetails } from '#server/services/cattle-home-be4fe-client.js' */

import { formatHoldingType } from '#server/services/holding-types.js'

const registeredKeeperRole = 'KEEPER'
const ukMobileNumber = /^07\d{9}$/
const mobilePrefixLength = 5

/**
 * A summary list row for the template: `text` for a single value, `lines`
 * for a value shown one line per entry. A missing or empty value shows
 * `emptyText` when given, otherwise the "Not supplied" tag.
 * @typedef {object} SummaryRow
 * @property {string} key
 * @property {string|null} [text]
 * @property {string[]} [lines]
 * @property {string} [emptyText]
 */

/**
 * @param {HerdMark[]|null} [herdMarks]
 * @returns {{ key: string, marks: string[] }} the row key, singular unless
 *   there are several marks, and the marks as the API sends them
 */
export function buildHerdMarks(herdMarks) {
  const marks = (herdMarks ?? []).map(({ mark }) => mark).filter(Boolean)
  return {
    key: marks.length > 1 ? 'Herd marks' : 'Herd mark',
    marks
  }
}

/**
 * @param {HoldingDetails} holding
 * @param {object} options
 * @param {boolean} options.isBackOffice
 * @param {string} options.status the holding's operational status
 * @returns {SummaryRow[]} the holding rows in display order; back office adds
 *   type and status and leaves out the name row when no name is recorded
 */
export function buildHoldingRows(holding, { isBackOffice, status }) {
  const herdMarks = buildHerdMarks(holding.herd_marks)
  const cphRow = { key: 'CPH number', text: holding.cph }
  const nameRow = { key: 'Holding name', text: holding.name || null }
  const addressRow = {
    key: 'Address',
    lines: (holding.address ?? []).filter(Boolean)
  }
  const herdMarksRow = {
    key: herdMarks.key,
    lines: herdMarks.marks,
    emptyText: 'Not recorded'
  }

  if (!isBackOffice) {
    return [cphRow, nameRow, addressRow, herdMarksRow]
  }

  return [
    cphRow,
    { key: 'Holding type', text: formatHoldingType(holding.holding_type) },
    { key: 'Status', text: status },
    ...(holding.name ? [nameRow] : []),
    addressRow,
    herdMarksRow
  ]
}

/**
 * @param {HoldingAssociation[]|null} [associations]
 * @returns {HoldingAssociation|null} the first party holding a keeper
 *   role, or null if there is none
 */
export function findRegisteredKeeper(associations) {
  return (
    (associations ?? []).find((association) =>
      (association.roles ?? []).some(
        ({ code }) => code?.toUpperCase() === registeredKeeperRole
      )
    ) ?? null
  )
}

/**
 * @param {string} number
 * @returns {string} an 11-digit UK mobile number spaced 5 then 6 digits,
 *   e.g. "07700 900001"; anything else as given
 */
export function formatTelephone(number) {
  const digits = number.replaceAll(/\s/g, '')
  return ukMobileNumber.test(digits)
    ? `${digits.slice(0, mobilePrefixLength)} ${digits.slice(mobilePrefixLength)}`
    : number
}

/**
 * @param {string} number
 * @returns {string} a tel: URI keeping only the digits and a leading "+"
 */
export function buildTelephoneHref(number) {
  const trimmed = number.trim()
  const prefix = trimmed.startsWith('+') ? '+' : ''
  return `tel:${prefix}${trimmed.replaceAll(/\D/g, '')}`
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
      ? { text: formatTelephone(number), href: buildTelephoneHref(number) }
      : null,
    addressLines: (association.address ?? []).filter(Boolean)
  }
}
