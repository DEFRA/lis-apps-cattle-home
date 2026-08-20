import { describe, expect, test, vi } from 'vitest'

const { Button, Checkboxes, ErrorSummary, Radios, SkipLink, Tabs, createAll } =
  vi.hoisted(() => ({
    Button: class {},
    Checkboxes: class {},
    ErrorSummary: class {},
    Radios: class {},
    SkipLink: class {},
    Tabs: class {},
    createAll: vi.fn()
  }))

vi.mock('govuk-frontend', () => ({
  Button,
  Checkboxes,
  ErrorSummary,
  Radios,
  SkipLink,
  Tabs,
  createAll
}))

describe('browser application bootstrap', () => {
  test('initialises each GOV.UK component', async () => {
    await import('./application.js')

    expect(createAll.mock.calls).toEqual([
      [Button],
      [Checkboxes],
      [ErrorSummary],
      [Radios],
      [SkipLink],
      [Tabs]
    ])
  })
})
