/**
 * @param {{ name?: string|null, cph: string }} holding
 * @param {boolean} isBackOffice
 * @returns {string} how the hub names the holding: back office leads with the CPH
 */
export function buildHoldingHeading(holding, isBackOffice) {
  if (isBackOffice) {
    return holding.name ? `${holding.cph} - ${holding.name}` : holding.cph
  }
  return holding.name || holding.cph
}
