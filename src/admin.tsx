'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, PasswordField, useFormModified, toast } from '@payloadcms/ui'
import type { TextFieldClientComponent } from 'payload'

export const SecretField: TextFieldClientComponent = ({ field, path }) => (
  <PasswordField field={field} path={path || field.name} autoComplete="new-password" />
)

export function ProvisionSettings() {
  const router = useRouter()
  const modified = useFormModified()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function sync() {
    setBusy(true)
    try {
      const response = await fetch('/api/v1/chatbot/sync', { method: 'POST', credentials: 'same-origin' })
      const result = await response.json()
      setMessage(response.ok ? 'Campaign and Turnstile settings synchronized.' : result.error)
      if (response.ok) {
        toast.success('Campaign and Turnstile settings synchronized.')
        router.refresh()
      }
    } catch { setMessage('Could not connect to the settings service.') }
    finally { setBusy(false) }
  }
  return <div>
    <p>Save your API origin and key before synchronizing the campaign and Turnstile settings.</p>
    <Button buttonStyle="secondary" disabled={busy || modified} onClick={sync}>
      {busy ? 'Synchronizing…' : 'Sync backend settings'}
    </Button>
    <p role="status">{message}</p>
  </div>
}
