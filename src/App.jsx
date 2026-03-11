import { useState, useEffect, useRef } from 'react'
import api from './apiClient.js'
import { QRCodeSVG } from 'qrcode.react'
import {
  Trophy,
  LogOut,
  LayoutDashboard,
  Users,
  Wallet,
  Gamepad2,
  UserCircle,
  LogIn,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  Pencil,
  Trash2,
  ChevronRight,
  Sparkles,
  ListOrdered,
  Coins,
  ClipboardList,
  Search,
  QrCode,
  ArrowLeft,
  PocketKnife,
  Menu,
  X,
  HelpCircle,
} from 'lucide-react'
import './App.css'

const STORAGE_KEY = 'company-leaderboard-data'
const AUTH_STORAGE_KEY = 'company-leaderboard-auth'
const PASSWORDS_STORAGE_KEY = 'company-leaderboard-passwords'
const SPENDINGS_STORAGE_KEY = 'company-leaderboard-spendings'
const OPENING_BALANCE_STORAGE_KEY = 'company-leaderboard-opening-balance'
const GAMES_STORAGE_KEY = 'company-leaderboard-games'
const AUDIT_LOG_STORAGE_KEY = 'company-leaderboard-audit-log'
const MAX_AUDIT_ENTRIES = 500

const ADMIN_EMAIL = 'admin@cybersolution.com.my'
const ADMIN_PASSWORD = 'P@ssw0rd'
const DEFAULT_PASSWORD = 'P@ssw0rd'

const ROLES = ['member', 'finance', 'admin']
const BRANCHES = ['Johor', 'Kuala Lumpur', 'Kuantan']
const BRANCH_LABELS = { 'Johor': 'JB', 'Kuala Lumpur': 'KL', 'Kuantan': 'Kuantan' }

const GAME_TYPES = [
  { value: 'standard', label: 'Standard' },
  { value: 'guess', label: 'Guess' },
  { value: 'culling', label: 'Culling game' },
]
const GAMES_PER_PAGE = 9
const CULLING_GAME_START_DATE = new Date('2026-06-01')

function sortGamesByNearestDate(gamesList) {
  return [...gamesList].sort((a, b) => {
    const dateA = (a.date || '').trim() ? new Date(a.date).getTime() : null
    const dateB = (b.date || '').trim() ? new Date(b.date).getTime() : null
    if (dateA == null && dateB == null) return 0
    if (dateA == null) return 1
    if (dateB == null) return -1
    return dateA - dateB
  })
}

function isCullingGameAvailable() {
  return new Date() >= CULLING_GAME_START_DATE
}

const defaultColleagues = [
  { id: '1', name: 'Ahmad Rizal', email: 'ahmad.rizal@cybersolution.com.my', role: 'member', branch: 'Johor', points: 420, active: true, amountPaid: 0 },
  { id: '2', name: 'Siti Nurhaliza', email: 'siti@cybersolution.com.my', role: 'finance', branch: 'Kuala Lumpur', points: 380, active: true, amountPaid: 0 },
  { id: '3', name: 'Raj Kumar', email: 'raj.kumar@cybersolution.com.my', role: 'member', branch: 'Kuantan', points: 355, active: true, amountPaid: 0 },
  { id: '4', name: 'Mei Ling', email: 'mei.ling@cybersolution.com.my', role: 'admin', branch: 'Johor', points: 290, active: true, amountPaid: 0 },
  { id: '5', name: 'David Tan', email: 'david.tan@cybersolution.com.my', role: 'member', branch: 'Kuala Lumpur', points: 210, active: true, amountPaid: 0 },
]

