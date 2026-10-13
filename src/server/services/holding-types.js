// KRDS site types. The BE4FE sends only the code, so the names live here
// until a reference-data source exists. KRDS has two code lists and this
// covers both: the seed data (KeeperData.Infrastructure/Data/Seed/sitetypes.json)
// and the site type filter (KeeperData.Api/Controllers/RequestDtos/Sites/GetSitesRequest.cs).
const holdingTypeNames = new Map([
  ['AC', 'Assembly Centre'],
  ['AH', 'Agricultural Holding'],
  ['AI', 'AI Sub Centre'],
  ['CC', 'Collection Centre'],
  ['ET', 'Embryo Transfer Unit'],
  ['FA', 'Factory'],
  ['FM', 'Feed Mill'],
  ['HA', 'Haulier'],
  ['LR', 'Laboratory/Research Establishment'],
  ['LT', 'Local Authority Tip'],
  ['MA', 'Market'],
  ['PF', 'Pet Food Manufacturer'],
  ['PP', 'Protein Processor'],
  ['RE', 'Renderers'],
  ['RK', 'Recognised Kennels'],
  ['SG', 'Showground'],
  ['SH', 'Slaughterhouse'],
  ['SO', 'Storage Plant'],
  ['SS', 'Semen Shop'],
  ['TH', 'Tannery/Hide Merchant'],
  ['VE', 'Veterinary Practice/Hospital/School'],
  ['WP', 'Wildlife Park'],
  ['ZO', 'Zoo'],
  ['CL', 'Common Land'],
  ['PO', 'Port'],
  ['AP', 'Airport'],
  ['CA', 'Calf Collection Centre'],
  ['HK', 'Hunt Kennel'],
  ['KY', "Knacker's Yard"],
  ['LA', 'Lairage'],
  ['QU', 'Quarantine'],
  ['SM', 'S/H Both MP and Cs'],
  ['SP', 'Seaport'],
  ['SR', 'Slaughter House Red Meat'],
  ['ST', 'Staging Post'],
  ['SW', 'Slaughter House White Meat'],
  ['VI', 'Veterinary Investigation Centre']
])

/**
 * @param {string} [code] KRDS site type code, e.g. 'AH'
 * @returns {string|null} the holding type's name, or null if unknown
 */
export function getHoldingTypeName(code) {
  return holdingTypeNames.get(code?.toUpperCase()) ?? null
}

/**
 * @param {string} [code] KRDS site type code, e.g. 'AH'
 * @returns {string|null} "<name> (<CODE>)", or just the upper-cased code if
 *   the name is unknown, or null when there's no code at all
 */
export function formatHoldingType(code) {
  if (!code) {
    return null
  }
  const upperCaseCode = code.toUpperCase()
  const name = getHoldingTypeName(upperCaseCode)
  return name ? `${name} (${upperCaseCode})` : upperCaseCode
}
