import { describe, it, expect, vi } from 'vitest'
import { createMeeting } from './api'
import type { CreateMeetingInput } from '../types'

describe('createMeeting', () => {
  it('sends POST with correct body', async () => {
    const payload: CreateMeetingInput = {
      title: 'New Meeting',
      transcript: 'Test transcript here',
      industry: 'general',
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: '123', ...payload, status: 'pending' }),
    } as Response)

    await createMeeting(payload)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('New Meeting'),
      })
    )
  })
})
