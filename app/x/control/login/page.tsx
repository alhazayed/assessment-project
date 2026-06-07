'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react'

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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Admin Control</h1>
            <p className="text-sm text-slate-400">vWelfare Platform</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          {error && (
            <div className="mb-5 p-3 bg-red-900/30 border border-red-800 rounded-lg flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
              <input
                type="email" required autoComplete="email"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <input
                type="password" required autoComplete="current-password"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Admin PIN</label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'} required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 pr-10 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.pin} onChange={e => setForm(p => ({ ...p, pin: e.target.value }))}
                  placeholder="Secret admin PIN"
                />
                <button type="button" onClick={() => setShowPin(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              {loading ? 'Authenticating…' : 'Access Control Panel'}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-slate-600 mt-4">This is a restricted area. Unauthorized access is prohibited.</p>
      </div>
    </div>
  )
}
