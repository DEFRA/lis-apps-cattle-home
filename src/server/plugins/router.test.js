import { describe, expect, test, vi } from 'vitest'

const { createModuleAccessGuard, createSpokeGuard, inert } = vi.hoisted(() => ({
  createModuleAccessGuard: vi.fn(() => ({ plugin: { name: 'module-access' } })),
  createSpokeGuard: vi.fn(() => null),
  inert: { plugin: { name: 'inert' } }
}))

vi.mock('@hapi/inert', () => ({ default: inert }))
vi.mock('@defra/lis-hubs-infra-access/auth', () => ({
  createModuleAccessGuard,
  createSpokeGuard,
  getHubJwtCookieOptions: vi.fn(() => ({}))
}))

describe('#router', () => {
  test('registers routes without an auth guard for a public spoke', async () => {
    const { router } = await import('./router.js')
    const server = { register: vi.fn() }

    await router.plugin.register(server)

    expect(createSpokeGuard).toHaveBeenCalledOnce()
    expect(server.register).toHaveBeenNthCalledWith(
      3,
      expect.not.arrayContaining([null])
    )
    expect(server.register.mock.calls[2][0]).toHaveLength(2)
  })
})
