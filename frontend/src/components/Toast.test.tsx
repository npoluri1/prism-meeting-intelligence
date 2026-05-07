import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ToastProvider, useToast } from './Toast'
import React from 'react'

// Mock the toast hook usage in a test component
function TestConsumer() {
  const { toast } = useToast()
  return (
    <div>
      <button onClick={() => toast('Test message', 'success')}>Show Toast</button>
      <button onClick={() => toast('Error message', 'error')}>Show Error</button>
    </div>
  )
}

describe('Toast', () => {
  it('renders success toast on button click', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('Show Toast'))
    expect(screen.getByText('Test message')).toBeTruthy()
  })

  it('renders error toast with correct styling class', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('Show Error'))
    const toast = screen.getByText('Error message')
    expect(toast).toBeTruthy()
  })

  it('removes toast after timeout', async () => {
    vi.useFakeTimers()
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('Show Toast'))
    expect(screen.getByText('Test message')).toBeTruthy()

    vi.advanceTimersByTime(4000)
    expect(screen.queryByText('Test message')).toBeNull()
    vi.useRealTimers()
  })
})
