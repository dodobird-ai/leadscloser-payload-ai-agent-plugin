'use client'
import { useEffect } from 'react'
import { startChatbotTracking } from './tracking.ts'
import { startChatbot } from './client.ts'

// Public layouts share one widget and one token renewal timer across navigation.
let boot: Promise<void> | undefined
export function Chatbot({ analyticsConsent = false }: { analyticsConsent?: boolean } = {}) {
  useEffect(() => {
    if (!analyticsConsent) return
    return startChatbotTracking({ hasConsent: () => analyticsConsent })
  }, [analyticsConsent])
  useEffect(() => {
    boot ||= startChatbot().catch(() => {
      boot = undefined
      console.warn('Chatbot could not start. Reload the page to retry.')
    })
  }, [])
  return null
}
