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
    const holding = await cattleHomeBe4FeClient.getHoldingDetails(cph)
    const { listReferrer } = request.pre
    const { link } = request.server.app.listReferrer

    return h.view('holdings/details/index', {
      pageTitle: `Holding details - ${holding.name ?? holding.cph}`,
      backLinkHref: listReferrer?.href,
      holding: {
        cphNumber: holding.cph,
        holdingName: holding.name,
        addressLines: holding.address.filter(Boolean),
        herdMark: holding.herd_marks.join(', ')
      },
      tabs: [
        {
          text: 'Holding details',
          href: link(`${holdingsBasePath}/${cph}`, listReferrer?.id),
          active: true
        },
        {
          text: 'Animals on holding',
          href: link(`${holdingsBasePath}/${cph}/animals`, listReferrer?.id)
        }
      ]
    })
  }
}
