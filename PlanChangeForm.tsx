'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

export function PlanChangeForm({ userId, currentPlan }: { userId: number; currentPlan: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPlan = e.target.value
    if (newPlan === currentPlan) return

    const res = await fetch(`/api/admin/users/${userId}/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: newPlan }),
    })
    if (res.ok) {
      startTransition(() => router.refresh())
    } else {
      alert('Failed to update plan')
    }
  }

  return (
    <select
      defaultValue={currentPlan}
      onChange={handleChange}
      disabled={isPending}
      style={{
        padding: '6px 10px',
        border: '1px solid var(--rule)',
        borderRadius: 4,
        fontFamily: 'var(--sans)',
        fontSize: 12,
        background: 'var(--paper)',
        cursor: isPending ? 'wait' : 'pointer',
      }}
    >
      <option value="free">Free</option>
      <option value="builder">Builder</option>
      <option value="enterprise">Enterprise</option>
    </select>
  )
}
