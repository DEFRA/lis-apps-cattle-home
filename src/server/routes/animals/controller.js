/** @import { Request } from '@hapi/hapi' */
import { getBasePathForModule } from '@defra/lis-hubs-infra-registry'
import { formatEarTag } from '@defra/lis-infra-ui-services/nunjucks/filters'

import { cattleHomeBe4FeClient } from '#server/services/cattle-home-be4fe-client.js'
import { buildCattleDetailsViewModel } from './view-model.js'

const holdingsBasePath = `${getBasePathForModule('cattle-home')}/holdings`

/**
 * The browser sends the hub's public URL as the referrer, and the hub proxy
 * passes the host it was called on as x-forwarded-host, so the two are
 * compared to keep the back link on the current domain.
 *
 * @param {Request} request
 * @returns {string | undefined} the referrer's path and query, when it is on the same host as the request
 */
export function getSameHostReferrerPath(request) {
  const { referer } = request.headers
  if (!referer) {
    return undefined
  }

  let refererUrl
  try {
    refererUrl = new URL(referer)
  } catch {
    return undefined
  }

  const requestHost = (
    request.headers['x-forwarded-host'] ??
    request.headers.host ??
    ''
  )
    .split(',')[0]
    .trim()

  // A path starting with // would make the link protocol-relative, i.e.
  // another site.
  if (refererUrl.host !== requestHost || refererUrl.pathname.startsWith('//')) {
    return undefined
  }

  return `${refererUrl.pathname}${refererUrl.search}`
}

export const cattleDetailsController = {
  async handler(request, h) {
    const record = await cattleHomeBe4FeClient.getCattleDetails(
      request.params.earTag
    )

    const cattle = buildCattleDetailsViewModel(record)
    const formattedEarTag = formatEarTag(cattle.eartag)

    return h.view('animals/index', {
      pageTitle: `Cattle details - ${formattedEarTag}`,
      formattedEarTag,
      cattle,
      backLinkHref:
        getSameHostReferrerPath(request) ??
        (record.cph && `${holdingsBasePath}/${record.cph}/animals`)
    })
  }
}
