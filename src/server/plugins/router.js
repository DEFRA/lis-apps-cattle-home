import inert from '@hapi/inert'
import {
  createSpokeGuard,
  getHubJwtCookieOptions,
  createModuleAccessGuard
} from '@livestock/hubs-infra-access/auth'

import { home } from '../routes/home/index.js'
import { health } from '../routes/health/index.js'

import { serveStaticFiles } from './serve-static-files.js'
import { config } from '#config/config.js'
import { moduleAccess } from '../../../module-access.js'

const authGuard = createSpokeGuard({
  spokeId: 'cattle-home',
  hubOrigins: config.get('auth.hubOrigins'),
  cookieName: config.get('auth.hubJwt.cookieName'),
  cookieOptions: getHubJwtCookieOptions({
    ttlSeconds: config.get('auth.hubJwt.ttlSeconds'),
    isSecure: config.get('session.cookie.secure')
  }),
  assetPath: config.get('assetPath'),
  port: config.get('port'),
  basePath: config.get('basePath'),
  secret: config.get('auth.hubJwt.secret'),
  audience: config.get('auth.hubJwt.audience'),
  allowHubServiceRoutes: true
})

const moduleAccessGuard = createModuleAccessGuard({
  assetPath: config.get('assetPath'),
  moduleAccess
})

export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      await server.register([inert])

      await server.register([health])
      await server.register(
        authGuard
          ? [authGuard, moduleAccessGuard, home]
          : [moduleAccessGuard, home]
      )

      await server.register(serveStaticFiles)
    }
  }
}
