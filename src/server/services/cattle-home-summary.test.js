import { buildCattleHomeSummary } from './cattle-home-summary.js'

describe('#buildCattleHomeSummary', () => {
  test('Builds counts for every CPH and an overall total', async () => {
    const cattleHomeApi = {
      getCphsForUser: vi.fn().mockResolvedValue({
        data: [
          { name: 'My farm', cph: '10/081/1234' },
          { name: 'My other farm', cph: '12/091/6278' }
        ]
      }),
      getCattleForCph: vi
        .fn()
        .mockResolvedValueOnce({
          data: [{ status: 'saved' }, { status: 'draft' }, {}]
        })
        .mockResolvedValueOnce({ data: [{}] })
    }

    const summary = await buildCattleHomeSummary({
      cattleHomeApi,
      userId: 'test.user@example.com',
      traceId: 'trace-123'
    })

    expect(summary).toEqual({
      holdings: [
        {
          name: 'My farm',
          cph: '10/081/1234',
          cattle: [
            {
              status: 'saved',
              statusLabel: 'Validated',
              statusClass: 'govuk-tag--green'
            },
            {
              status: 'draft',
              statusLabel: 'Pending',
              statusClass: 'govuk-tag--blue'
            },
            {
              statusLabel: 'Pending',
              statusClass: 'govuk-tag--blue'
            }
          ],
          cattleCount: 3
        },
        {
          name: 'My other farm',
          cph: '12/091/6278',
          cattle: [
            {
              statusLabel: 'Pending',
              statusClass: 'govuk-tag--blue'
            }
          ],
          cattleCount: 1
        }
      ],
      totalCattle: 4
    })
    expect(cattleHomeApi.getCattleForCph).toHaveBeenCalledTimes(2)
    expect(cattleHomeApi.getCattleForCph).toHaveBeenCalledWith(
      '10/081/1234',
      'trace-123'
    )
    expect(cattleHomeApi.getCattleForCph).toHaveBeenCalledWith(
      '12/091/6278',
      'trace-123'
    )
  })

  test('Returns an empty summary when the user has no CPHs', async () => {
    const cattleHomeApi = {
      getCphsForUser: vi.fn().mockResolvedValue({ data: [] }),
      getCattleForCph: vi.fn()
    }

    const summary = await buildCattleHomeSummary({
      cattleHomeApi,
      userId: 'test.user@example.com'
    })

    expect(summary).toEqual({ holdings: [], totalCattle: 0 })
    expect(cattleHomeApi.getCattleForCph).not.toHaveBeenCalled()
  })
})
