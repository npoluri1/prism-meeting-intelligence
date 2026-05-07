import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiFetch, getMeetings, createMeeting, getMeeting } from './api'
import type { MeetingCreate } from '../types'

// Mock global fetch
beforeEach(() => {
  vi.restoreAllMocks()
})

describe('apiFetch', () => {
  it('adds Authorization header when token exists', async () => {
    const mockToken = 'test-token-123'
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(mockToken)
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: 'test' }),
    } as Response)

    await apiFetch('/test')
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${mockToken}`,
        }),
      })
    )
  })

  it('throws ApiError on non-ok response', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null)
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ detail: 'Not found', code: 'not_found' }),
    } as Response)

    await expect(apiFetch('/missing')).rejects.toThrow('Not found')
  })
})

describe('getMeetings', () => {
  it('calls correct endpoint', async () => {
    const mockMeetings = [{ id: '1', title: 'Test', status: 'done', created_at: new Date().toISOString() }]
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockMeetings),
    } as Response)

    const result = await getMeetings()
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/meetings'),
      expect.any(Object)
    )
    expect(result).toEqual(mockMeetings)
  })
})

describe('createMeeting', () => {
  it('sends POST with correct body', async () => {
    const payload: MeetingCreate = {
      title: 'New Meeting',
      transcript: 'Test transcript here',
      industry: 'general',
    }
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: '123', ...payload, status: 'pending' }),
    } as Response)

    await createMeeting(payload)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('New Meeting'),
      })
    )
  })
})
