import request from 'supertest'
import express from 'express'
import { jest } from '@jest/globals'

describe('SSE Stream with SamsenAgent', () => {
  let app
  beforeAll(async () => {
    jest.useFakeTimers()
    process.env.SAMSEN_AGENT_ENABLED = 'true'
    process.env.SAMSEN_SKIP_HEALTH = 'true'
    process.env.SAMSEN_SKIP_TIMERS = 'true'
    // mock core to avoid external calls
    const modPath = '../samsen/core/SamsenCore.js'
    await jest.unstable_mockModule(modPath, () => ({
      createSamsenCore: () => ({
        initialize: async () => true,
        aiAdapter: {
          chatWithRole: async ({ role, messages }) => ({ text: `mocked ${role}: ${messages?.[1]?.content || ''}` })
        }
      })
    }))

    app = express()
    app.use(express.json())
    const streamingRoutes = (await import(new URL('../samsen/routes/streamingChat.js', import.meta.url).href)).default
    app.use('/api/samsen/chat', streamingRoutes)
  })

  it('POST /api/samsen/chat/stream streams chunks via agent', async () => {
    const res = await request(app)
      .post('/api/samsen/chat/stream')
      .set('Accept', 'text/event-stream')
      .set('X-Request-Id', 'test-req-2')
      .send({ message: 'hello agent', context: { subject_code: '9709' } })
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/event-stream')
    expect(res.text).toContain('"type":"connected"')
    expect(res.text).toContain('"type":"done"')
    expect(res.text).toContain('agentEventsSummary')
  })
})