function getStoredPasswords() {
  try {
    const raw = localStorage.getItem(PASSWORDS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch (_) {
    return {}
  }
}

function getAuditLog() {
  try {
    const raw = localStorage.getItem(AUDIT_LOG_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (_) {
    return []
  }
}

const PAGES = {
  leaderboard: { label: 'Leaderboard', adminOnly: false },
  login: { label: 'Log in', guestOnly: true },
  people: { label: 'People', adminOnly: true },
  collection: { label: 'Collection', adminOnly: true },
  games: { label: 'Games', adminOnly: false },
  culling: { label: 'Culling game', adminOnly: false },
  profile: { label: 'Profile', adminOnly: false },
  settings: { label: 'Audit log', adminOnly: true },
}

function getValidPage(hash, isAdmin, isLoggedIn, canAccessCollection) {
  const raw = (hash || 'leaderboard').replace(/^#/, '').replace(/^\/+/, '').toLowerCase()
  if (!isLoggedIn) {
    if (raw === 'login' || raw === 'signin') return 'login'
    return 'leaderboard'
  }
  let page = raw
  if (page === 'users') page = 'people'
  if (page === 'password') page = 'profile'
  if (page === 'audit') page = 'settings'
  if (page === 'culling-game' || page === 'cullinggame') page = 'culling'
  const config = PAGES[page]
  if (!config || config.guestOnly) return 'leaderboard'
  if (page === 'collection' && !canAccessCollection) return 'leaderboard'
  if (config.adminOnly && page !== 'collection' && !isAdmin) return 'leaderboard'
  return page
}

function App() {
  const [auth, setAuth] = useState(() => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY)
      if (!raw) return null
      const data = JSON.parse(raw)
      return data.userEmail && data.isAdmin !== undefined ? data : null
    } catch (_) {
      return null
    }
  })
  const isLoggedIn = !!auth
  const isAdmin = auth?.isAdmin ?? false
  const useApi = api.useApi()
  const [dataLoading, setDataLoading] = useState(useApi)
  const initialLoadDone = useRef(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState('')

  const [currentPage, setCurrentPage] = useState('leaderboard')
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = 'leaderboard'
    }
  }, [])

  useEffect(() => {
    if (currentPage !== 'games') setSelectedGameId(null)
  }, [currentPage])

  const pageTitles = {
    leaderboard: 'Leaderboard',
    people: 'People',
    collection: 'Collection',
    games: 'Games',
    culling: 'Culling game',
    profile: 'Profile',
    settings: 'Audit log',
  }
  useEffect(() => {
    const base = 'MSC & CTSB SPORTS'
    if (!isLoggedIn) {
      document.title = currentPage === 'login' ? `Log in · ${base}` : base
      return
    }
    const label = pageTitles[currentPage] || 'Leaderboard'
    document.title = label === 'Leaderboard' ? base : `${label} · ${base}`
  }, [isLoggedIn, currentPage])

  const handleLogin = (e) => {
    e.preventDefault()
    setLoginError('')
    const email = loginEmail.trim().toLowerCase()
    const password = loginPassword
    if (useApi) {
      api
        .login(email, password)
        .then((data) => {
          const authPayload = { userEmail: data.userEmail, isAdmin: !!data.isAdmin }
          setAuth(authPayload)
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authPayload))
          addAuditLog(data.isAdmin ? 'Admin logged in' : 'Member logged in', data.userEmail)
          setLoginEmail('')
          setLoginPassword('')
          window.location.hash = 'leaderboard'
        })
        .catch((err) => setLoginError(err?.message || 'Invalid email or password.'))
      return
    }
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      setAuth({ userEmail: ADMIN_EMAIL, isAdmin: true })
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ userEmail: ADMIN_EMAIL, isAdmin: true }))
      addAuditLog('Admin logged in', ADMIN_EMAIL)
      setLoginEmail('')
      setLoginPassword('')
      window.location.hash = 'leaderboard'
      return
    }
    const passwords = getStoredPasswords()
    const memberPassword = passwords[email] ?? DEFAULT_PASSWORD
    if (memberPassword !== password) {
      setLoginError('Invalid email or password.')
      return
    }
    const found = colleagues.find((c) => (c.email || '').toLowerCase() === email)
    if (found) {
      if (found.active === false) {
        setLoginError('This account is inactive. Contact an administrator.')
        return
      }
      setAuth({ userEmail: email, isAdmin: false })
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ userEmail: email, isAdmin: false }))
      addAuditLog('Member logged in', email)
      setLoginEmail('')
      setLoginPassword('')
      window.location.hash = 'leaderboard'
    } else {
      setLoginError('Invalid email or password.')
    }
  }

  const handleLogout = () => {
    addAuditLog('Logged out', auth?.userEmail)
    setAuth(null)
    localStorage.removeItem(AUTH_STORAGE_KEY)
    window.location.hash = 'leaderboard'
  }

  const [colleagues, setColleagues] = useState(() => {
    if (useApi) return []
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const list = JSON.parse(saved)
        return list.map((c) => ({
          ...c,
          email: (c.email || '').trim(),
          role: c.role || 'member',
          branch: c.branch || 'Johor',
          active: c.active !== false,
          amountPaid: Number(c.amountPaid) || 0,
          gameHistory: Array.isArray(c.gameHistory) ? c.gameHistory : [],
        }))
      }
    } catch (_) {}
    return defaultColleagues
  })

  const currentUser = colleagues.find((c) => (c.email || '').toLowerCase() === (auth?.userEmail || '').toLowerCase())
  const canAccessCollection = isAdmin || currentUser?.role === 'finance'

  useEffect(() => {
    const sync = () => {
      const hashRaw = window.location.hash.slice(1).replace(/^\/+/, '')
      const valid = getValidPage(hashRaw || 'leaderboard', isAdmin, isLoggedIn, canAccessCollection)
      if (valid !== hashRaw) {
        window.location.hash = valid
      }
      setCurrentPage(valid)
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [isLoggedIn, isAdmin, canAccessCollection])

  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState('member')
  const [newBranch, setNewBranch] = useState('Johor')
  const [message, setMessage] = useState(null)
  const [changePwCurrent, setChangePwCurrent] = useState('')
  const [changePwNew, setChangePwNew] = useState('')
  const [changePwConfirm, setChangePwConfirm] = useState('')
  const [changePwMessage, setChangePwMessage] = useState(null)
  const [profileNewEmail, setProfileNewEmail] = useState('')
  const [profileEmailPassword, setProfileEmailPassword] = useState('')
  const [profileEmailMessage, setProfileEmailMessage] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [contributionSearchQuery, setContributionSearchQuery] = useState('')
  const [contributionBranchFilter, setContributionBranchFilter] = useState('')
  const [selectedGameId, setSelectedGameId] = useState(null)
  const [gameTypeFilter, setGameTypeFilter] = useState('')
  const [currentGamesPage, setCurrentGamesPage] = useState(1)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState('member')
  const [editBranch, setEditBranch] = useState('Johor')
  const [editingPaymentId, setEditingPaymentId] = useState(null)
  const [editingPaymentAmount, setEditingPaymentAmount] = useState('')
  const [spendings, setSpendings] = useState(() => {
    if (useApi) return []
    try {
      const raw = localStorage.getItem(SPENDINGS_STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch (_) {
      return []
    }
  })
  const [newSpendingDesc, setNewSpendingDesc] = useState('')
  const [newSpendingAmount, setNewSpendingAmount] = useState('')
  const [newSpendingBranch, setNewSpendingBranch] = useState('')
  const [openingBalance, setOpeningBalance] = useState(() => {
    if (useApi) return 0
    try {
      const raw = localStorage.getItem(OPENING_BALANCE_STORAGE_KEY)
      return raw !== null ? Number(raw) || 0 : 0
    } catch (_) {
      return 0
    }
  })
  const [editingOpeningBalance, setEditingOpeningBalance] = useState(false)
  const [openingBalanceInput, setOpeningBalanceInput] = useState('')
  const [games, setGames] = useState(() => {
    if (useApi) return []
    try {
      const raw = localStorage.getItem(GAMES_STORAGE_KEY)
      const list = raw ? JSON.parse(raw) : []
      return list.map((g) => ({
        ...g,
        type: g.type || 'standard',
        active: g.active !== false,
        pointsPerJoin: (g.type || 'standard') === 'standard' ? Math.max(0, Number(g.pointsPerJoin)) : undefined,
        pointsPerScan: Number(g.pointsPerScan) || 10,
        scannedBy: Array.isArray(g.scannedBy) ? g.scannedBy : [],
        guessQuestion: g.guessQuestion || '',
        guessAnswers: g.guessAnswers && typeof g.guessAnswers === 'object' ? g.guessAnswers : {},
        guessCorrectAnswer: g.guessCorrectAnswer || '',
        guessPointsJoin: Math.max(0, Number(g.guessPointsJoin)) || 1,
        guessPointsCorrect: Math.max(0, Number(g.guessPointsCorrect)) || 1,
      }))
    } catch (_) {
      return []
    }
  })
  const [gameName, setGameName] = useState('')
  const [gameDescription, setGameDescription] = useState('')
  const [gameDate, setGameDate] = useState('')
  const [gameType, setGameType] = useState('standard')
  const [gameStandardPoints, setGameStandardPoints] = useState(0)
  const [gamePointsPerScan, setGamePointsPerScan] = useState(10)
  const [gameGuessQuestion, setGameGuessQuestion] = useState('')
  const [gameGuessCorrectAnswer, setGameGuessCorrectAnswer] = useState('')
  const [gameGuessPointsJoin, setGameGuessPointsJoin] = useState(1)
  const [gameGuessPointsCorrect, setGameGuessPointsCorrect] = useState(1)
  const [showingGuessFormForGameId, setShowingGuessFormForGameId] = useState(null)
  const [guessAnswerInput, setGuessAnswerInput] = useState('')
  const [auditLog, setAuditLog] = useState(() => (useApi ? [] : getAuditLog()))

  useEffect(() => {
    if (!useApi) return
    let cancelled = false
    Promise.all([
      api.getColleagues(),
      api.getGames(),
      api.getSpendings(),
      api.getAuditLog(),
      api.getSettings(),
    ])
      .then(([colleaguesList, gamesList, spendingsList, auditList, settings]) => {
        if (cancelled) return
        setColleagues(Array.isArray(colleaguesList) ? colleaguesList : [])
        setGames(Array.isArray(gamesList) ? gamesList : [])
        setSpendings(Array.isArray(spendingsList) ? spendingsList : [])
        setAuditLog(Array.isArray(auditList) ? auditList.slice(0, MAX_AUDIT_ENTRIES) : [])
        const ob = settings?.opening_balance ?? settings?.openingBalance
        setOpeningBalance(ob !== undefined && ob !== null ? Number(ob) || 0 : 0)
        setDataLoading(false)
        setTimeout(() => { initialLoadDone.current = true }, 100)
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Initial API load failed', err)
          setDataLoading(false)
          initialLoadDone.current = true
        }
      })
    return () => { cancelled = true }
  }, [useApi])

  const addAuditLog = (message, userEmail) => {
    const who = userEmail || auth?.userEmail || 'System'
    const entry = {
      id: String(Date.now()),
      timestamp: new Date().toISOString(),
      message,
      userEmail: who,
    }
    if (useApi) api.addAuditLogEntry(entry).catch(console.error)
    setAuditLog((prev) => {
      const next = [entry, ...prev].slice(0, MAX_AUDIT_ENTRIES)
      if (!useApi) localStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  useEffect(() => {
    if (useApi && initialLoadDone.current) {
      api.setColleagues(colleagues).catch(console.error)
    } else if (!useApi) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(colleagues))
    }
  }, [colleagues, useApi])

  useEffect(() => {
    if (useApi && initialLoadDone.current) {
      api.setGames(games).catch(console.error)
    } else if (!useApi) {
      localStorage.setItem(GAMES_STORAGE_KEY, JSON.stringify(games))
    }
  }, [games, useApi])

  // Handle QR scan: ?scan=gameId — behaviour depends on game type
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const gameId = params.get('scan')
    if (!gameId || !auth?.userEmail) return
    const game = games.find((g) => g.id === gameId)
    if (!game) return
    if (game.active === false) {
      window.history.replaceState({}, '', window.location.pathname || '/')
      setMessage('This game is no longer active. You cannot join.')
      setTimeout(() => setMessage(null), 4000)
      return
    }
    const type = game.type || 'standard'
    const participants = game.participants || []
    const isInParticipants = participants.includes(auth.userEmail)

    if (type === 'standard') {
      const joinPts = Math.max(0, Number(game.pointsPerJoin)) || 0
      if (isInParticipants) {
        window.history.replaceState({}, '', window.location.pathname || '/')
        setMessage('You have already joined this game.')
        setTimeout(() => setMessage(null), 3000)
        return
      }
      setGames((prev) =>
        prev.map((g) =>
          g.id === gameId ? { ...g, participants: [...(g.participants || []), auth.userEmail] } : g
        )
      )
      setColleagues((prev) =>
        prev.map((c) =>
          (c.email || '').toLowerCase() === auth.userEmail.toLowerCase()
            ? {
                ...c,
                points: (c.points || 0) + joinPts,
                gameHistory: [...(c.gameHistory || []), { gameId, gameName: game.name, points: joinPts }],
              }
            : c
        )
      )
      addAuditLog(`${auth.userEmail} joined game: ${game.name} (standard)${joinPts > 0 ? ` +${joinPts} pts` : ''}`, auth.userEmail)
      window.history.replaceState({}, '', window.location.pathname || '/')
      setMessage(joinPts > 0 ? `You joined ${game.name}! +${joinPts} point(s).` : `You joined ${game.name}!`)
      setTimeout(() => setMessage(null), 4000)
      return
    }

    if (type === 'guess') {
      const joinPts = Math.max(0, Number(game.guessPointsJoin)) || 1
      const correctPts = Math.max(0, Number(game.guessPointsCorrect)) || 1
      const scannedBy = game.scannedBy || []
      const isFirstScan = !scannedBy.includes(auth.userEmail)
      if (!isInParticipants) {
        setGames((prev) =>
          prev.map((g) =>
            g.id === gameId ? { ...g, participants: [...(g.participants || []), auth.userEmail] } : g
          )
        )
      }
      if (isFirstScan) {
        const isMember = colleagues.some((c) => (c.email || '').toLowerCase() === auth.userEmail.toLowerCase())
        if (isMember) {
          setColleagues((prev) =>
            prev.map((c) =>
              (c.email || '').toLowerCase() === auth.userEmail.toLowerCase()
                ? {
                    ...c,
                    points: (c.points || 0) + joinPts,
                    gameHistory: [...(c.gameHistory || []), { gameId, gameName: game.name, points: joinPts }],
                  }
                : c
            )
          )
        } else {
          setColleagues((prev) =>
            prev.map((c) =>
              (c.email || '').toLowerCase() === auth.userEmail.toLowerCase()
                ? { ...c, gameHistory: [...(c.gameHistory || []), { gameId, gameName: game.name, points: 0 }] }
                : c
            )
          )
        }
        setGames((prev) =>
          prev.map((g) =>
            g.id === gameId ? { ...g, scannedBy: [...(g.scannedBy || []), auth.userEmail] } : g
          )
        )
        addAuditLog(`${auth.userEmail} joined guess game: ${game.name} (+${joinPts} pt scan)`, auth.userEmail)
      }
      const guessAnswers = game.guessAnswers || {}
      if (guessAnswers[auth.userEmail] !== undefined && guessAnswers[auth.userEmail] !== '') {
        window.history.replaceState({}, '', window.location.pathname || '/')
        setMessage('You already submitted an answer for this game.')
        setTimeout(() => setMessage(null), 3000)
        return
      }
      setShowingGuessFormForGameId(gameId)
      window.history.replaceState({}, '', window.location.pathname || '/')
      if (isFirstScan) {
        setMessage(joinPts > 0 ? `You joined! +${joinPts} point(s). Submit your answer for a chance to earn ${correctPts} more.` : `You joined! Submit your answer for a chance to earn ${correctPts} point(s).`)
        setTimeout(() => setMessage(null), 4000)
      }
      return
    }

    // Culling (or fallback): scan = earn points once
    const scannedBy = game.scannedBy || []
    if (scannedBy.includes(auth.userEmail)) {
      window.history.replaceState({}, '', window.location.pathname || '/')
      return
    }
    const points = Number(game.pointsPerScan) || 10
    const isMember = colleagues.some((c) => (c.email || '').toLowerCase() === auth.userEmail.toLowerCase())
    if (isMember) {
      setColleagues((prev) =>
        prev.map((c) =>
          (c.email || '').toLowerCase() === auth.userEmail.toLowerCase()
            ? {
                ...c,
                points: (c.points || 0) + points,
                gameHistory: [...(c.gameHistory || []), { gameId, gameName: game.name, points }],
              }
            : c
        )
      )
    }
    setGames((prev) =>
      prev.map((g) =>
        g.id === gameId ? { ...g, scannedBy: [...(g.scannedBy || []), auth.userEmail] } : g
      )
    )
    if (isMember) addAuditLog(`${auth.userEmail} scanned culling game: ${game.name} (+${points} pts)`, auth.userEmail)
    window.history.replaceState({}, '', window.location.pathname || '/')
    setMessage(isMember ? `You earned ${points} points for ${game.name}!` : 'Only members earn points from scanning.')
    setTimeout(() => setMessage(null), 4000)
  }, [auth?.userEmail, games, colleagues])

  useEffect(() => {
    if (useApi && initialLoadDone.current) {
      api.setSpendings(spendings).catch(console.error)
    } else if (!useApi) {
      localStorage.setItem(SPENDINGS_STORAGE_KEY, JSON.stringify(spendings))
    }
  }, [spendings, useApi])

  useEffect(() => {
    if (useApi && initialLoadDone.current) {
      api.setSetting('opening_balance', openingBalance).catch(console.error)
    } else if (!useApi) {
      localStorage.setItem(OPENING_BALANCE_STORAGE_KEY, String(openingBalance))
    }
  }, [openingBalance, useApi])

  const activeColleagues = colleagues.filter((c) => c.active !== false)
  const sortedColleagues = [...activeColleagues].sort((a, b) => b.points - a.points)
  const totalCollected = colleagues.reduce((sum, c) => sum + (Number(c.amountPaid) || 0), 0)
  const totalCollectionThisYear = 2 * totalCollected
  const totalSpent = spendings.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
  const balance = (Number(openingBalance) || 0) + totalCollectionThisYear - totalSpent

  const addPerson = (e) => {
    e.preventDefault()
    const name = newName.trim()
    const email = newEmail.trim().toLowerCase()
    if (!name || !email) return
    if (colleagues.some((c) => (c.email || '').toLowerCase() === email)) {
      setMessage('This email is already in the system.')
      setTimeout(() => setMessage(null), 3000)
      return
    }
    if (useApi) {
      api.setPassword(email, DEFAULT_PASSWORD).catch(console.error)
    } else {
      const passwords = getStoredPasswords()
      passwords[email] = DEFAULT_PASSWORD
      localStorage.setItem(PASSWORDS_STORAGE_KEY, JSON.stringify(passwords))
    }
    setColleagues((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name,
        email,
        role: newRole,
        branch: newBranch,
        points: 0,
        active: true,
        amountPaid: 0,
        gameHistory: [],
      },
    ])
    setNewName('')
    setNewEmail('')
    setNewRole('member')
    setNewBranch('Johor')
    addAuditLog(`Added person: ${name} (${email}), ${newRole}, ${newBranch}`)
    setMessage(`${name} added. They can log in with this email; default password: ${DEFAULT_PASSWORD}`)
    setTimeout(() => setMessage(null), 4000)
  }

  const submitGuessAnswer = (e) => {
    e.preventDefault()
    const gameId = showingGuessFormForGameId
    if (!gameId || !auth?.userEmail) return
    const answer = guessAnswerInput.trim()
    if (!answer) return
    const game = games.find((g) => g.id === gameId)
    if (!game) return
    const correctAnswer = (game.guessCorrectAnswer || '').trim().toLowerCase()
    const isCorrect = correctAnswer && answer.toLowerCase() === correctAnswer
    const isMember = colleagues.some((c) => (c.email || '').toLowerCase() === auth.userEmail.toLowerCase())
    setGames((prev) =>
      prev.map((g) =>
        g.id === gameId
          ? { ...g, guessAnswers: { ...(g.guessAnswers || {}), [auth.userEmail]: answer } }
          : g
      )
    )
    const correctPts = Math.max(0, Number(game.guessPointsCorrect)) || 1
    if (isMember && isCorrect) {
      setColleagues((prev) =>
        prev.map((c) => {
          if ((c.email || '').toLowerCase() !== auth.userEmail.toLowerCase()) return c
          const history = c.gameHistory || []
          const idx = history.findIndex((h) => h.gameId === gameId)
          const newHistory =
            idx >= 0
              ? history.map((h, i) => (i === idx ? { ...h, points: (h.points || 0) + correctPts } : h))
              : [...history, { gameId, gameName: game.name, points: correctPts }]
          return { ...c, points: (c.points || 0) + correctPts, gameHistory: newHistory }
        })
      )
      addAuditLog(`${auth.userEmail} correct answer on guess game: ${game.name} (+${correctPts} pt)`, auth.userEmail)
    }
    setShowingGuessFormForGameId(null)
    setGuessAnswerInput('')
    const joinPts = Math.max(0, Number(game.guessPointsJoin)) || 0
    if (isCorrect && isMember) {
      setMessage(`Correct! You received ${joinPts} point(s) for participating + ${correctPts} for the correct answer.`)
    } else if (isMember) {
      setMessage(`Answer submitted. You received ${joinPts} point(s) for participating in this game.`)
    } else {
      setMessage('Answer submitted!')
    }
    setTimeout(() => setMessage(null), 5000)
  }

  const getScanUrl = (gameId) => {
    if (typeof window === 'undefined') return ''
    const base = `${window.location.origin}${window.location.pathname || '/'}`
    return `${base}${base.endsWith('/') ? '' : ''}?scan=${encodeURIComponent(gameId)}`
  }

  const getRankBadge = (rank) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  const toggleActive = (id) => {
    const person = colleagues.find((c) => c.id === id)
    const newActive = !(person?.active !== false)
    if (!newActive && !window.confirm(`${person?.name} will be hidden from the leaderboard and will not be able to log in. Set inactive?`)) return
    setColleagues((prev) =>
      prev.map((c) => (c.id === id ? { ...c, active: newActive } : c))
    )
    addAuditLog(`${person?.name} set ${newActive ? 'active' : 'inactive'}`)
    setMessage(newActive ? `${person?.name} is now active.` : `${person?.name} is now inactive (hidden from leaderboard).`)
    setTimeout(() => setMessage(null), 3000)
  }

  const startEdit = (c) => {
    setEditingId(c.id)
    setEditName(c.name)
    setEditEmail(c.email || '')
    setEditRole(c.role || 'member')
    setEditBranch(c.branch || 'Johor')
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const saveEdit = (e) => {
    e.preventDefault()
    const id = editingId
    const person = colleagues.find((c) => c.id === id)
    if (!person) return
    const name = editName.trim()
    const email = editEmail.trim().toLowerCase()
    if (!name || !email) return
    const emailTaken = colleagues.some((c) => c.id !== id && (c.email || '').toLowerCase() === email)
    if (emailTaken) {
      setMessage('This email is already used by another user.')
      setTimeout(() => setMessage(null), 3000)
      return
    }
    const oldEmail = (person.email || '').toLowerCase()
    if (oldEmail !== email) {
      if (useApi) {
        api.setPassword(email, DEFAULT_PASSWORD).catch(console.error)
      } else {
        const passwords = getStoredPasswords()
        const pwd = passwords[oldEmail] ?? DEFAULT_PASSWORD
        passwords[email] = pwd
        delete passwords[oldEmail]
        localStorage.setItem(PASSWORDS_STORAGE_KEY, JSON.stringify(passwords))
      }
    }
    setColleagues((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, name, email, role: editRole, branch: editBranch } : c
      )
    )
    setEditingId(null)
    addAuditLog(`Updated user: ${name} (${email}), ${editRole}, ${editBranch}`)
    setMessage('User updated.')
    setTimeout(() => setMessage(null), 3000)
  }

  const startEditPayment = (c) => {
    setEditingPaymentId(c.id)
    setEditingPaymentAmount(String(c.amountPaid ?? 0))
  }

  const cancelEditPayment = () => {
    setEditingPaymentId(null)
    setEditingPaymentAmount('')
  }

  const savePayment = (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (editingPaymentId == null) return
    const amount = Math.max(0, Number(editingPaymentAmount) || 0)
    const person = colleagues.find((c) => c.id === editingPaymentId)
    setColleagues((prev) =>
      prev.map((c) => (c.id === editingPaymentId ? { ...c, amountPaid: amount } : c))
    )
    setEditingPaymentId(null)
    setEditingPaymentAmount('')
    addAuditLog(`Updated contribution: ${person?.name} → RM ${amount.toFixed(2)}`)
    setMessage('Amount updated.')
    setTimeout(() => setMessage(null), 3000)
  }

  const addSpending = (e) => {
    e.preventDefault()
    const description = newSpendingDesc.trim()
    const amount = Number(newSpendingAmount) || 0
    if (!description || amount <= 0) return
    setSpendings((prev) => [
      ...prev,
      { id: String(Date.now()), description, amount, branch: newSpendingBranch || undefined },
    ])
    setNewSpendingDesc('')
    setNewSpendingAmount('')
    setNewSpendingBranch('')
    addAuditLog(`Recorded spending: ${description} — RM ${amount.toFixed(2)}`)
    setMessage('Spending recorded.')
    setTimeout(() => setMessage(null), 3000)
  }

  const deleteSpending = (id) => {
    const s = spendings.find((x) => x.id === id)
    const desc = s?.description || 'This item'
    const amount = Number(s?.amount || 0).toFixed(2)
    if (!window.confirm(`Remove spending "${desc}" (RM ${amount})? This cannot be undone.`)) return
    setSpendings((prev) => prev.filter((s) => s.id !== id))
    addAuditLog(`Removed spending: ${desc} — RM ${amount}`)
    setMessage('Spending removed.')
    setTimeout(() => setMessage(null), 3000)
  }

  const startEditOpeningBalance = () => {
    setEditingOpeningBalance(true)
    setOpeningBalanceInput(String(openingBalance))
  }

  const saveOpeningBalance = (e) => {
    e?.preventDefault?.()
    const value = Math.max(0, Number(openingBalanceInput) || 0)
    setOpeningBalance(value)
    setEditingOpeningBalance(false)
    setOpeningBalanceInput('')
    addAuditLog(`Updated opening balance (last year): RM ${value.toFixed(2)}`)
    setMessage('Last year balance updated.')
    setTimeout(() => setMessage(null), 3000)
  }

  const cancelEditOpeningBalance = () => {
    setEditingOpeningBalance(false)
    setOpeningBalanceInput('')
  }

  const addGame = (e) => {
    e.preventDefault()
    const name = gameName.trim()
    if (!name) return
    if (gameType === 'culling' && !isCullingGameAvailable()) {
      setMessage('Culling game is available from June 2026.')
      setTimeout(() => setMessage(null), 4000)
      return
    }
    setGames((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name,
        type: gameType,
        active: true,
        description: gameDescription.trim() || '',
        date: gameDate.trim() || '',
        participants: [],
        pointsPerJoin: gameType === 'standard' ? Math.max(0, Number(gameStandardPoints)) || 0 : undefined,
        pointsPerScan: gameType === 'standard' || gameType === 'guess' ? 0 : Math.max(0, Number(gamePointsPerScan) || 10),
        scannedBy: [],
        guessQuestion: gameType === 'guess' ? (gameGuessQuestion || '').trim() : '',
        guessAnswers: gameType === 'guess' ? {} : undefined,
        guessCorrectAnswer: gameType === 'guess' ? (gameGuessCorrectAnswer || '').trim() : '',
        guessPointsJoin: gameType === 'guess' ? Math.max(0, Number(gameGuessPointsJoin)) || 1 : undefined,
        guessPointsCorrect: gameType === 'guess' ? Math.max(0, Number(gameGuessPointsCorrect)) || 1 : undefined,
      },
    ])
    setGameName('')
    setGameDescription('')
    setGameDate('')
    setGameType('standard')
    setGameStandardPoints(0)
    setGamePointsPerScan(10)
    setGameGuessQuestion('')
    setGameGuessCorrectAnswer('')
    setGameGuessPointsJoin(1)
    setGameGuessPointsCorrect(1)
    addAuditLog(`Created game: ${name} (${gameType})`)
    setMessage(gameType === 'standard' ? 'Game created. Users scan the QR to join.' : gameType === 'guess' ? 'Game created. Users scan to join and submit their answer.' : 'Game created. Users scan the QR to earn points.')
    setTimeout(() => setMessage(null), 3000)
  }

  const joinGame = (gameId) => {
    const email = auth?.userEmail
    if (!email) return
    const game = games.find((g) => g.id === gameId)
    if (game && game.active === false) {
      setMessage('This game is no longer active. You cannot join.')
      setTimeout(() => setMessage(null), 3000)
      return
    }
    const participants = game?.participants || []
    if (participants.includes(email)) {
      const isGuess = (game?.type || '') === 'guess'
      const guessAnswers = game?.guessAnswers || {}
      if (isGuess && (guessAnswers[email] === undefined || guessAnswers[email] === '')) {
        setShowingGuessFormForGameId(gameId)
        setMessage('Submit your answer to complete your participation.')
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage('You have already joined this game.')
        setTimeout(() => setMessage(null), 3000)
      }
      return
    }
    setGames((prev) =>
      prev.map((g) => {
        if (g.id !== gameId) return g
        const nextParticipants = [...(g.participants || []), email]
        const isGuess = (g.type || '') === 'guess'
        const nextScannedBy = isGuess ? [...(g.scannedBy || []), email] : (g.scannedBy || [])
        return { ...g, participants: nextParticipants, scannedBy: nextScannedBy }
      })
    )
    const isGuess = (game?.type || '') === 'guess'
    const joinPts = isGuess
      ? Math.max(0, Number(game?.guessPointsJoin)) || 0
      : (game?.type || 'standard') === 'standard'
        ? Math.max(0, Number(game?.pointsPerJoin)) || 0
        : 0
    setColleagues((prev) =>
      prev.map((c) =>
        (c.email || '').toLowerCase() === email.toLowerCase()
          ? {
              ...c,
              points: (c.points || 0) + joinPts,
              gameHistory: [...(c.gameHistory || []), { gameId, gameName: game?.name || 'Game', points: joinPts }],
            }
          : c
      )
    )
    if (isGuess) {
      setShowingGuessFormForGameId(gameId)
      const correctPts = Math.max(0, Number(game?.guessPointsCorrect)) || 1
      setMessage(joinPts > 0 ? `You joined! +${joinPts} point(s) for participating. Read the details, submit your answer — correct answer earns ${correctPts} more.` : `You joined! Read the details and submit your answer — correct answer earns ${correctPts} point(s).`)
    } else {
      setMessage(joinPts > 0 ? `You have joined the game. +${joinPts} point(s) added to your game history.` : 'You have joined the game. It has been added to your game history.')
    }
    setTimeout(() => setMessage(null), 5000)
  }

  const leaveGame = (gameId) => {
    const email = auth?.userEmail
    if (!email) return
    setGames((prev) =>
      prev.map((g) =>
        g.id === gameId
          ? { ...g, participants: (g.participants || []).filter((e) => e !== email) }
          : g
      )
    )
    setMessage('You have left the game.')
    setTimeout(() => setMessage(null), 3000)
  }

  const setGameActive = (gameId, active) => {
    const game = games.find((g) => g.id === gameId)
    if (!game) return
    setGames((prev) => prev.map((g) => (g.id === gameId ? { ...g, active } : g)))
    addAuditLog(`${game.name} set to ${active ? 'active' : 'inactive'}`)
    setMessage(active ? 'Game is now active. Users can join again.' : 'Game is now inactive. Users cannot join.')
    setTimeout(() => setMessage(null), 3000)
  }

  const deleteGame = (gameId) => {
    const game = games.find((g) => g.id === gameId)
    const name = game?.name || 'this game'
    if (!window.confirm(`Remove game "${name}"? All participants and points for this game will be lost. This cannot be undone.`)) return
    setGames((prev) => prev.filter((g) => g.id !== gameId))
    addAuditLog(`Removed game: ${name}`)
    setMessage('Game removed.')
    setTimeout(() => setMessage(null), 3000)
  }

  const getColleagueNameByEmail = (email) => {
    const c = colleagues.find((col) => (col.email || '').toLowerCase() === (email || '').toLowerCase())
    return c?.name || email
  }

  const formatGameDate = (dateStr) => {
    if (!dateStr || !dateStr.trim()) return ''
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const handleChangePassword = (e) => {
    e.preventDefault()
    setChangePwMessage(null)
    if (changePwNew.length < 6) {
      setChangePwMessage('New password must be at least 6 characters.')
      return
    }
    if (changePwNew !== changePwConfirm) {
      setChangePwMessage('New passwords do not match.')
      return
    }
    if (useApi) {
      api
        .login(auth.userEmail, changePwCurrent)
        .then(() => api.setPassword(auth.userEmail, changePwNew))
        .then(() => {
          setChangePwCurrent('')
          setChangePwNew('')
          setChangePwConfirm('')
          addAuditLog('Changed password', auth.userEmail)
          setChangePwMessage('Password updated. Use your new password next time you log in.')
          setTimeout(() => setChangePwMessage(null), 4000)
        })
        .catch(() => setChangePwMessage('Current password is incorrect.'))
      return
    }
    const passwords = getStoredPasswords()
    const current = passwords[auth.userEmail] ?? DEFAULT_PASSWORD
    if (changePwCurrent !== current) {
      setChangePwMessage('Current password is incorrect.')
      return
    }
    passwords[auth.userEmail] = changePwNew
    localStorage.setItem(PASSWORDS_STORAGE_KEY, JSON.stringify(passwords))
    setChangePwCurrent('')
    setChangePwNew('')
    setChangePwConfirm('')
    addAuditLog('Changed password', auth.userEmail)
    setChangePwMessage('Password updated. Use your new password next time you log in.')
    setTimeout(() => setChangePwMessage(null), 4000)
  }

  const handleChangeEmail = (e) => {
    e.preventDefault()
    setProfileEmailMessage(null)
    const trimmed = profileNewEmail.trim().toLowerCase()
    if (!trimmed) {
      setProfileEmailMessage('Please enter a new email address.')
      return
    }
    const oldEmail = (auth?.userEmail || '').toLowerCase()
    if (trimmed === oldEmail) {
      setProfileEmailMessage('New email is the same as current email.')
      return
    }
    const doUpdate = (currentPassword) => {
      if (useApi) {
        api
          .setPassword(trimmed, currentPassword)
          .catch(console.error)
      } else {
        const passwords = getStoredPasswords()
        passwords[trimmed] = currentPassword
        delete passwords[oldEmail]
        localStorage.setItem(PASSWORDS_STORAGE_KEY, JSON.stringify(passwords))
      }
    }
    if (useApi) {
      api
        .login(oldEmail, profileEmailPassword)
        .then(() => {
          doUpdate(profileEmailPassword)
          if (isAdmin) {
            setAuth((a) => (a ? { ...a, userEmail: trimmed } : null))
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ userEmail: trimmed, isAdmin: true }))
            addAuditLog(`Admin changed email to ${trimmed}`, oldEmail)
          } else {
            const currentColleague = colleagues.find((c) => (c.email || '').toLowerCase() === oldEmail)
            const taken = colleagues.some((c) => c.id !== currentColleague?.id && (c.email || '').toLowerCase() === trimmed)
            if (taken) {
              setProfileEmailMessage('This email is already in use.')
              return
            }
            setColleagues((prev) =>
              prev.map((c) => ((c.email || '').toLowerCase() === oldEmail ? { ...c, email: trimmed } : c))
            )
            setGames((prev) =>
              prev.map((g) => ({
                ...g,
                participants: (g.participants || []).map((em) => (em.toLowerCase() === oldEmail ? trimmed : em)),
                scannedBy: (g.scannedBy || []).map((em) => (em.toLowerCase() === oldEmail ? trimmed : em)),
                guessAnswers: g.guessAnswers && typeof g.guessAnswers === 'object'
                  ? Object.fromEntries(Object.entries(g.guessAnswers).map(([em, ans]) => [em.toLowerCase() === oldEmail ? trimmed : em, ans]))
                  : {},
              }))
            )
            setAuth((a) => (a ? { ...a, userEmail: trimmed } : null))
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ userEmail: trimmed, isAdmin: false }))
            addAuditLog(`Changed email to ${trimmed}`, oldEmail)
          }
          setProfileNewEmail('')
          setProfileEmailPassword('')
          setProfileEmailMessage('Email updated. You are now signed in with your new email.')
          setMessage('Email updated.')
          setTimeout(() => { setMessage(null); setProfileEmailMessage(null) }, 4000)
        })
        .catch(() => setProfileEmailMessage('Current password is incorrect.'))
      return
    }
    const passwords = getStoredPasswords()
    const currentPassword = passwords[oldEmail] ?? DEFAULT_PASSWORD
    if (profileEmailPassword !== currentPassword) {
      setProfileEmailMessage('Current password is incorrect.')
      return
    }
    if (isAdmin) {
      doUpdate(currentPassword)
      setAuth((a) => (a ? { ...a, userEmail: trimmed } : null))
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ userEmail: trimmed, isAdmin: true }))
      addAuditLog(`Admin changed email to ${trimmed}`, oldEmail)
      setProfileNewEmail('')
      setProfileEmailPassword('')
      setProfileEmailMessage('Email updated. You are now signed in with your new email.')
      setMessage('Email updated.')
      setTimeout(() => { setMessage(null); setProfileEmailMessage(null) }, 4000)
      return
    }
    const currentColleague = colleagues.find((c) => (c.email || '').toLowerCase() === oldEmail)
    const taken = colleagues.some((c) => c.id !== currentColleague?.id && (c.email || '').toLowerCase() === trimmed)
    if (taken) {
      setProfileEmailMessage('This email is already in use.')
      return
    }
    const colleagueIndex = colleagues.findIndex((c) => (c.email || '').toLowerCase() === oldEmail)
    if (colleagueIndex === -1) {
      setProfileEmailMessage('Could not find your account. Please try again.')
      return
    }
    doUpdate(currentPassword)
    setColleagues((prev) =>
      prev.map((c) => ((c.email || '').toLowerCase() === oldEmail ? { ...c, email: trimmed } : c))
    )
    setGames((prev) =>
      prev.map((g) => ({
        ...g,
        participants: (g.participants || []).map((em) => (em.toLowerCase() === oldEmail ? trimmed : em)),
        scannedBy: (g.scannedBy || []).map((em) => (em.toLowerCase() === oldEmail ? trimmed : em)),
        guessAnswers: g.guessAnswers && typeof g.guessAnswers === 'object'
          ? Object.fromEntries(Object.entries(g.guessAnswers).map(([em, ans]) => [em.toLowerCase() === oldEmail ? trimmed : em, ans]))
          : {},
      }))
    )
    setAuth((a) => (a ? { ...a, userEmail: trimmed } : null))
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ userEmail: trimmed, isAdmin: false }))
    addAuditLog(`Changed email to ${trimmed}`, oldEmail)
    setProfileNewEmail('')
    setProfileEmailPassword('')
    setProfileEmailMessage('Email updated. You are now signed in with your new email.')
    setMessage('Email updated.')
    setTimeout(() => { setMessage(null); setProfileEmailMessage(null) }, 4000)
  }

  const isStaging = import.meta.env.VITE_APP_ENV === 'preview'

  return (
    <div className="app">
      {isStaging && (
        <div className="env-banner env-banner--staging" role="status">
          Staging environment — for testing only
        </div>
      )}
      <div className="header-wrapper">
        <header className="header">
          <div className="header-inner">
            <div>
              <h1><Trophy size={28} strokeWidth={2} className="header-icon" /> MSC & CTSB SPORTS</h1>
            </div>
            {isLoggedIn ? (
              <button type="button" className="logout-btn" onClick={handleLogout}>
                <LogOut size={18} /> Log out
              </button>
            ) : (
              <a href="#login" className="logout-btn login-nav-btn">
                <LogIn size={18} /> Log in
              </a>
            )}
          </div>
        </header>

        <nav className="main-nav" aria-label="Main navigation">
          <div className="main-nav-inner">
            <button
              type="button"
              className="nav-menu-toggle"
              onClick={() => setNavOpen((o) => !o)}
              aria-expanded={navOpen}
              aria-label={navOpen ? 'Close menu' : 'Open menu'}
            >
              <Menu size={24} aria-hidden />
            </button>
            <div className={`nav-links ${navOpen ? 'nav-links-open' : ''}`}>
              <a href="#leaderboard" className={currentPage === 'leaderboard' ? 'active' : ''} onClick={() => setNavOpen(false)}><LayoutDashboard size={18} /> Leaderboard</a>
              {isLoggedIn && (
                <>
                  {isAdmin && <a href="#people" className={currentPage === 'people' ? 'active' : ''} onClick={() => setNavOpen(false)}><Users size={18} /> People</a>}
                  {(isAdmin || canAccessCollection) && <a href="#collection" className={currentPage === 'collection' ? 'active' : ''} onClick={() => setNavOpen(false)}><Wallet size={18} /> Collection</a>}
                  <a href="#games" className={currentPage === 'games' ? 'active' : ''} onClick={() => setNavOpen(false)}><Gamepad2 size={18} /> Games</a>
                  <a href="#culling" className={currentPage === 'culling' ? 'active' : ''} onClick={() => { setCurrentPage('culling'); setNavOpen(false); }}><PocketKnife size={18} /> Culling game</a>
                  <a href="#profile" className={currentPage === 'profile' ? 'active' : ''} onClick={() => setNavOpen(false)}><UserCircle size={18} /> Profile</a>
                  {isAdmin && <a href="#settings" className={currentPage === 'settings' ? 'active' : ''} onClick={() => setNavOpen(false)}><ClipboardList size={18} /> Audit log</a>}
                </>
              )}
            </div>
          </div>
        </nav>
      </div>

      {message && (
        <div className="toast" role="status" aria-live="polite" aria-atomic="true">
          <Sparkles size={18} /> {message}
        </div>
      )}

      {showingGuessFormForGameId && (() => {
        const game = games.find((g) => g.id === showingGuessFormForGameId)
        if (!game) return null
        const joinPts = Math.max(0, Number(game.guessPointsJoin)) || 0
        const correctPts = Math.max(0, Number(game.guessPointsCorrect)) || 1
        return (
          <div className="guess-form-overlay" role="dialog" aria-labelledby="guess-form-title" onClick={(e) => { if (e.target === e.currentTarget) { setShowingGuessFormForGameId(null); setGuessAnswerInput('') } }}>
            <div className="guess-form-card" onClick={(e) => e.stopPropagation()}>
              <div className="guess-form-header">
                <div className="guess-form-title-row">
                  <span className="guess-form-badge">Guess game</span>
                  <h2 id="guess-form-title">{game.name}</h2>
                </div>
                <button type="button" className="guess-form-close" onClick={() => { setShowingGuessFormForGameId(null); setGuessAnswerInput('') }} aria-label="Close"><X size={20} /></button>
              </div>
              <div className="guess-form-points">
                <span className="guess-form-points-pill guess-form-points-join"><Coins size={14} /> {joinPts} pt{joinPts !== 1 ? 's' : ''} for participating</span>
                <span className="guess-form-points-pill guess-form-points-correct"><Sparkles size={14} /> +{correctPts} pt{correctPts !== 1 ? 's' : ''} if correct</span>
              </div>
              <p className="guess-form-desc">Read the details and question below, then type your answer and submit.</p>
              {game.description && (
                <div className="guess-form-details-box">
                  <p className="guess-form-details">{game.description}</p>
                </div>
              )}
              {game.guessQuestion && (
                <div className="guess-form-question-box">
                  <p className="guess-form-question-label"><HelpCircle size={16} /> Question</p>
                  <p className="guess-form-question">{game.guessQuestion}</p>
                </div>
              )}
              <form onSubmit={submitGuessAnswer} className="guess-form-form">
                <label htmlFor="guess-answer" className="guess-form-answer-label">Your answer</label>
                <input
                  id="guess-answer"
                  type="text"
                  className="guess-form-input"
                  placeholder="Type your answer here..."
                  value={guessAnswerInput}
                  onChange={(e) => setGuessAnswerInput(e.target.value)}
                  required
                  autoFocus
                />
                <div className="guess-form-actions">
                  <button type="submit" className="guess-form-submit"><Sparkles size={16} /> Submit my answer</button>
                  <button type="button" className="guess-form-cancel" onClick={() => { setShowingGuessFormForGameId(null); setGuessAnswerInput('') }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )
      })()}

      <main className="main-content">
      {!isLoggedIn && currentPage === 'login' && (
        <div className="login-page-wrap">
          <div className="login-card">
            <h1 className="login-title"><Trophy size={36} strokeWidth={2} className="login-title-icon" /> MSC & CTSB SPORTS</h1>
            <form onSubmit={handleLogin} className="login-form">
              <div className="field">
                <label htmlFor="login-email"><Mail size={16} className="label-icon" /> Email</label>
                <input
                  id="login-email"
                  type="email"
                  placeholder="you@company.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="field">
                <label htmlFor="login-password"><Lock size={16} className="label-icon" /> Password</label>
                <div className="password-wrap">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              {loginError && <p className="login-error">{loginError}</p>}
              <div className="submit-wrap">
                <button type="submit"><LogIn size={18} /> Log in</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {currentPage === 'people' && isAdmin && (
      <section className="manage-people section-card section-card--people">
        <h2><span className="icon-wrap"><Users size={22} /></span> Manage people</h2>
        <p className="section-desc">Add people to the system. They can log in with their email (default password: P@ssw0rd) and will appear on the leaderboard.</p>
        <form className="form-card add-person-form" onSubmit={addPerson}>
          <h3><UserPlus size={18} className="icon-inline" /> Add person</h3>
          <div className="field">
            <label htmlFor="new-name">Name</label>
            <input
              id="new-name"
              type="text"
              placeholder="Full name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="new-email">Email (for login)</label>
            <input
              id="new-email"
              type="email"
              placeholder="e.g. name@cybersolution.com.my"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="new-role">Role</label>
            <select
              id="new-role"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="new-branch">Branch</label>
            <select
              id="new-branch"
              value={newBranch}
              onChange={(e) => setNewBranch(e.target.value)}
            >
              {BRANCHES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <p className="form-note">Default password: P@ssw0rd (they can change it after first login)</p>
          <button type="submit"><UserPlus size={17} /> Add to system</button>
        </form>
      </section>
      )}

      {currentPage === 'people' && isAdmin && (
      <section className="manage-users section-card section-card--people">
        <h2><span className="icon-wrap"><Users size={22} /></span> Manage users</h2>
        <p className="section-desc">Edit user details or set active/inactive. Inactive users are hidden from the leaderboard and cannot log in.</p>
        <div className="users-search-wrap">
          <Search size={18} className="users-search-icon" aria-hidden />
          <input
            type="search"
            className="users-search-input"
            placeholder="Search by name, email, role or branch..."
            value={userSearchQuery}
            onChange={(e) => setUserSearchQuery(e.target.value)}
            aria-label="Search users"
          />
        </div>
        <div className="users-table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Branch</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {colleagues
                .filter((c) => {
                  const q = (userSearchQuery || '').trim().toLowerCase()
                  if (!q) return true
                  const name = (c.name || '').toLowerCase()
                  const email = (c.email || '').toLowerCase()
                  const role = (c.role || '').toLowerCase()
                  const branch = (c.branch || '').toLowerCase()
                  return name.includes(q) || email.includes(q) || role.includes(q) || branch.includes(q)
                })
                .map((c) => (
                <tr key={c.id} className={c.active === false ? 'inactive-row' : ''}>
                  {editingId === c.id ? (
                    <>
                      <td colSpan={5} className="edit-cell">
                        <form id="edit-user-form" onSubmit={saveEdit} className="edit-user-form">
                          <div className="edit-fields">
                            <div className="field">
                              <label>Name</label>
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                required
                              />
                            </div>
                            <div className="field">
                              <label>Email</label>
                              <input
                                type="email"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                                required
                              />
                            </div>
                            <div className="field">
                              <label>Role</label>
                              <select value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                              </select>
                            </div>
                            <div className="field">
                              <label>Branch</label>
                              <select value={editBranch} onChange={(e) => setEditBranch(e.target.value)}>
                                {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                              </select>
                            </div>
                          </div>
                        </form>
                      </td>
                      <td>
                        <button type="submit" form="edit-user-form" className="btn-sm btn-edit"><Pencil size={14} /> Save</button>
                        <button type="button" className="btn-sm btn-toggle" onClick={cancelEdit}>Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{c.name}</td>
                      <td>{c.email}</td>
                      <td>{c.role}</td>
                      <td>{c.branch}</td>
                      <td>
                        <span className={`status-badge ${c.active !== false ? 'active' : 'inactive'}`}>
                          {c.active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <button type="button" className="btn-sm btn-edit" onClick={() => startEdit(c)}><Pencil size={14} /> Edit</button>
                        <button
                          type="button"
                          className="btn-sm btn-toggle"
                          onClick={() => toggleActive(c.id)}
                        >
                          {c.active !== false ? 'Set inactive' : 'Set active'}
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {currentPage === 'profile' && auth?.userEmail && (
        <>
          <section className="profile-details section-card section-card--people">
            <h2><span className="icon-wrap"><UserCircle size={22} /></span> My profile</h2>
            <p className="section-desc">Your account details.</p>
            <div className="profile-details-grid">
              {isAdmin ? (
                <>
                  <div className="profile-detail-row">
                    <span className="profile-detail-label">Email</span>
                    <span className="profile-detail-value">{auth.userEmail}</span>
                  </div>
                  <div className="profile-detail-row">
                    <span className="profile-detail-label">Role</span>
                    <span className="profile-detail-value">Admin</span>
                  </div>
                </>
              ) : (() => {
                const me = colleagues.find((c) => (c.email || '').toLowerCase() === (auth.userEmail || '').toLowerCase())
                if (!me) return null
                return (
                  <>
                    <div className="profile-detail-row">
                      <span className="profile-detail-label">Name</span>
                      <span className="profile-detail-value">{me.name}</span>
                    </div>
                    <div className="profile-detail-row">
                      <span className="profile-detail-label">Email</span>
                      <span className="profile-detail-value">{me.email}</span>
                    </div>
                    <div className="profile-detail-row">
                      <span className="profile-detail-label">Role</span>
                      <span className="profile-detail-value">{me.role}</span>
                    </div>
                    <div className="profile-detail-row">
                      <span className="profile-detail-label">Branch</span>
                      <span className="profile-detail-value">{me.branch}</span>
                    </div>
                    <div className="profile-detail-row">
                      <span className="profile-detail-label">Points</span>
                      <span className="profile-detail-value">{me.points ?? 0} pts</span>
                    </div>
                  </>
                )
              })()}
            </div>
          </section>

          <section className="change-email section-card section-card--people">
            <h2><span className="icon-wrap"><Mail size={22} /></span> Change email</h2>
            <p className="section-desc">Update your login email. You will stay signed in with the new email.</p>
            <form className="form-card add-person-form" onSubmit={handleChangeEmail}>
                <div className="field">
                  <label htmlFor="current-email">Current email</label>
                  <input id="current-email" type="email" value={auth.userEmail} readOnly disabled className="input-readonly" />
                </div>
                <div className="field">
                  <label htmlFor="profile-new-email">New email</label>
                  <input
                    id="profile-new-email"
                    type="email"
                    placeholder="you@company.com"
                    value={profileNewEmail}
                    onChange={(e) => setProfileNewEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="profile-email-password">Current password</label>
                  <input
                    id="profile-email-password"
                    type="password"
                    placeholder="Enter your password to confirm"
                    value={profileEmailPassword}
                    onChange={(e) => setProfileEmailPassword(e.target.value)}
                    required
                  />
                </div>
                {profileEmailMessage && (
                  <p className={profileEmailMessage.startsWith('Email updated') ? 'form-success' : 'login-error'}>{profileEmailMessage}</p>
                )}
                <button type="submit"><Mail size={17} /> Update email</button>
              </form>
            </section>
          <section className="change-password section-card section-card--people">
            <h2><span className="icon-wrap"><Lock size={22} /></span> Password</h2>
            <p className="section-desc">Change your password. You will need the new password next time you log in.</p>
            <form className="form-card add-person-form" onSubmit={handleChangePassword}>
              <div className="field">
                <label htmlFor="cp-current">Current password</label>
                <input
                  id="cp-current"
                  type="password"
                  value={changePwCurrent}
                  onChange={(e) => setChangePwCurrent(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="cp-new">New password</label>
                <input
                  id="cp-new"
                  type="password"
                  value={changePwNew}
                  onChange={(e) => setChangePwNew(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="cp-confirm">Confirm new password</label>
                <input
                  id="cp-confirm"
                  type="password"
                  value={changePwConfirm}
                  onChange={(e) => setChangePwConfirm(e.target.value)}
                  required
                />
              </div>
              {changePwMessage && (
                <p className={changePwMessage.startsWith('Password updated') ? 'form-success' : 'login-error'}>{changePwMessage}</p>
              )}
              <button type="submit"><Lock size={17} /> Update password</button>
            </form>
          </section>
        </>
      )}

      {currentPage === 'settings' && isAdmin && (
      <section className="audit-log-section section-card section-card--audit">
        <h2><span className="icon-wrap"><ClipboardList size={22} /></span> Audit log</h2>
        <p className="section-desc">Recent actions in the system (newest first).</p>
        {auditLog.length === 0 ? (
          <p className="section-desc muted">No entries yet.</p>
        ) : (
          <div className="users-table-wrap audit-log-wrap">
            <table className="users-table audit-log-table">
              <thead>
                <tr>
                  <th>Date &amp; time</th>
                  <th>User</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.slice(0, 100).map((entry) => (
                  <tr key={entry.id}>
                    <td className="audit-time">
                      {new Date(entry.timestamp).toLocaleString('en-MY', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="audit-user">{entry.userEmail}</td>
                    <td className="audit-message">{entry.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {auditLog.length > 100 && (
          <p className="section-desc muted">Showing latest 100 of {auditLog.length} entries.</p>
        )}
      </section>
      )}

      {currentPage === 'culling' && (
      <section className="culling-coming-soon section-card section-card--games">
        <h2><span className="icon-wrap"><PocketKnife size={22} /></span> Culling game</h2>
        <div className="coming-soon-state">
          <PocketKnife size={56} className="coming-soon-icon" strokeWidth={1.5} aria-hidden />
          <p className="coming-soon-headline">Coming June 2026</p>
          <p className="coming-soon-desc">The culling game will be available here from June 2026. Scan game QR codes to earn points when it launches.</p>
        </div>
      </section>
      )}

      {currentPage === 'collection' && canAccessCollection && (() => {
        const currentYear = new Date().getFullYear()
        const previousYear = currentYear - 1
        return (
      <section className="collection-spending section-card section-card--money">
        <h2><span className="icon-wrap"><Wallet size={22} /></span> Collection &amp; spending</h2>
        <p className="section-desc">When a person contributes (employee), the employer adds the same amount. Record each person&apos;s contribution; total collection = employee + employer. The opening balance is the previous year&apos;s closing balance—update it at the start of each new year.</p>

        <div className="opening-balance-row">
          <div className="summary-card opening-balance-card">
            <span className="summary-label">Previous year ({previousYear}) — opening balance</span>
            {editingOpeningBalance ? (
              <form onSubmit={saveOpeningBalance} className="opening-balance-form">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={openingBalanceInput}
                  onChange={(e) => setOpeningBalanceInput(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                />
                <div className="opening-balance-actions">
                  <button type="submit">Save</button>
                  <button type="button" onClick={cancelEditOpeningBalance}>Cancel</button>
                </div>
              </form>
            ) : (
              <>
                <span className="summary-value">RM {(openingBalance || 0).toFixed(2)}</span>
                <button type="button" className="btn-sm btn-edit" onClick={startEditOpeningBalance}>
                  Edit
                </button>
              </>
            )}
          </div>
        </div>

        <div className="summary-cards">
          <div className="summary-card">
            <span className="summary-label">Total collection {currentYear} (Employee + Employer)</span>
            <span className="summary-value collected">RM {totalCollectionThisYear.toFixed(2)}</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Total spent</span>
            <span className="summary-value spent">RM {totalSpent.toFixed(2)}</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Balance</span>
            <span className={`summary-value ${balance >= 0 ? 'balance-ok' : 'balance-neg'}`}>
              RM {balance.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="finance-report-section">
          <h3>Finance report</h3>
          <p className="section-desc">Collection for {currentYear} (employee + employer match) by branch. Opening balance is from {previousYear}. All amounts in RM.</p>
          <div className="finance-report-wrap">
            <table className="finance-report-table">
              <thead>
                <tr>
                  <th rowSpan={2} className="finance-th-branch">BRANCH</th>
                  <th rowSpan={2} className="finance-th-month">MONTH</th>
                  {BRANCHES.map((b) => (
                    <th key={b} colSpan={2} className="finance-th-branch-col">{BRANCH_LABELS[b] || b}</th>
                  ))}
                  <th rowSpan={2} className="finance-th-total">TOTAL AMOUNT (RM)</th>
                </tr>
                <tr>
                  {BRANCHES.flatMap((b) => [
                    <th key={`${b}-emp`} className="finance-th-sub">EMPLOYEE</th>,
                    <th key={`${b}-er`} className="finance-th-sub">EMPLOYER</th>,
                  ])}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const collectionByBranch = BRANCHES.map((branch) =>
                    colleagues.filter((c) => (c.branch || '') === branch).reduce((sum, c) => sum + (Number(c.amountPaid) || 0), 0)
                  )
                  const spendingByBranch = BRANCHES.map((branch) =>
                    spendings.filter((s) => (s.branch || '') === branch).reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
                  )
                  const totalCol = (Number(openingBalance) || 0) + totalCollectionThisYear
                  const fmt = (n) => (n == null || Number.isNaN(n) ? '—' : `RM ${(Number(n)).toFixed(2)}`)
                  const fmtNum = (n) => (n == null || Number.isNaN(n) ? '—' : (Number(n)).toFixed(2))
                  const empErCells = (getVal) => BRANCHES.flatMap((_, i) => [
                    <td key={`${i}-e`} className="finance-num">{fmtNum(getVal(i))}</td>,
                    <td key={`${i}-r`} className="finance-num">{fmtNum(getVal(i))}</td>,
                  ])
                  return (
                    <>
                      <tr>
                        <td></td>
                        <td className="finance-row-label">Total Collection {currentYear}</td>
                        {empErCells((i) => collectionByBranch[i])}
                        <td className="finance-num finance-total">{fmt(totalCollectionThisYear)}</td>
                      </tr>
                      <tr>
                        <td></td>
                        <td className="finance-row-label">Previous year ({previousYear}) — opening balance</td>
                        {BRANCHES.flatMap((_, i) => [<td key={`24-e${i}`} className="finance-num">—</td>, <td key={`24-r${i}`} className="finance-num">—</td>])}
                        <td className="finance-num finance-total">{fmt(openingBalance)}</td>
                      </tr>
                      <tr className="finance-row-total">
                        <td></td>
                        <td className="finance-row-label"><strong>TOTAL COLLECTION</strong></td>
                        {empErCells((i) => collectionByBranch[i])}
                        <td className="finance-num finance-total"><strong>{fmt(totalCol)}</strong></td>
                      </tr>
                      <tr>
                        <td></td>
                        <td className="finance-row-label">SPENDING</td>
                        {BRANCHES.map((_, i) => (
                          <td key={`s${i}`} colSpan={2} className="finance-num">
                            {spendingByBranch[i] > 0 ? fmt(spendingByBranch[i]) : '—'}
                          </td>
                        ))}
                        <td className="finance-num finance-total">{fmt(totalSpent)}</td>
                      </tr>
                      <tr className="finance-row-total">
                        <td></td>
                        <td className="finance-row-label"><strong>BALANCE</strong></td>
                        {BRANCHES.map((_, i) => (
                          <td key={`b${i}`} colSpan={2} className="finance-num">
                            <strong>{fmt(2 * collectionByBranch[i] - spendingByBranch[i])}</strong>
                          </td>
                        ))}
                        <td className="finance-num finance-total"><strong>{fmt(balance)}</strong></td>
                      </tr>
                    </>
                  )
                })()}
              </tbody>
            </table>
          </div>
        </div>

        <div className="contributions-section">
          <h3>Per-person contributions</h3>
          <p className="section-desc">Enter each person&apos;s contribution (employee) for {currentYear}. The employer adds the same amount, so total collection from them is double. At the start of a new year, update the opening balance above to the previous year&apos;s balance, then continue recording as usual.</p>
          <div className="contribution-filters">
            <div className="users-search-wrap contribution-search-wrap">
              <Search size={18} className="users-search-icon" aria-hidden />
              <input
                type="search"
                className="users-search-input"
                placeholder="Search by name or email..."
                value={contributionSearchQuery}
                onChange={(e) => setContributionSearchQuery(e.target.value)}
                aria-label="Search contributions list"
              />
            </div>
            <div className="contribution-branch-filter">
              <label htmlFor="contribution-branch-filter" className="contribution-filter-label">Branch</label>
              <select
                id="contribution-branch-filter"
                value={contributionBranchFilter}
                onChange={(e) => setContributionBranchFilter(e.target.value)}
                className="contribution-branch-select"
                aria-label="Filter contributions by branch"
              >
                <option value="">All branches</option>
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Branch</th>
                  <th>Employee contribution (RM)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {colleagues
                  .filter((c) => {
                    if (contributionBranchFilter && (c.branch || '') !== contributionBranchFilter) return false
                    const q = (contributionSearchQuery || '').trim().toLowerCase()
                    if (!q) return true
                    const name = (c.name || '').toLowerCase()
                    const email = (c.email || '').toLowerCase()
                    return name.includes(q) || email.includes(q)
                  })
                  .map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.branch || '—'}</td>
                    <td>
                      {editingPaymentId === c.id ? (
                        <div className="inline-payment-form">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editingPaymentAmount}
                            onChange={(e) => setEditingPaymentAmount(e.target.value)}
                            placeholder="0.00"
                            autoFocus
                            aria-label="Employee contribution amount"
                          />
                        </div>
                      ) : (
                        <span className="amount-paid">{(c.amountPaid ?? 0).toFixed(2)}</span>
                      )}
                    </td>
                    <td>
                      {editingPaymentId === c.id ? (
                        <>
                          <button type="button" className="btn-sm btn-edit" onClick={savePayment}>Save</button>
                          <button type="button" className="btn-sm btn-toggle" onClick={cancelEditPayment}>Cancel</button>
                        </>
                      ) : (
                        <button type="button" className="btn-sm btn-edit" onClick={() => startEditPayment(c)}>
                          <Pencil size={14} /> Update
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="spendings-section">
          <h3>Record spending</h3>
          <form className="form-card add-person-form" onSubmit={addSpending}>
            <div className="field">
              <label htmlFor="spending-desc">What was the money spent on?</label>
              <input
                id="spending-desc"
                type="text"
                placeholder="e.g. Team lunch, Office supplies"
                value={newSpendingDesc}
                onChange={(e) => setNewSpendingDesc(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="spending-amount">Amount (RM)</label>
              <input
                id="spending-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={newSpendingAmount}
                onChange={(e) => setNewSpendingAmount(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="spending-branch">Branch (for report)</label>
              <select
                id="spending-branch"
                value={newSpendingBranch}
                onChange={(e) => setNewSpendingBranch(e.target.value)}
              >
                <option value="">— Unallocated —</option>
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <button type="submit"><Wallet size={17} /> Add spending</button>
          </form>

          <h4>Spending history</h4>
          {spendings.length === 0 ? (
            <p className="section-desc">No spending recorded yet.</p>
          ) : (
            <div className="users-table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Branch</th>
                    <th>Amount (RM)</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {spendings.map((s) => (
                    <tr key={s.id}>
                      <td>{s.description}</td>
                      <td>{s.branch || '—'}</td>
                      <td>{Number(s.amount).toFixed(2)}</td>
                      <td>
                        <button type="button" className="btn-sm btn-remove" onClick={() => deleteSpending(s.id)}>
                          <Trash2 size={14} /> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
        )
      })()}

      {currentPage === 'games' && isAdmin && (
      <section className="create-game section-card section-card--games">
        <h2><span className="icon-wrap"><Gamepad2 size={22} /></span> Create game</h2>
        <p className="section-desc">Add a game held by the sport committee. Users can then participate.</p>
        <form className="form-card add-person-form" onSubmit={addGame}>
          <div className="field">
            <label htmlFor="game-name">Game name</label>
            <input
              id="game-name"
              type="text"
              placeholder="e.g. Futsal Tournament, Badminton League"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="game-desc">Description</label>
            <input
              id="game-desc"
              type="text"
              placeholder="Optional details"
              value={gameDescription}
              onChange={(e) => setGameDescription(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="game-type">Game type</label>
            <select
              id="game-type"
              value={gameType}
              onChange={(e) => setGameType(e.target.value)}
            >
              {GAME_TYPES.map(({ value, label }) => (
                <option
                  key={value}
                  value={value}
                  disabled={value === 'culling' && !isCullingGameAvailable()}
                  title={value === 'culling' && !isCullingGameAvailable() ? 'Available from June 2026' : ''}
                >
                  {label}{value === 'culling' && !isCullingGameAvailable() ? ' (from June 2026)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="game-date">Date</label>
            <input
              id="game-date"
              type="date"
              value={gameDate}
              onChange={(e) => setGameDate(e.target.value)}
            />
          </div>
          {gameType === 'standard' && (
            <div className="field">
              <label htmlFor="game-standard-pts">Points when joining</label>
              <input
                id="game-standard-pts"
                type="number"
                min="0"
                max="500"
                value={gameStandardPoints}
                onChange={(e) => setGameStandardPoints(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
          )}
          {gameType === 'guess' && (
            <>
              <div className="field">
                <label htmlFor="game-guess-question">Question (what participants will guess)</label>
                <input
                  id="game-guess-question"
                  type="text"
                  placeholder="e.g. Guess the final score, Who will win?"
                  value={gameGuessQuestion}
                  onChange={(e) => setGameGuessQuestion(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="game-guess-correct">Correct answer</label>
                <input
                  id="game-guess-correct"
                  type="text"
                  placeholder="The answer that awards points (see below)"
                  value={gameGuessCorrectAnswer}
                  onChange={(e) => setGameGuessCorrectAnswer(e.target.value)}
                />
              </div>
              <div className="field guess-points-row">
                <label htmlFor="game-guess-pts-join">Points for scan (join)</label>
                <input
                  id="game-guess-pts-join"
                  type="number"
                  min="0"
                  max="500"
                  value={gameGuessPointsJoin}
                  onChange={(e) => setGameGuessPointsJoin(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
              <div className="field">
                <label htmlFor="game-guess-pts-correct">Points for correct answer</label>
                <input
                  id="game-guess-pts-correct"
                  type="number"
                  min="0"
                  max="500"
                  value={gameGuessPointsCorrect}
                  onChange={(e) => setGameGuessPointsCorrect(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
            </>
          )}
          {gameType === 'culling' && (
            <div className="field">
              <label htmlFor="game-points">Points per scan</label>
              <input
                id="game-points"
                type="number"
                min="1"
                max="500"
                value={gamePointsPerScan}
                onChange={(e) => setGamePointsPerScan(Number(e.target.value) || 10)}
              />
            </div>
          )}
          <button type="submit"><Gamepad2 size={17} /> Create game</button>
        </form>
      </section>
      )}

      {currentPage === 'games' && (
      <section className="games-section section-card section-card--games">
        {selectedGameId && isAdmin ? (() => {
          const game = games.find((g) => g.id === selectedGameId)
          if (!game) return null
          const participants = game.participants || []
          return (
            <>
              <button type="button" className="btn-back-to-games" onClick={() => setSelectedGameId(null)}>
                <ArrowLeft size={18} /> Back to list
              </button>
              <div className="game-detail-view">
                <h2 className="game-detail-title">{game.name}</h2>
                <span className={`game-type-badge type-${game.type || 'standard'}`}>
                  {GAME_TYPES.find((t) => t.value === (game.type || 'standard'))?.label || 'Standard'}
                </span>
                {game.description && <p className="game-detail-desc">{game.description}</p>}
                {game.date && <p className="game-detail-date">{formatGameDate(game.date)}</p>}
                <div className="game-detail-qr">
                  <p className="game-qr-label">
                    {(game.type || 'standard') === 'standard' && (Math.max(0, Number(game.pointsPerJoin)) || 0) > 0 ? `Scan to join (${Math.max(0, Number(game.pointsPerJoin))} pt)` : 'Scan to join'}
                    {(game.type || 'standard') === 'guess' && `Scan to join (${Math.max(0, Number(game.guessPointsJoin)) || 1} pt) and answer (${Math.max(0, Number(game.guessPointsCorrect)) || 1} pt if correct)`}
                    {(game.type || 'standard') === 'culling' && `Scan to earn ${game.pointsPerScan ?? 10} points`}
                  </p>
                  <div className="game-detail-qr-wrap">
                    <QRCodeSVG value={getScanUrl(game.id)} size={200} level="M" />
                  </div>
                </div>
                {(game.type || 'standard') === 'guess' && game.guessQuestion && (
                  <p className="game-guess-question"><strong>Question:</strong> {game.guessQuestion}</p>
                )}
                {(game.type || 'standard') === 'guess' && (() => {
                  const answers = game.guessAnswers || {}
                  const entries = Object.entries(answers).filter(([, ans]) => ans !== undefined && String(ans).trim() !== '')
                  return (
                    <div className="game-guess-answers-admin">
                      <strong>Submitted answers (admin)</strong>
                      {game.guessCorrectAnswer != null && String(game.guessCorrectAnswer).trim() !== '' && (
                        <p className="game-correct-answer muted">Correct answer: <strong>{game.guessCorrectAnswer}</strong></p>
                      )}
                      {entries.length === 0 ? (
                        <p className="muted">No answers submitted yet.</p>
                      ) : (
                        <ul className="guess-answers-list">
                          {entries.map(([email, answer]) => (
                            <li key={email}>
                              <span className="guess-answer-user">{getColleagueNameByEmail(email)}</span>
                              <span className="guess-answer-value">{answer}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })()}
                <div className="game-participants">
                  <strong>Participants ({participants.length})</strong>
                  {participants.length === 0 ? (
                    <span className="muted">No one joined yet.</span>
                  ) : (
                    <ul>
                      {participants.map((email) => (
                        <li key={email}>{getColleagueNameByEmail(email)}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )
        })() : (
          <>
            <h2><span className="icon-wrap"><Gamepad2 size={22} /></span> Games by Sport Committee</h2>
            <p className="section-desc">Participate in games organised by the sport committee. Click &quot;Generate QR&quot; to open the game page with QR code.</p>
            {games.length === 0 ? (
              <div className="empty-state">
                <Sparkles size={40} className="empty-state-icon" strokeWidth={1.5} />
                <p className="empty-state-title">No games yet</p>
                <p className="empty-state-desc">Admins can create games above. Once added, you can join via the QR code and earn points.</p>
              </div>
            ) : (
              <>
                <div className="games-filter">
                  <label htmlFor="game-type-filter" className="games-filter-label">Filter by type</label>
                  <select
                    id="game-type-filter"
                    value={gameTypeFilter}
                    onChange={(e) => { setGameTypeFilter(e.target.value); setCurrentGamesPage(1) }}
                    className="games-filter-select"
                    aria-label="Filter games by type"
                  >
                    <option value="">All games</option>
                    {GAME_TYPES.map(({ value, label }) => (
                      <option key={value} value={value} disabled={value === 'culling' && !isCullingGameAvailable()}>
                        {label}{value === 'culling' && !isCullingGameAvailable() ? ' (June 2026)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {(() => {
                  const filteredByType = gameTypeFilter === '' ? games : games.filter((g) => (g.type || 'standard') === gameTypeFilter)
                  const sortedGames = sortGamesByNearestDate(filteredByType)
                  const totalPages = Math.max(1, Math.ceil(sortedGames.length / GAMES_PER_PAGE))
                  const page = Math.min(Math.max(1, currentGamesPage), totalPages)
                  const start = (page - 1) * GAMES_PER_PAGE
                  const paginatedGames = sortedGames.slice(start, start + GAMES_PER_PAGE)
                  return (
                    <>
                <div className="games-list">
                {paginatedGames.map((game) => {
                  const participants = game.participants || []
                  const isJoined = auth?.userEmail && participants.includes(auth.userEmail)
                  const isGuess = (game.type || '') === 'guess'
                  const guessAnswers = game.guessAnswers || {}
                  const hasAnsweredGuess = isGuess && isJoined && guessAnswers[auth?.userEmail] !== undefined && guessAnswers[auth.userEmail] !== ''
                  const canAnswerGuess = isGuess && isJoined && !hasAnsweredGuess
                  return (
                    <div key={game.id} className={`game-card ${game.active === false ? 'game-card-inactive' : ''}`}>
                      <div className="game-card-header">
                        <div className="game-card-title-row">
                          <h3>{game.name}</h3>
                          <span className={`game-type-badge type-${game.type || 'standard'}`}>
                            {GAME_TYPES.find((t) => t.value === (game.type || 'standard'))?.label || 'Standard'}
                          </span>
                          {game.active === false && <span className="game-type-badge type-inactive">Inactive</span>}
                        </div>
                        {isAdmin && (
                          <div className="game-card-admin-actions">
                            <button type="button" className="btn-sm btn-toggle" onClick={() => setGameActive(game.id, game.active !== false ? false : true)} title={game.active !== false ? 'Set game inactive (users cannot join)' : 'Set game active (users can join)'}>
                              {game.active !== false ? 'Set inactive' : 'Set active'}
                            </button>
                            <button type="button" className="btn-sm btn-remove" onClick={() => deleteGame(game.id)}>
                              <Trash2 size={14} /> Remove
                            </button>
                          </div>
                        )}
                      </div>
                      {game.description && <p className="game-description">{game.description}</p>}
                      {game.date && <p className="game-date">{formatGameDate(game.date)}</p>}
                      <div className="game-card-actions">
                        {isAdmin && (
                          <button type="button" className="btn-sm btn-generate-qr" onClick={() => setSelectedGameId(game.id)}>
                            <QrCode size={16} /> Generate QR
                          </button>
                        )}
                        {!isAdmin && auth?.userEmail && (
                          game.active === false ? (
                            <span className="game-inactive-label muted">Game inactive — cannot join</span>
                          ) : canAnswerGuess ? (
                            <button type="button" className="btn-sm btn-edit" onClick={() => setShowingGuessFormForGameId(game.id)}>
                              <ChevronRight size={14} /> Answer question
                            </button>
                          ) : isJoined ? (
                            <span className="game-joined-label muted">{hasAnsweredGuess ? 'Answer submitted — in your game history' : 'Joined — in your game history'}</span>
                          ) : (
                            <button type="button" className="btn-sm btn-edit" onClick={() => joinGame(game.id)}>
                              <ChevronRight size={14} /> Join game
                            </button>
                          )
                        )}
                      </div>
                      <div className="game-participants">
                        <strong>Participants ({participants.length})</strong>
                        {participants.length === 0 ? (
                          <span className="muted">No one joined yet.</span>
                        ) : (
                          <ul>
                            {participants.map((email) => (
                              <li key={email}>{getColleagueNameByEmail(email)}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      {isAdmin && isGuess && (() => {
                        const answers = game.guessAnswers || {}
                        const entries = Object.entries(answers).filter(([, ans]) => ans !== undefined && String(ans).trim() !== '')
                        return (
                          <div className="game-card-guess-answers">
                            <strong>Submitted answers</strong>
                            {game.guessCorrectAnswer != null && String(game.guessCorrectAnswer).trim() !== '' && (
                              <p className="game-correct-answer muted">Correct: <strong>{game.guessCorrectAnswer}</strong></p>
                            )}
                            {entries.length === 0 ? (
                              <p className="muted">No answers yet.</p>
                            ) : (
                              <ul className="guess-answers-list guess-answers-list--card">
                                {entries.map(([email, answer]) => (
                                  <li key={email}>
                                    <span className="guess-answer-user">{getColleagueNameByEmail(email)}</span>
                                    <span className="guess-answer-value">{answer}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  )
                })}
              </div>
              {sortedGames.length === 0 ? (
                <p className="games-filter-empty muted">{gameTypeFilter ? `No ${GAME_TYPES.find((t) => t.value === gameTypeFilter)?.label?.toLowerCase() || gameTypeFilter} games.` : 'No games.'}</p>
              ) : totalPages > 1 && (
                <nav className="games-pagination" aria-label="Games pagination">
                  <p className="games-pagination-info muted">
                    Showing {start + 1}&ndash;{Math.min(start + GAMES_PER_PAGE, sortedGames.length)} of {sortedGames.length} (nearest date first)
                  </p>
                  <div className="games-pagination-controls">
                    <button
                      type="button"
                      className="btn-sm"
                      onClick={() => setCurrentGamesPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      aria-label="Previous page"
                    >
                      Previous
                    </button>
                    <span className="games-pagination-page">Page {page} of {totalPages}</span>
                    <button
                      type="button"
                      className="btn-sm"
                      onClick={() => setCurrentGamesPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      aria-label="Next page"
                    >
                      Next
                    </button>
                  </div>
                </nav>
              )}
                    </>
                  )
                })()}
              </>
            )}
          </>
        )}
      </section>
      )}

      {currentPage === 'games' && isLoggedIn && auth?.userEmail && (() => {
        const currentUser = colleagues.find((c) => (c.email || '').toLowerCase() === auth.userEmail.toLowerCase())
        const history = currentUser?.gameHistory || []
        return (
          <section className="my-game-history subsection">
            <h2><span className="icon-wrap"><ListOrdered size={20} /></span> My game history</h2>
            <p className="section-desc">Games you have joined and points earned from each.</p>
            {history.length === 0 ? (
              <div className="empty-state">
                <Coins size={40} className="empty-state-icon" strokeWidth={1.5} />
                <p className="empty-state-title">No games joined yet</p>
                <p className="empty-state-desc">Scan a game QR code from the list above to join and start earning points.</p>
              </div>
            ) : (
              <div className="users-table-wrap">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Game</th>
                      <th>Points earned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((entry, i) => (
                      <tr key={`${entry.gameId}-${i}`}>
                        <td>{entry.gameName || 'Game'}</td>
                        <td className="points-cell">{entry.points ?? 0} pts</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )
      })()}

      {currentPage === 'leaderboard' && (
      <section className="leaderboard section-card section-card--leaderboard">
        <h2><span className="icon-wrap"><Trophy size={22} /></span> Rankings</h2>
        {sortedColleagues.length === 0 ? (
          <div className="empty-state">
            <Trophy size={40} className="empty-state-icon" strokeWidth={1.5} />
            <p className="empty-state-title">No one on the leaderboard yet</p>
            <p className="empty-state-desc">Add people in the People page (admin) so they can join games and earn points.</p>
          </div>
        ) : (
          <ol className="leaderboard-list">
            {sortedColleagues.map((person, index) => (
              <li
                key={person.id}
                className={`leaderboard-item rank-${index + 1}`}
              >
                <span className="rank">{getRankBadge(index + 1)}</span>
                <span className="name">{person.name}</span>
                <span className="meta">{person.branch}</span>
                <span className="points">{person.points} pts</span>
              </li>
            ))}
          </ol>
        )}
      </section>
      )}
      </main>
    </div>
  )
}

export default App
