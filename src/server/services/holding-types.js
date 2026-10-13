// KRDS site types. The BE4FE sends only the code, so the names live here
// until a reference-data source exists.
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
  ['PO', 'Port']
])

/**
 * @param {string} [code] KRDS site type code, e.g. 'AH'
 * @returns {string|null} the holding type's name, or null if unknown
 */
export function getHoldingTypeName(code) {
  return holdingTypeNames.get(code) ?? null
}

/**
 * @param {string} [code] KRDS site type code, e.g. 'AH'
 * @returns {string|null} "<name> (<CODE>)", or just the code if the name is
 *   unknown, or null when there's no code at all
 */
export function formatHoldingType(code) {
  if (!code) {
    return null
  }
  const name = getHoldingTypeName(code)
  return name ? `${name} (${code})` : code
}
