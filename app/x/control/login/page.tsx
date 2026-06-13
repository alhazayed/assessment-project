'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react'
import BrandLogo from '@/components/brand-logo'

export default function AdminLoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '', pin: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPin, setShowPin] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Login failed'); setLoading(false); return }
      router.push('/x/control/overview')
    } catch {
      setError('Network error')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#12273C' }}>
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-2 mb-8">
          <BrandLogo variant="full" size={88} />
          <div className="flex items-center gap-2 mt-1">
            <Shield className="w-4 h-4" style={{ color: '#F3650A' }} />
            <p className="text-sm font-medium" style={{ color: '#7EB7DB' }}>Admin Control Panel</p>
          </div>
        </div>

        <div className="rounded-2xl p-8 border" style={{ backgroundColor: '#1a3148', borderColor: '#1D6296' }}>
          {error && (
            <div className="mb-5 p-3 bg-red-900/30 border border-red-800 rounded-lg flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#A9CFE7' }}>Email</label>
              <input
                type="email" required autoComplete="email"
                className="w-full rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2"
                style={{ backgroundColor: '#0E314D', border: '1px solid #1D6296', outlineColor: '#F3650A' }}
                value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#A9CFE7' }}>Password</label>
              <input
                type="password" required autoComplete="current-password"
                className="w-full rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2"
                style={{ backgroundColor: '#0E314D', border: '1px solid #1D6296' }}
                value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#A9CFE7' }}>Admin PIN</label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'} required
                  className="w-full rounded-lg px-3 py-2.5 pr-10 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2"
                  style={{ backgroundColor: '#0E314D', border: '1px solid #1D6296' }}
                  value={form.pin} onChange={e => setForm(p => ({ ...p, pin: e.target.value }))}
                  placeholder="Secret admin PIN"
                />
                <button type="button" onClick={() => setShowPin(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-white transition-colors" style={{ color: '#7EB7DB' }}>
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full mt-2 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors hover:opacity-90"
              style={{ backgroundColor: '#F3650A' }}
            >
              {loading ? 'Authenticating…' : 'Access Control Panel'}
            </button>
          </form>
        </div>
        <p className="text-center text-xs mt-4" style={{ color: '#53A0CF' }}>This is a restricted area. Unauthorized access is prohibited.</p>
      </div>
    </div>
  )
}
