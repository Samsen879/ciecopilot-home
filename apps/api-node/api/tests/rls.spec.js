import express from 'express'
import request from 'supertest'
import { globalErrorHandler } from '../middleware/validation.js'

describe('RLS Contract', () => {
  it('A accessing B resource returns RLS_DENIED', async () => {
    const app = express()
    app.get('/test-denied', (req, res, next) => {
      const err = { code: '42501', message: 'insufficient privilege' } // supabase/pg RLS
      next(err)
    })
    app.use(globalErrorHandler)
    const res = await request(app).get('/test-denied')
    expect(res.status).toBe(403)
    expect(res.body?.error?.code).toBe('RLS_DENIED')
  })

  it('A accessing own resource returns 200', async () => {
    const app = express()
    app.get('/test-own', (req, res) => res.json({ ok: true }))
    const res = await request(app).get('/test-own')
    expect(res.status).toBe(200)
    expect(res.body?.ok).toBe(true)
  })
})
