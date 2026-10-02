import { describe, expect, test, vi } from 'vitest'

const { createSpokeAuth, inert, spokeAuthPlugin } = vi.hoisted(() => {
  const plugin = { plugin: { name: 'spokeAuth' } }

  return {
    createSpokeAuth: vi.fn(() => plugin),
    inert: { plugin: { name: 'inert' } },
    spokeAuthPlugin: plugin
  }
})

vi.mock('@hapi/inert', () => ({ default: inert }))
vi.mock('@defra/lis-hubs-infra-access/authentication', () => ({
  createSpokeAuth,
  getHubJwtCookieOptions: vi.fn(() => ({}))
}))
vi.mock('@defra/lis-hubs-infra-access/authorization', () => ({
  demandPermission: vi.fn(() => vi.fn()),
  PERMISSIONS: { cattleRead: 'lis-perm-cattle-read' }
}))

describe('#router', () => {
  test('registers the spoke auth scheme before the routes', async () => {
    const { router } = await import('./router.js')
    const server = { register: vi.fn() }

    await router.plugin.register(server)

    expect(createSpokeAuth).toHaveBeenCalledOnce()
    expect(createSpokeAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        spokeId: 'cattle-home',
        moduleAccess: expect.objectContaining({ species: 'cattle' })
      })
    )
    expect(server.register).toHaveBeenNthCalledWith(1, [inert, spokeAuthPlugin])
    expect(server.register.mock.calls[1][0]).toHaveLength(4)
  })
})
