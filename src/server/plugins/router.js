import inert from '@hapi/inert'
import {
  createSpokeAuth,
  getHubJwtCookieOptions
} from '@defra/lis-hubs-infra-access/authentication'
import { getBasePathForModule } from '@defra/lis-hubs-infra-registry'

import { holdings } from '../routes/holdings/index.js'
import { animals } from '../routes/animals/index.js'
import { health } from '../routes/health/index.js'

import { serveStaticFiles } from './serve-static-files.js'
import { config } from '#config/config.js'
import { moduleAccess } from '../../../module-access.js'

const spokeAuth = createSpokeAuth({
  spokeId: 'cattle-home',
  hubOrigins: config.get('auth.hubOrigins'),
  cookieName: config.get('auth.hubJwt.cookieName'),
  cookieOptions: getHubJwtCookieOptions({
    ttlSeconds: config.get('auth.hubJwt.ttlSeconds'),
    isSecure: config.get('session.cookie.secure')
  }),
  port: config.get('port'),
  basePath: getBasePathForModule('cattle-home'),
  secret: config.get('auth.hubJwt.secret'),
  audience: config.get('auth.hubJwt.audience'),
  moduleAccess
})

export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      await server.register([inert, spokeAuth])

      await server.register([health, holdings, animals])

      await server.register(serveStaticFiles)
    }
  }
}
