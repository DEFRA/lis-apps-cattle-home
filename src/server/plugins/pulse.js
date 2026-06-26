import hapiPulse from 'hapi-pulse'
import { getLoggerForConfig } from '@livestock/infrastructure/logging'

import { config } from '#config/config.js'

const tenSeconds = 10 * 1000

const pulse = {
  plugin: hapiPulse,
  options: {
    logger: getLoggerForConfig(config),
    timeout: tenSeconds
  }
}

export { pulse }
