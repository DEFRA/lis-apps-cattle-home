/** @import { Server } from '@hapi/hapi' */
import { createReferrerLink } from '@defra/lis-infra-ui-services/referrer-link'

import { config } from '#config/config.js'
import { isFromBackOffice } from '#server/common/helpers/hub.js'

// The back-office hub's find-a-holding page, which every holding page is
// reached from. Its search and page live in its query.
const hubHoldingsListPath = '/holdings'

/**
 * @param {string} path a same-host referrer path
 * @returns {boolean} whether it is the hub's holdings list, with or without a query
 */
export function isHubHoldingsList(path) {
  return (
    path === hubHoldingsListPath || path.startsWith(`${hubHoldingsListPath}?`)
  )
}

/**
 * Back office only: remembers the holdings list a holding page was reached
 * from, so its back link returns to the same search from either tab.
 * @param {Server} server
 * @returns {ReturnType<typeof createReferrerLink>}
 */
export function createListReferrer(server) {
  return createReferrerLink(server, {
    cacheName: config.get('session.cache.name'),
    allow: isHubHoldingsList,
    fallbackHref: hubHoldingsListPath,
    when: isFromBackOffice
  })
}
