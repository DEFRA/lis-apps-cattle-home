import { getMountPath } from '@defra/lis-hubs-infra-registry'

import { cattleHomeBe4FeClient } from '#server/services/cattle-home-be4fe-client.js'
import { isFromBackOffice } from '#server/common/helpers/hub.js'
import { buildHoldingHeading } from '../holding-heading.js'
import {
  buildHerdMarksRow,
  buildHoldingRows,
  buildKeeperDetails,
  findRegisteredKeeper
} from './view-model.js'

export const holdingDetailsController = {
  async handler(request, h) {
    const cph = request.params.cph
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
        status: holding.active === false ? 'Inactive' : 'Active'
      }),
      herdMarksRow: isBackOffice ? buildHerdMarksRow(holding) : null,
      keeper: keeper ? buildKeeperDetails(keeper) : null,
      tabs: [
        {
          text: 'Holding details',
          href: link(
            getMountPath('cattle-home', 'holding', { cph }),
            listReferrer?.id
          ),
          active: true
        },
        {
          text: 'Animals on holding',
          href: link(
            `${getMountPath('cattle-home', 'holding', { cph })}/animals`,
            listReferrer?.id
          )
        }
      ]
    })
  }
}
