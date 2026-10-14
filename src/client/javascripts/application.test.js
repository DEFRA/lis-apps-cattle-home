import { describe, expect, test, vi } from 'vitest'

const {
  Checkboxes,
  ErrorSummary,
  Radios,
  Tabs,
  createAll,
  LayoutOne,
  LayoutTwo,
  ErrorPageOne,
  ScrollableTable
} = vi.hoisted(() => ({
  Checkboxes: class {},
  ErrorSummary: class {},
  Radios: class {},
  Tabs: class {},
  createAll: vi.fn(),
  LayoutOne: class {},
  LayoutTwo: class {},
  ErrorPageOne: class {},
  ScrollableTable: class {}
}))

vi.mock('govuk-frontend', () => ({
  Checkboxes,
  ErrorSummary,
  Radios,
  Tabs,
  createAll
}))
vi.mock('@defra/lis-infra-ui-services/components/layout', () => ({
  layoutComponents: [LayoutOne, LayoutTwo]
}))
vi.mock('@defra/lis-infra-ui-services/components/error-pages', () => ({
  errorPageComponents: [LayoutTwo, ErrorPageOne]
}))
vi.mock('@defra/lis-infra-ui-services/components/scrollable-table', () => ({
  ScrollableTable
}))

describe('browser application bootstrap', () => {
  test('starts each shared layout component, each error page component, the scrollable table, then each page-level GOV.UK component, starting a component listed twice once', async () => {
    await import('./application.js')

    expect(createAll.mock.calls).toEqual([
      [LayoutOne],
      [LayoutTwo],
      [ErrorPageOne],
      [ScrollableTable],
      [Checkboxes],
      [ErrorSummary],
      [Radios],
      [Tabs]
    ])
  })
})
