import request from 'supertest'
import express from 'express'
import { jest } from '@jest/globals'
import { resolve } from 'path'
import { pathToFileURL } from 'url'

describe('SSE Stream', () => {
  let app
  beforeAll(async () => {
    jest.useFakeTimers()
    process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321'
    process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key'
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key'
    process.env.SAMSEN_SKIP_HEALTH = 'true'
    process.env.SAMSEN_SKIP_TIMERS = 'true'
    process.env.SAMSEN_AGENT_ENABLED = 'false'
    app = express()
    app.use(express.json())
    const streamingRoutes = (await import(new URL('../samsen/routes/streamingChat.js', import.meta.url).href)).default
    app.use('/api/samsen/chat', streamingRoutes)
  })
  afterAll(() => {
    jest.clearAllTimers()
  })
  it('POST /api/samsen/chat/stream establishes event-stream', async () => {
    const res = await request(app)
      .post('/api/samsen/chat/stream')
      .set('Accept', 'text/event-stream')
      .set('X-Request-Id', 'test-req-1')
      .send({ message: 'hello', context: { subject_code: '9709' } })
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/event-stream')
  }, 15000)
})
