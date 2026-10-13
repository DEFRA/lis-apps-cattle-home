import { SPOKE_AUTH_STRATEGY } from '@defra/lis-hubs-infra-access/authentication'

/**
 * Builds `server.inject` auth options that bypass the lis-spoke scheme and
 * authenticate the request as the given user, called by the given hub.
 * The user must already be hydrated: each statement carries its permissions.
 * @param {object} user - Hydrated hub user.
 * @param {'front-office' | 'back-office'} [hubId] - Hub the request comes from.
 * @returns {{ strategy: string, credentials: { user: object, caller: string } }}
 */
export function spokeAuth(user, hubId = 'front-office') {
  return {
    strategy: SPOKE_AUTH_STRATEGY,
    credentials: { user, caller: `lis-hubs-${hubId}` }
  }
}
