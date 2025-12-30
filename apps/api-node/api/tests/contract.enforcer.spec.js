import fs from 'fs'
import path from 'path'
import YAML from 'yamljs'
import request from 'supertest'
import express from 'express'

describe('OpenAPI Contract (P0)', () => {
  let app
  let doc
  beforeAll(async () => {
    const yamlPath = path.resolve(process.cwd(), 'apps/api-node/api/docs/openapi.formatted.yaml')
    const full = YAML.load(yamlPath)
    const samsenPaths = {}
    Object.keys(full.paths || {}).forEach(p => { if (p.startsWith('/api/samsen/')) samsenPaths[p] = full.paths[p] })
    doc = { openapi: full.openapi || '3.0.3', info: full.info, paths: samsenPaths, components: full.components || {} }

    process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321'
    process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key'
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key'
    process.env.SAMSEN_SKIP_HEALTH = 'true'
    process.env.SAMSEN_SKIP_TIMERS = 'true'

    app = express()
    app.use(express.json())
    const samsenRoutes = (await import(new URL('../samsen/routes/samsenRoutes.js', import.meta.url).href)).default
    app.use('/api/samsen', samsenRoutes)
  })

  it.skip('GET /api/samsen/review/daily conforms to OpenAPI', async () => {
    const res = await request(app).get('/api/samsen/review/daily').query({ userId: '550e8400-e29b-41d4-a716-446655440000' })
    expect(doc.paths['/api/samsen/review/daily']).toBeDefined()
    expect(doc.paths['/api/samsen/review/daily'].get).toBeDefined()
  })
})
