import Boom from '@hapi/boom'
import { getBasePathForModule } from '@defra/lis-hubs-infra-registry'

import { cattleHomeBe4FeClient } from '#server/services/cattle-home-be4fe-client.js'

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
  async handler(request, h) {
    const cph = cphFromParams(request.params)
    let holding

    try {
      holding = await cattleHomeBe4FeClient.getHoldingDetails(cph)
    } catch (error) {
      throw error.statusCode
        ? Boom.boomify(error, { statusCode: error.statusCode })
        : error
    }

    return h.view('holdings/details', {
      pageTitle: 'Holding details',
      holding: {
        cphNumber: holding.cph,
        holdingName: holding.name,
        businessName: holding.business_name,
        addressLines: holding.address.filter(Boolean),
        herdMark: holding.herd_marks.join(', ')
      },
      tabs: [
        {
          text: 'Holding details',
          href: `${holdingsBasePath}/${cph}`,
          active: true
        },
        {
          text: 'Animals on holding',
          href: `${holdingsBasePath}/${cph}/animals`
        }
      ]
    })
  }
}
