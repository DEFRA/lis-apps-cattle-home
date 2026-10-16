/** @import { HerdMark, HoldingAssociation, HoldingDetails } from '#server/services/cattle-home-be4fe-client.js' */

import { formatDate } from '@defra/lis-infra-ui-services/nunjucks/filters'

import { formatHoldingType } from '#server/services/holding-types.js'

const backOfficeDateFormat = 'd MMMM yyyy'

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
 * @param {string|null} [startDate] ISO date-time from KRDS
 * @returns {string|null} e.g. "17 March 2008", or null when missing or
 *   unparsable so the row shows "Not supplied" rather than failing the page
 */
export function formatStartDate(startDate) {
  if (!startDate) {
    return null
  }
  try {
    return formatDate(startDate, backOfficeDateFormat)
  } catch {
    return null
  }
}

/**
 * @param {HoldingDetails} holding
 * @returns {SummaryRow} the herd marks row, one line per mark, reading
 *   "Not recorded" when there are none
 */
export function buildHerdMarksRow(holding) {
  const herdMarks = buildHerdMarks(holding.herd_marks)
  return {
    key: herdMarks.key,
    lines: herdMarks.marks,
    emptyText: 'Not recorded'
  }
}

/**
 * @param {HoldingDetails} holding
 * @param {object} options
 * @param {boolean} options.isBackOffice
 * @param {string} options.status the holding's operational status
 * @returns {SummaryRow[]} the holding rows in display order. Back office adds
 *   type, status and start date, leaves out the name row when no name is
 *   recorded, and shows the herd marks in their own list (see
 *   buildHerdMarksRow) rather than here.
 */
export function buildHoldingRows(holding, { isBackOffice, status }) {
  const cphRow = { key: 'CPH number', text: holding.cph }
  const nameRow = { key: 'Holding name', text: holding.name || null }
  const addressRow = {
    key: 'Address',
    lines: (holding.address ?? []).filter(Boolean)
  }

  if (!isBackOffice) {
    return [cphRow, nameRow, addressRow, buildHerdMarksRow(holding)]
  }

  return [
    cphRow,
    { key: 'Holding type', text: formatHoldingType(holding.holding_type) },
    { key: 'Status', text: status },
    { key: 'Holding start date', text: formatStartDate(holding.start_date) },
    ...(holding.name ? [nameRow] : []),
    addressRow
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

const ORGANISATION_PARTY_TYPE = 'ORGANISATION'

/**
 * KRDS puts the organisation name in `name` for an organisation and the
 * person's composed name for an individual, so the row is labelled by the
 * party type.
 * @param {string} [partyType]
 * @returns {'Business name'|'Name'}
 */
export function keeperNameLabel(partyType) {
  return typeof partyType === 'string' &&
    partyType.toUpperCase() === ORGANISATION_PARTY_TYPE
    ? 'Business name'
    : 'Name'
}

/**
 * @param {HoldingAssociation} association
 * @returns {{ nameLabel: 'Business name'|'Name', name: string|null, email: string|null, telephone: { text: string, href: string }|null, addressLines: string[] }}
 */
export function buildKeeperDetails(association) {
  const fullName = [association.first_name, association.last_name]
    .filter(Boolean)
    .join(' ')
  const number = association.telephone || association.mobile

  return {
    nameLabel: keeperNameLabel(association.party_type),
    name: association.name || fullName || null,
    email: association.email || null,
    telephone: number
      ? { text: formatTelephone(number), href: buildTelephoneHref(number) }
      : null,
    addressLines: (association.address ?? []).filter(Boolean)
  }
}
