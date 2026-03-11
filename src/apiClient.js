/**
 * API client for backend (Vercel serverless + Supabase).
 * When useApi is true, the app uses these instead of localStorage.
 */

const apiBase = import.meta.env.VITE_API_URL || ''
const useApi = !!(import.meta.env.VITE_USE_API === 'true' || (typeof window !== 'undefined' && /vercel\.app/.test(window.location.hostname)))

async function request(path, options = {}) {
  const url = `${apiBase}/api/${path}`
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

export const api = {
  useApi: () => useApi,

  async getColleagues() {
    return request('colleagues')
  },
  async setColleagues(list) {
    return request('colleagues', { method: 'POST', body: { action: 'set', payload: list } })
  },
  async addColleague(c) {
    return request('colleagues', { method: 'POST', body: { action: 'add', payload: c } })
  },
  async updateColleague(c) {
    return request('colleagues', { method: 'POST', body: { action: 'update', payload: c } })
  },

  async getGames() {
    return request('games')
  },
  async setGames(list) {
    return request('games', { method: 'POST', body: { action: 'set', payload: list } })
  },
  async addGame(g) {
    return request('games', { method: 'POST', body: { action: 'add', payload: g } })
  },
  async updateGame(g) {
    return request('games', { method: 'POST', body: { action: 'update', payload: g } })
  },
  async deleteGame(id) {
    return request('games', { method: 'POST', body: { action: 'delete', payload: { id } } })
  },

  async getSpendings() {
    return request('spendings')
  },
  async setSpendings(list) {
    return request('spendings', { method: 'POST', body: { action: 'set', payload: list } })
  },
  async addSpending(s) {
    return request('spendings', { method: 'POST', body: { action: 'add', payload: s } })
  },
  async deleteSpending(id) {
    return request('spendings', { method: 'POST', body: { action: 'delete', payload: { id } } })
  },

  async getAuditLog() {
    return request('audit-log')
  },
  async addAuditLogEntry(entry) {
    return request('audit-log', { method: 'POST', body: { action: 'add', payload: entry } })
  },

  async getSettings() {
    return request('settings')
  },
  async setSetting(key, value) {
    return request('settings', { method: 'POST', body: { key, value } })
  },

  async login(email, password) {
    return request('login', { method: 'POST', body: { email, password } })
  },

  async setPasswords(map) {
    return request('passwords', { method: 'POST', body: { action: 'set', payload: map } })
  },
  async setPassword(email, password) {
    return request('passwords', { method: 'POST', body: { action: 'setOne', payload: { email, password } } })
  },
}

export default api
