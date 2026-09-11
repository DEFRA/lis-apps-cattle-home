import { getBasePathForModule } from '@defra/lis-hubs-infra-registry'
import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'

import { getHoldingByCph } from '#server/services/canned-holdings.js'

const holdingsBasePath = `${getBasePathForModule('cattle-home')}/holdings`

/**
 * @param {{ county?: string, parish?: string, holding?: string }} params route parameters
 * @returns {string|null} slash-separated CPH
 */
export function cphFromParams({ county, parish, holding: holdingNumber } = {}) {
  return county && parish && holdingNumber
    ? `${county}/${parish}/${holdingNumber}`
    : null
}

export const holdingDetailsController = {
  handler(request, h) {
    const cph = cphFromParams(request.params)
    const holding = getHoldingByCph(cph)

    if (!holding) {
      return h.response('Page not found').code(statusCodes.notFound)
    }

    return h.view('holdings/details', {
      pageTitle: 'Holding details',
      holding: {
        cphNumber: holding.cph,
        holdingName: holding.name,
        businessName: holding.business_name,
        addressLines: holding.address,
        herdMark: holding.herd_marks.join(', ')
      },
      tabs: [
        {
          text: 'Holding details',
          href: `${holdingsBasePath}/${cph}`,
          active: true
        }
      ]
    })
  }
}
