import { getBasePathForModule } from '@defra/lis-hubs-infra-registry'

import { cattleHomeBe4FeClient } from '#server/services/cattle-home-be4fe-client.js'
import { isFromBackOffice } from '#server/common/helpers/hub.js'
import { buildHoldingHeading } from '../holding-heading.js'
import {
  buildHoldingRows,
  buildKeeperDetails,
  findRegisteredKeeper
} from './view-model.js'

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
    const isBackOffice = isFromBackOffice(request)
    const holdingHeading = buildHoldingHeading(holding, isBackOffice)
    const keeper = findRegisteredKeeper(holding.associations)
    const { listReferrer } = request.pre
    const { link } = request.server.app.listReferrer

    return h.view('holdings/details/index', {
      pageTitle: isBackOffice
        ? `${holdingHeading} - Holding details`
        : `Holding details - ${holdingHeading}`,
      isBackOffice,
      holdingHeading,
      backLinkHref: listReferrer?.href,
      holdingRows: buildHoldingRows(holding, {
        isBackOffice,
        // TODO: the BE4FE holding response carries no status yet, so every
        // holding shows as Active until it does.
        status: 'Active'
      }),
      keeper: keeper ? buildKeeperDetails(keeper) : null,
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
