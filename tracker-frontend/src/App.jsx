import { useEffect, useRef, useState, useCallback } from 'react'
import axios from 'axios'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import {
  Briefcase, Search, Heart, ChevronRight,
  MapPin, Clock, DollarSign, Zap, Star, User, LogOut,
  Shield, CircleAlert,
  Plus, Trash2
} from 'lucide-react'
import './App.css'

/* ── API ──────────────────────────────────────────────────────── */
const api = axios.create({ baseURL: `${window.location.protocol}//${window.location.hostname}:8080/api` })
api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem('maxxToken')
  if (t) cfg.headers.Authorization = 'Bearer ' + t
  return cfg
})

/* ── JWT decode ───────────────────────────────────────────────── */
const decode = (t) => {
  try { return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) }
  catch { return null }
}

/* ── Logo colors ──────────────────────────────────────────────── */
const LOGO_COLORS = [
  'linear-gradient(135deg,#7c3aed,#e040fb)',
  'linear-gradient(135deg,#2563eb,#7c3aed)',
  'linear-gradient(135deg,#059669,#2563eb)',
  'linear-gradient(135deg,#d97706,#e040fb)',
  'linear-gradient(135deg,#dc2626,#7c3aed)',
  'linear-gradient(135deg,#0891b2,#059669)',
]
const logoColor = (name) => LOGO_COLORS[(name?.charCodeAt(0) || 0) % LOGO_COLORS.length]

/* ── Rule-based matching ──────────────────────────────────────── */
const calcMatch = (job, profile) => {
  if (!profile) return job.baseMatch || 72
  let score = 0
  const profSkills = (profile.skills || []).map(s => s.toLowerCase())
  const jobSkills = (job.skills || []).map(s => s.toLowerCase())
  const matchedSkills = jobSkills.filter(s => profSkills.includes(s))
  score += Math.min(40, Math.round((matchedSkills.length / Math.max(jobSkills.length, 1)) * 40))
  if (profile.desiredRole && job.title?.toLowerCase().includes(profile.desiredRole.toLowerCase().split(' ')[0])) score += 25
  else if (profile.desiredRole && job.category?.toLowerCase().includes(profile.desiredRole.toLowerCase().split(' ')[0])) score += 15
  if (profile.location && (job.location?.toLowerCase().includes(profile.location.toLowerCase()) ||
    profile.preferredLocations?.some(l => job.location?.toLowerCase().includes(l.toLowerCase())))) score += 15
  if (profile.experience && job.experience) {
    const ye = parseInt(profile.experience) || 0
    const [min, max] = (job.experience.match(/\d+/g) || [0, 10]).map(Number)
    if (ye >= min && ye <= max + 2) score += 10
    else if (ye >= min) score += 5
  } else { score += 5 }
  if (profile.workPreference && job.workType) {
    if (profile.workPreference.toLowerCase() === job.workType.toLowerCase()) score += 10
    else if (job.workType === 'Hybrid') score += 5
  } else { score += 5 }
  return Math.max(50, Math.min(99, score))
}

const whyMatch = (job, profile, score) => {
  const reasons = []
  const profSkills = (profile?.skills || []).map(s => s.toLowerCase())
  const jobSkills = (job.skills || []).map(s => s.toLowerCase())
  const n = jobSkills.filter(s => profSkills.includes(s)).length
  if (n > 0) reasons.push(`${n} matching skill${n > 1 ? 's' : ''}`)
  if (profile?.location && job.location?.toLowerCase().includes(profile.location.toLowerCase())) reasons.push('Preferred location')
  if (profile?.experience) reasons.push('Matches your experience level')
  if (profile?.workPreference === job.workType) reasons.push(`${job.workType} preference match`)
  if (score >= 85) reasons.push('High overall compatibility')
  return reasons.length ? reasons : ['Strong profile alignment', 'Relevant industry', 'Active hiring']
}

/* ── Demo jobs ────────────────────────────────────────────────── */
const DEMO_JOBS = [
  { id: 1, title: 'Frontend Developer', company: 'TechNova Solutions', location: 'Bangalore • Hybrid', workType: 'Hybrid', salary: '₹8–15 LPA', experience: '2–5 years', skills: ['React', 'TypeScript', 'Next.js', 'CSS'], category: 'frontend', baseMatch: 92, description: 'Build exceptional user interfaces for our flagship SaaS product used by millions worldwide. Work closely with design, backend, and product teams.', responsibilities: ['Build reusable React components', 'Collaborate with designers on UI/UX', 'Optimize web performance', 'Write unit and integration tests'], requirements: ['2+ years React experience', 'Strong TypeScript skills', 'Experience with REST APIs', 'Familiarity with CI/CD'] },
  { id: 2, title: 'Backend Engineer', company: 'Cloudify Inc', location: 'Remote', workType: 'Remote', salary: '₹12–20 LPA', experience: '3–6 years', skills: ['Java', 'Spring Boot', 'PostgreSQL', 'Microservices'], category: 'backend', baseMatch: 85, description: 'Design and build scalable microservices powering our cloud-native platform. Work with distributed systems and real-time data pipelines.', responsibilities: ['Design microservices architecture', 'Build RESTful APIs', 'Optimize database queries', 'Write technical documentation'], requirements: ['3+ years Java/Spring Boot', 'Experience with PostgreSQL', 'Understanding of microservices', 'CI/CD experience'] },
  { id: 3, title: 'Full Stack Developer', company: 'StartupX', location: 'Mumbai • On-site', workType: 'On-site', salary: '₹10–18 LPA', experience: '2–4 years', skills: ['React', 'Node.js', 'MongoDB', 'Docker'], category: 'fullstack', baseMatch: 88, description: 'Join a fast-growing startup building the future of commerce. Own features end-to-end from database to UI.', responsibilities: ['Develop full-stack features', 'Design database schemas', 'Participate in code reviews', 'Contribute to architecture decisions'], requirements: ['React + Node.js experience', 'MongoDB knowledge', 'Docker familiarity', 'Startup mindset'] },
  { id: 4, title: 'UI/UX Designer', company: 'DesignHub', location: 'Pune • Hybrid', workType: 'Hybrid', salary: '₹6–12 LPA', experience: '1–3 years', skills: ['Figma', 'Prototyping', 'Design Systems', 'User Research'], category: 'design', baseMatch: 78, description: 'Create beautiful, intuitive product experiences. Work at the intersection of design and technology for top-tier clients.', responsibilities: ['Create wireframes and prototypes', 'Conduct user research', 'Build and maintain design systems', 'Collaborate with developers'], requirements: ['Figma proficiency', 'Portfolio of shipped products', 'Understanding of accessibility', 'Communication skills'] },
  { id: 5, title: 'DevOps Engineer', company: 'InfraCore', location: 'Remote', workType: 'Remote', salary: '₹14–24 LPA', experience: '3–7 years', skills: ['AWS', 'Kubernetes', 'Terraform', 'CI/CD'], category: 'devops', baseMatch: 80, description: 'Own our cloud infrastructure and make deployments seamless. Lead reliability engineering initiatives across a global platform.', responsibilities: ['Manage AWS infrastructure', 'Build CI/CD pipelines', 'Implement monitoring and alerting', 'Optimize cloud costs'], requirements: ['AWS certification preferred', 'Kubernetes expertise', 'Terraform experience', 'Scripting skills (Python/Bash)'] },
  { id: 6, title: 'Product Manager', company: 'Growlytics', location: 'Delhi • Hybrid', workType: 'Hybrid', salary: '₹18–30 LPA', experience: '4–8 years', skills: ['Product Strategy', 'Analytics', 'Agile', 'Stakeholder Management'], category: 'product', baseMatch: 74, description: 'Lead the product strategy for our analytics platform. Drive roadmap, work with engineering and design to ship impactful features.', responsibilities: ['Define product roadmap', 'Work with cross-functional teams', 'Analyze user data', 'Write detailed PRDs'], requirements: ['4+ years product management', 'Data-driven mindset', 'Strong communication', 'Technical background preferred'] },
  { id: 7, title: 'Data Scientist', company: 'AIMetrics', location: 'Hyderabad • Remote', workType: 'Remote', salary: '₹16–28 LPA', experience: '2–5 years', skills: ['Python', 'ML', 'TensorFlow', 'SQL'], category: 'data', baseMatch: 82, description: 'Build machine learning models that power personalized recommendations and predictive analytics across our platform.', responsibilities: ['Build and deploy ML models', 'Analyze large datasets', 'Collaborate with engineering on ML infrastructure', 'Present insights to stakeholders'], requirements: ['Python and ML frameworks', 'Strong statistics background', 'Experience with large datasets', 'PhD/MS preferred but not required'] },
  { id: 8, title: 'Mobile Developer (React Native)', company: 'Mobify', location: 'Bangalore • Hybrid', workType: 'Hybrid', salary: '₹10–18 LPA', experience: '2–4 years', skills: ['React Native', 'JavaScript', 'iOS', 'Android'], category: 'mobile', baseMatch: 86, description: 'Ship features in our cross-platform app used by millions. Work on performance, UX, and native integrations.', responsibilities: ['Build React Native features', 'Optimize app performance', 'Integrate native modules', 'Write tests'], requirements: ['React Native experience', 'Understanding of iOS/Android', 'Published apps preferred', 'JavaScript expertise'] },
]

/* ── Status config ────────────────────────────────────────────── */
const APP_STATUSES = ['INTERESTED', 'APPLIED', 'INTERVIEW', 'REJECTED', 'OFFER', 'HIRED']
const STATUS_CLASS = { INTERESTED: 'interested', APPLIED: 'applied', INTERVIEW: 'interview', REJECTED: 'rejected', OFFER: 'offer', HIRED: 'hired' }
const STATUS_LABEL = { INTERESTED: '⭐ Interested', APPLIED: '📨 Applied', INTERVIEW: '🎤 Interview', REJECTED: '❌ Rejected', OFFER: '🎉 Offer', HIRED: '🏆 Hired' }

/* ── Toast ────────────────────────────────────────────────────── */
function Toast({ toasts }) {
  return (
    <div className="toast-wrap">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id} className={`toast ${t.type}`} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 35 }}>
            <span className="toast-icon">{t.type === 'error' ? '⚠️' : t.type === 'info' ? 'ℹ️' : '✓'}</span>
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

/* ── Root ─────────────────────────────────────────────────────── */
export default function App() {
  const [token, setToken] = useState(localStorage.getItem('maxxToken'))
  const [authMode, setAuthMode] = useState('login')
  const [toasts, setToasts] = useState([])
  const [view, setView] = useState('discover')

  const notify = useCallback((message, type = 'success') => {
    const id = Date.now()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])

  const role = decode(token || '')?.role || 'USER'
  const username = decode(token || '')?.sub || 'User'

  const login = (tok) => {
    localStorage.setItem('maxxToken', tok)
    setToken(tok)
    const r = decode(tok)?.role
    setView(r === 'ADMIN' ? 'admin' : 'discover')
  }
  const logout = () => { localStorage.removeItem('maxxToken'); setToken(null) }

  if (!token) return (
    <>
      <AuthPage mode={authMode} setMode={setAuthMode} onLogin={login} />
      <Toast toasts={toasts} />
    </>
  )

  return (
    <div className="app-shell">
      <AppNav view={view} setView={setView} role={role} username={username} onLogout={logout} />
      <main className="app-main">
        {view === 'admin' && role === 'ADMIN' ? <AdminPage notify={notify} /> :
         view === 'discover' ? <DiscoverPage notify={notify} username={username} /> :
         view === 'matches' ? <MatchesPage notify={notify} /> :
         view === 'applications' ? <ApplicationsPage notify={notify} /> :
         view === 'profile' ? <ProfilePage notify={notify} username={username} /> :
         <DiscoverPage notify={notify} username={username} />}
      </main>
      <MobileNav view={view} setView={setView} role={role} />
      <Toast toasts={toasts} />
    </div>
  )
}

/* ── Landing / Marketing page ─────────────────────────────────── */
export function LandingPage({ onGetStarted }) {
  return (
    <div className="landing">
      <nav className="land-nav">
        <div className="land-logo">
          <div className="land-logo-icon">⚡</div>
          MAXXSWIPE AI
        </div>
        <div className="land-nav-links">
          <a href="#how" className="btn-ghost" style={{ fontSize: 14, padding: '9px 16px' }}>How it works</a>
          <button className="btn-primary" onClick={onGetStarted}>Start Swiping</button>
        </div>
      </nav>

      <section className="hero">
        <div>
          <div className="hero-badge"><span />&nbsp;AI-Powered Job Discovery</div>
          <h1 className="hero-title">
            Swipe Right For<br />
            <span className="grad-text">Your Next Job.</span>
          </h1>
          <p className="hero-sub">Discover jobs that actually match you — powered by intelligent matching, not keyword spam.</p>
          <div className="hero-cta">
            <button className="btn-primary lg" onClick={onGetStarted}>Start Swiping <ChevronRight size={18} /></button>
            <a href="#how" className="btn-ghost lg">How It Works</a>
          </div>
          <div className="hero-stats">
            <div className="hero-stat"><strong className="grad-text">Smart</strong><small>Matching Engine</small></div>
            <div className="hero-stat"><strong className="grad-text">Zero</strong><small>Spam Applications</small></div>
            <div className="hero-stat"><strong className="grad-text">Fast</strong><small>Swipe-Based UX</small></div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="preview-stack">
            <div className="preview-card-back" />
            <div className="preview-card-back2" />
            <div className="preview-card-front">
              <div className="preview-match-badge">⚡ 92% Match</div>
              <div className="preview-company-logo">T</div>
              <div className="preview-job-title">Frontend Developer</div>
              <div className="preview-company">TechNova Solutions</div>
              <div className="preview-meta">
                <span className="preview-tag">📍 Bangalore</span>
                <span className="preview-tag">🔀 Hybrid</span>
                <span className="preview-tag">₹8–15 LPA</span>
              </div>
              <div className="preview-skills">
                <span className="preview-skill">React</span>
                <span className="preview-skill">TypeScript</span>
                <span className="preview-skill">Next.js</span>
              </div>
              <div className="preview-swipe-btns">
                <div className="preview-btn-skip">✕</div>
                <div className="preview-btn-like">♥</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="section-label">Why MaxxSwipe</div>
        <h2 className="section-title">A smarter way<br /><span className="grad-text">to find your next role</span></h2>
        <div className="features-grid">
          {[
            { icon: '🎯', title: 'Skill-Based Matching', desc: 'Our matching engine scores jobs based on your skills, experience, preferred location, and work style — not just keywords.' },
            { icon: '⚡', title: 'Swipe to Decide', desc: 'Skip the endless scrolling. Swipe right to express interest, left to pass. Fast, intuitive, and satisfying.' },
            { icon: '📊', title: 'Track Everything', desc: 'Every application in one place. See your pipeline from Interested → Applied → Interview → Offer at a glance.' },
            { icon: '🔍', title: 'Match Explanations', desc: 'Know exactly why a job was recommended — matching skills, location, experience, and work preference all explained clearly.' },
            { icon: '💾', title: 'Save for Later', desc: 'Not ready to apply? Save jobs to revisit when the time is right without losing them in your feed.' },
            { icon: '🛡️', title: 'Privacy First', desc: 'Your profile and preferences stay with you. We never share your data with employers without your explicit action.' },
          ].map(f => (
            <div key={f.title} className="feat-card">
              <div className="feat-icon">{f.icon}</div>
              <div className="feat-title">{f.title}</div>
              <div className="feat-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="how-it-works" id="how">
        <div className="inner">
          <div className="section-label">How It Works</div>
          <h2 className="section-title">From signup to offer<br /><span className="grad-text">in four simple steps</span></h2>
          <div className="steps">
            {[
              { n: '01', icon: '👤', title: 'Set Your Profile', desc: 'Add your skills, experience, preferred location, and work type to personalise your feed.' },
              { n: '02', icon: '⚡', title: 'Discover Jobs', desc: 'Browse your personalised job feed. Each card shows match score, salary, and why it fits you.' },
              { n: '03', icon: '👆', title: 'Swipe & Save', desc: 'Swipe right to express interest, save to revisit later, or skip what doesn\'t fit.' },
              { n: '04', icon: '🚀', title: 'Apply & Track', desc: 'Apply with one click and track every application from Interested through to Hired.' },
            ].map(s => (
              <div key={s.n} className="step-card">
                <span className="step-num">{s.n}</span>
                <span className="step-icon">{s.icon}</span>
                <div className="step-title">{s.title}</div>
                <div className="step-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="land-cta">
        <h2>Ready to find<br /><span className="grad-text">your next role?</span></h2>
        <p>Join MaxxSwipe and discover jobs that actually match you.</p>
        <button className="btn-primary lg" onClick={onGetStarted}>Get Started — It's Free</button>
      </section>

      <footer className="land-footer">
        <div className="land-logo" style={{ fontSize: 16 }}><div className="land-logo-icon" style={{ width: 28, height: 28, fontSize: 13 }}>⚡</div>MAXXSWIPE AI</div>
        <span>Built with ♥ · Not affiliated with any job board</span>
      </footer>
    </div>
  )
}

/* ── Auth page ────────────────────────────────────────────────── */
function AuthPage({ mode, setMode, onLogin }) {
  const [showLanding, setShowLanding] = useState(true)
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault(); setError(''); setBusy(true)
    try {
      const payload = mode === 'login' ? { username: form.username, password: form.password } : form
      const { data } = await api.post(`/auth/${mode}`, payload)
      onLogin(data.token)
    } catch (err) {
      setError(err.response?.data || 'Something went wrong. Please try again.')
    } finally { setBusy(false) }
  }

  if (showLanding) return <LandingPage onGetStarted={() => setShowLanding(false)} />

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-left-glow" /><div className="auth-left-glow2" />
        <div className="land-logo"><div className="land-logo-icon">⚡</div>MAXXSWIPE AI</div>
        <div className="auth-left-content">
          <h1>Swipe Right For<br /><span className="grad-text">Your Next Job.</span></h1>
          <p>Discover opportunities that match your skills, experience, and goals — all in one swipe.</p>
          <div className="auth-steps">
            {['Set up your profile', 'Browse your personalised feed', 'Swipe right to express interest', 'Track applications to hired'].map((s, i) => (
              <div key={i} className="auth-step">
                <div className="auth-step-dot">{['👤','⚡','👆','📊'][i]}</div>
                {s}
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: 'relative', zIndex: 1, fontSize: 12, color: 'var(--muted)' }}>MAXXSWIPE AI — Your career, accelerated.</div>
      </div>

      <div className="auth-right">
        <div className="auth-box">
          <div className="auth-box-logo">
            <div className="land-logo"><div className="land-logo-icon" style={{ width: 30, height: 30, fontSize: 14 }}>⚡</div>MAXXSWIPE AI</div>
          </div>
          <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
          <p>{mode === 'login' ? 'Sign in to continue swiping.' : 'Start discovering jobs that match you.'}</p>
          {error && <div className="auth-error" style={{ margin: '16px 0' }}><CircleAlert size={15} />{error}</div>}
          <form className="auth-form" onSubmit={submit}>
            <div className="form-field">
              <label>Username</label>
              <input type="text" required value={form.username} onChange={set('username')} placeholder="yourname" autoComplete="username" />
            </div>
            {mode === 'register' && (
              <div className="form-field">
                <label>Email</label>
                <input type="email" required value={form.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" />
              </div>
            )}
            <div className="form-field">
              <label>Password</label>
              <input type="password" required value={form.password} onChange={set('password')} placeholder="••••••••" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: 4 }} disabled={busy}>
              {busy ? 'Working…' : mode === 'login' ? 'Sign In →' : 'Create Account →'}
            </button>
          </form>
          <div className="auth-switch">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── App Navigation ───────────────────────────────────────────── */
function AppNav({ view, setView, role, username, onLogout }) {
  return (
    <nav className="app-nav">
      <button className="app-nav-logo" onClick={() => setView('discover')}>
        <span className="logo-icon">⚡</span>
        MAXXSWIPE AI
      </button>
      <div className="app-nav-links">
        {[
          { id: 'discover', icon: <Zap size={16} />, label: 'Discover' },
          { id: 'matches', icon: <Heart size={16} />, label: 'Matches' },
          { id: 'applications', icon: <Briefcase size={16} />, label: 'Applications' },
          { id: 'profile', icon: <User size={16} />, label: 'Profile' },
          ...(role === 'ADMIN' ? [{ id: 'admin', icon: <Shield size={16} />, label: 'Admin' }] : []),
        ].map(l => (
          <button key={l.id} className={`nav-link${view === l.id ? ' active' : ''}`} onClick={() => setView(l.id)}>
            {l.icon}{l.label}
          </button>
        ))}
      </div>
      <div className="app-nav-right">
        {role === 'ADMIN' && <span className="nav-role-pill">Admin</span>}
        <div className="nav-avatar" title={username}>{username[0]?.toUpperCase()}</div>
        <button className="btn-ghost" style={{ fontSize: 13, padding: '7px 12px' }} onClick={onLogout} title="Log out">
          <LogOut size={15} />
        </button>
      </div>
    </nav>
  )
}

function MobileNav({ view, setView, role }) {
  const items = [
    { id: 'discover', icon: <Zap />, label: 'Swipe' },
    { id: 'matches', icon: <Heart />, label: 'Matches' },
    { id: 'applications', icon: <Briefcase />, label: 'Applied' },
    { id: 'profile', icon: <User />, label: 'Profile' },
    ...(role === 'ADMIN' ? [{ id: 'admin', icon: <Shield />, label: 'Admin' }] : []),
  ]
  return (
    <div className="mobile-nav">
      <div className="mobile-nav-inner">
        {items.map(i => (
          <button key={i.id} className={`mobile-nav-btn${view === i.id ? ' active' : ''}`} onClick={() => setView(i.id)}>
            {i.icon}{i.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── DISCOVER / SWIPE PAGE ────────────────────────────────────── */
function DiscoverPage({ notify, username }) {
  const [profile] = useState(() => {
    try { return JSON.parse(localStorage.getItem('maxxProfile') || 'null') } catch { return null }
  })
  const [jobs] = useState(DEMO_JOBS)
  const [interactions, setInteractions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('maxxInteractions') || '{}') } catch { return {} }
  })
  const [selectedJob, setSelectedJob] = useState(null)

  const saveInteraction = useCallback((jobId, type) => {
    setInteractions(prev => {
      const next = { ...prev, [jobId]: type }
      localStorage.setItem('maxxInteractions', JSON.stringify(next))
      return next
    })
  }, [])

  const remaining = jobs.filter(j => !interactions[j.id])
  const isDone = remaining.length === 0

  const handleLike = useCallback((job) => {
    saveInteraction(job.id, 'LIKE')
    notify(`Liked ${job.title} at ${job.company} ♥`, 'success')
  }, [saveInteraction, notify])

  const handleSkip = useCallback((job) => {
    saveInteraction(job.id, 'SKIP')
  }, [saveInteraction])

  const handleSave = useCallback((job) => {
    saveInteraction(job.id, 'SAVE')
    notify(`Saved ${job.title} for later 🔖`, 'info')
  }, [saveInteraction, notify])

  const resetFeed = () => {
    setInteractions({})
    localStorage.removeItem('maxxInteractions')
    notify('Feed reset! Swipe away 🚀', 'info')
  }

  const visibleJobs = remaining.slice(0, 3)

  return (
    <div className="swipe-screen">
      <div className="swipe-header">
        <div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Welcome back, <strong style={{ color: 'var(--text)' }}>{username}</strong></div>
          <div className="swipe-counter" style={{ marginTop: 2 }}>
            <strong>{remaining.length}</strong> jobs remaining
          </div>
        </div>
        <div className="swipe-hint">
          <span>← Skip</span>&nbsp;&nbsp;<span>Like →</span>
        </div>
      </div>

      {isDone ? (
        <div className="swipe-done fade-up">
          <div className="done-icon">🎉</div>
          <h3>You've seen all jobs!</h3>
          <p>Check your matches or reset the feed to see jobs again.</p>
          <button className="btn-primary" onClick={resetFeed}>Reset Feed</button>
        </div>
      ) : (
        <>
          <div className="card-stack">
            {visibleJobs.map((job, i) => (
              <SwipeCard
                key={job.id}
                job={job}
                profile={profile}
                layerIndex={i}
                isTop={i === 0}
                onLike={handleLike}
                onSkip={handleSkip}
                onTap={i === 0 ? () => setSelectedJob(job) : undefined}
              />
            ))}
          </div>
          {visibleJobs[0] && (
            <div className="swipe-buttons">
              <button className="swipe-btn-skip" onClick={() => handleSkip(visibleJobs[0])} title="Skip (←)">✕</button>
              <button className="swipe-btn-save" onClick={() => handleSave(visibleJobs[0])} title="Save for later">🔖</button>
              <button className="swipe-btn-like" onClick={() => handleLike(visibleJobs[0])} title="Like (→)">♥</button>
            </div>
          )}
          <div style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)' }}>
            Tap a card to see details · Use ← → arrow keys
          </div>
        </>
      )}

      <AnimatePresence>
        {selectedJob && (
          <JobDetailModal
            job={selectedJob}
            profile={profile}
            onClose={() => setSelectedJob(null)}
            onLike={() => { handleLike(selectedJob); setSelectedJob(null) }}
            onSkip={() => { handleSkip(selectedJob); setSelectedJob(null) }}
            notify={notify}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Swipe Card ───────────────────────────────────────────────── */
function SwipeCard({ job, profile, layerIndex, isTop, onLike, onSkip, onTap }) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-18, 18])
  const likeOpacity = useTransform(x, [20, 100], [0, 1])
  const skipOpacity = useTransform(x, [-20, -100], [0, 1])
  const scale = useTransform(x, [-300, 0, 300], [0.95, 1, 0.95])
  const dragRef = useRef(false)

  const match = calcMatch(job, profile)
  const reasons = whyMatch(job, profile, match)

  useEffect(() => {
    if (!isTop) return
    const handle = (e) => {
      if (e.key === 'ArrowRight') { onLike(job) }
      if (e.key === 'ArrowLeft') { onSkip(job) }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [isTop, job, onLike, onSkip])

  const handleDragEnd = (_, info) => {
    if (info.offset.x > 100) { onLike(job) }
    else if (info.offset.x < -100) { onSkip(job) }
    else { animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 }) }
  }

  const layerClass = layerIndex === 0 ? 'top' : layerIndex === 1 ? 'behind1' : 'behind2'

  if (!isTop) {
    return (
      <div className={`job-card ${layerClass}`}>
        <div className="card-match-bar">
          <div className="match-badge"><span className="dot" />AI Match</div>
        </div>
        <div className="card-company-row">
          <div className="company-logo" style={{ background: logoColor(job.company) }}>{job.company[0]}</div>
          <div className="company-info">
            <div className="company-name">{job.company}</div>
          </div>
        </div>
        <div className="job-title">{job.title}</div>
      </div>
    )
  }

  return (
    <motion.div
      className={`job-card ${layerClass}`}
      style={{ x, rotate, scale }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragStart={() => { dragRef.current = true }}
      onDragEnd={handleDragEnd}
      onClick={() => { if (!dragRef.current) onTap?.(); dragRef.current = false }}
      whileTap={{ cursor: 'grabbing' }}
    >
      <motion.div className="swipe-indicator like" style={{ opacity: likeOpacity }}>LIKE ♥</motion.div>
      <motion.div className="swipe-indicator skip" style={{ opacity: skipOpacity }}>SKIP ✕</motion.div>

      <div className="card-match-bar">
        <div className="match-badge"><span className="dot" />⚡ {match}% Match</div>
        <div className="card-new-tag">NEW</div>
      </div>

      <div className="card-company-row">
        <div className="company-logo" style={{ background: logoColor(job.company) }}>{job.company[0]}</div>
        <div className="company-info">
          <div className="company-name">{job.company}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Active employer</div>
        </div>
      </div>

      <div className="job-title">{job.title}</div>

      <div className="card-meta">
        <span className="meta-tag"><MapPin size={11} />{job.location}</span>
        <span className="meta-tag"><Clock size={11} />{job.workType}</span>
        <span className="meta-tag salary-tag"><DollarSign size={11} />{job.salary}</span>
        <span className="meta-tag"><Star size={11} />{job.experience}</span>
      </div>

      <div className="card-skills">
        {job.skills.slice(0, 4).map(s => <span key={s} className="skill-tag">{s}</span>)}
      </div>

      <div className="card-why">
        <div className="card-why-title">WHY THIS MATCHES YOU</div>
        <div className="card-why-items">
          {reasons.slice(0, 3).map((r, i) => (
            <div key={i} className="card-why-item"><span className="check">✓</span>{r}</div>
          ))}
        </div>
      </div>

      <div className="card-tap-hint">👆 Tap for details</div>
    </motion.div>
  )
}

/* ── Job Detail Modal ─────────────────────────────────────────── */
function JobDetailModal({ job, profile, onClose, onLike, onSkip, notify }) {
  const [applied, setApplied] = useState(false)
  const match = calcMatch(job, profile)
  const reasons = whyMatch(job, profile, match)

  const handleApply = async () => {
    try {
      await api.post('/applications', {
        companyName: job.company,
        jobRole: job.title,
        status: 'APPLIED',
        dateApplied: new Date().toISOString().slice(0, 10),
        notes: `Applied via MaxxSwipe. Match: ${match}%`,
      })
      setApplied(true)
      notify(`Application recorded for ${job.title} at ${job.company} 🎉`)
    } catch {
      notify('Could not save application. Please check you are logged in.', 'error')
    }
  }

  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="job-modal" initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 36 }} onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="modal-job-header">
          <div className="modal-company-row">
            <div className="modal-logo" style={{ background: logoColor(job.company) }}>{job.company[0]}</div>
            <div>
              <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 4 }}>{job.company}</div>
              <div className="modal-job-title">{job.title}</div>
            </div>
          </div>

          <div className="modal-match-row">
            <div className="match-badge"><span className="dot" />⚡ {match}% Match</div>
          </div>
          <div className="modal-score-bar"><div className="modal-score-fill" style={{ width: `${match}%` }} /></div>
        </div>

        <div className="modal-meta">
          <span className="meta-tag"><MapPin size={12} />{job.location}</span>
          <span className="meta-tag"><Clock size={12} />{job.workType}</span>
          <span className="meta-tag salary-tag"><DollarSign size={12} />{job.salary}</span>
          <span className="meta-tag"><Star size={12} />{job.experience}</span>
        </div>

        <div className="modal-why">
          <div className="modal-why-title">✨ Why this job matches you</div>
          <div className="modal-why-items">
            {reasons.map((r, i) => <div key={i} className="modal-why-item"><span className="check">✓</span>{r}</div>)}
          </div>
        </div>

        <div className="modal-section">
          <h4>About the role</h4>
          <p>{job.description}</p>
        </div>

        <div className="modal-section">
          <h4>Responsibilities</h4>
          <ul>{job.responsibilities?.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </div>

        <div className="modal-section">
          <h4>Requirements</h4>
          <ul>{job.requirements?.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </div>

        <div className="modal-section">
          <h4>Skills</h4>
          <div className="modal-skills">{job.skills.map(s => <span key={s} className="skill-tag">{s}</span>)}</div>
        </div>

        <div className="modal-actions">
          <button className="btn-danger" onClick={() => { onSkip(); }}>✕ Skip</button>
          <button className="btn-outline" onClick={() => { onLike(); }}>♥ Like</button>
          <button className="btn-primary" style={{ flex: 1 }} onClick={handleApply} disabled={applied}>
            {applied ? '✓ Application Saved' : '🚀 Apply Now'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── MATCHES PAGE ─────────────────────────────────────────────── */
function MatchesPage({ notify }) {
  const [profile] = useState(() => { try { return JSON.parse(localStorage.getItem('maxxProfile') || 'null') } catch { return null } })
  const [interactions] = useState(() => { try { return JSON.parse(localStorage.getItem('maxxInteractions') || '{}') } catch { return {} } })
  const liked = DEMO_JOBS.filter(j => interactions[j.id] === 'LIKE')
  const saved = DEMO_JOBS.filter(j => interactions[j.id] === 'SAVE')
  const [selectedJob, setSelectedJob] = useState(null)
  const [tab, setTab] = useState('liked')

  const shown = tab === 'liked' ? liked : saved

  return (
    <div className="matches-page">
      <div className="page-header" style={{ padding: '0 0 24px' }}>
        <div className="page-eyebrow">YOUR ACTIVITY</div>
        <div className="page-title">Matches & Saved</div>
        <div className="page-sub">{liked.length} liked · {saved.length} saved</div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button className={`filter-chip${tab === 'liked' ? ' active' : ''}`} onClick={() => setTab('liked')}>♥ Liked ({liked.length})</button>
        <button className={`filter-chip${tab === 'saved' ? ' active' : ''}`} onClick={() => setTab('saved')}>🔖 Saved ({saved.length})</button>
      </div>
      {shown.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">{tab === 'liked' ? '♥' : '🔖'}</span>
          <h3>{tab === 'liked' ? 'No likes yet' : 'Nothing saved'}</h3>
          <p>{tab === 'liked' ? 'Swipe right on jobs you like to see them here.' : 'Tap the bookmark button to save jobs for later.'}</p>
        </div>
      ) : (
        <div className="matches-grid">
          {shown.map(job => {
            const match = calcMatch(job, profile)
            return (
              <div key={job.id} className="match-card" onClick={() => setSelectedJob(job)}>
                <div className="match-card-header">
                  <div>
                    <div className="match-card-title">{job.title}</div>
                    <div className="match-card-company">{job.company} · {job.location}</div>
                  </div>
                  <div className="match-score-ring">
                    <div className="match-pct">{match}%</div>
                    <div className="match-pct-label">match</div>
                  </div>
                </div>
                <div className="card-meta" style={{ marginBottom: 10 }}>
                  <span className="meta-tag salary-tag"><DollarSign size={11} />{job.salary}</span>
                  <span className="meta-tag"><Clock size={11} />{job.workType}</span>
                </div>
                <div className="card-skills">{job.skills.slice(0, 3).map(s => <span key={s} className="skill-tag">{s}</span>)}</div>
              </div>
            )
          })}
        </div>
      )}
      <AnimatePresence>
        {selectedJob && (
          <JobDetailModal job={selectedJob} profile={profile} onClose={() => setSelectedJob(null)} onLike={() => setSelectedJob(null)} onSkip={() => setSelectedJob(null)} notify={notify} />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── APPLICATIONS PAGE ────────────────────────────────────────── */
function ApplicationsPage({ notify }) {
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [query, setQuery] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/applications')
        setApps(data)
      } catch { notify('Could not load applications', 'error') }
      finally { setLoading(false) }
    }
    load()
  }, [notify]) // notify is stable (useCallback in root)

  const statusCounts = APP_STATUSES.reduce((acc, s) => {
    acc[s] = apps.filter(a => a.status === s || (s === 'INTERESTED' && !a.status)).length
    return acc
  }, {})

  const filtered = apps.filter(a => {
    const matchFilter = filter === 'ALL' || a.status === filter
    const matchQuery = a.companyName?.toLowerCase().includes(query.toLowerCase()) || a.jobRole?.toLowerCase().includes(query.toLowerCase())
    return matchFilter && matchQuery
  })

  const updateStatus = async (id, status) => {
    try {
      const app = apps.find(a => a.id === id)
      await api.put(`/applications/${id}`, { ...app, status, dateApplied: app.dateApplied || new Date().toISOString().slice(0, 10) })
      setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a))
      notify('Status updated')
    } catch { notify('Could not update status', 'error') }
  }

  const deleteApp = async (id) => {
    if (!confirm('Delete this application?')) return
    try {
      await api.delete(`/applications/${id}`)
      setApps(prev => prev.filter(a => a.id !== id))
      notify('Application removed')
    } catch { notify('Could not delete', 'error') }
  }

  return (
    <div className="tracker-page">
      <div className="tracker-header">
        <div>
          <div className="page-eyebrow">MY PIPELINE</div>
          <div className="page-title">Applications</div>
        </div>
        <div className="search-input-wrap">
          <Search size={16} />
          <input className="search-input" placeholder="Search company or role…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="tracker-stats">
        <div className="t-stat all"><strong>{apps.length}</strong><small>Total</small></div>
        {APP_STATUSES.map(s => (
          <div key={s} className={`t-stat ${STATUS_CLASS[s]}`}><strong>{statusCounts[s] || 0}</strong><small>{s[0] + s.slice(1).toLowerCase()}</small></div>
        ))}
      </div>

      <div className="tracker-filters">
        {['ALL', ...APP_STATUSES].map(s => (
          <button key={s} className={`filter-chip${filter === s ? ' active' : ''}`} onClick={() => setFilter(s)}>
            {s === 'ALL' ? 'All' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty-state"><span className="empty-icon">⏳</span><h3>Loading…</h3></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📭</span>
          <h3>No applications found</h3>
          <p>Start swiping right on jobs to add them here, or adjust your filter.</p>
        </div>
      ) : (
        <div className="apps-grid">
          {filtered.map(app => (
            <div key={app.id} className="app-card">
              <div className="app-card-header">
                <div className="app-card-logo" style={{ background: logoColor(app.companyName) }}>{app.companyName?.[0] || '?'}</div>
                <div className="app-card-actions">
                  <button title="Delete" onClick={() => deleteApp(app.id)}><Trash2 size={13} /></button>
                </div>
              </div>
              <div className="app-card-title">{app.jobRole}</div>
              <div className="app-card-company">{app.companyName}</div>
              <div className="app-card-meta">
                <span className={`app-status-badge status-${STATUS_CLASS[app.status] || 'applied'}`}>
                  {STATUS_LABEL[app.status] || app.status}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="app-card-date">{app.dateApplied || '—'}</div>
                <select className="status-select" value={app.status || ''} onChange={e => updateStatus(app.id, e.target.value)}>
                  {APP_STATUSES.map(s => <option key={s} value={s}>{s[0] + s.slice(1).toLowerCase()}</option>)}
                </select>
              </div>
              {app.notes && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)', borderTop: '1px solid var(--border)', paddingTop: 10 }}>{app.notes}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── PROFILE PAGE ─────────────────────────────────────────────── */
function ProfilePage({ notify, username }) {
  const [profile, setProfile] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('maxxProfile') || 'null') || {
        name: username, location: '', desiredRole: '', skills: [], experience: '',
        education: '', preferredLocations: [], workPreference: 'Hybrid',
        expectedSalary: '', employmentType: 'Full-time', bio: '',
      }
    } catch { return { name: username, skills: [], preferredLocations: [] } }
  })
  const [skillInput, setSkillInput] = useState('')
  const [saved, setSaved] = useState(false)

  const set = (k) => (e) => setProfile(p => ({ ...p, [k]: e.target.value }))

  const addSkill = () => {
    const s = skillInput.trim()
    if (s && !profile.skills.includes(s)) {
      setProfile(p => ({ ...p, skills: [...p.skills, s] }))
      setSkillInput('')
    }
  }
  const removeSkill = (s) => setProfile(p => ({ ...p, skills: p.skills.filter(x => x !== s) }))

  const completeness = () => {
    const fields = ['name', 'location', 'desiredRole', 'experience', 'education', 'expectedSalary', 'bio']
    const filled = fields.filter(f => profile[f]?.trim()).length
    const skillsFilled = profile.skills.length > 0 ? 1 : 0
    return Math.round(((filled + skillsFilled) / (fields.length + 1)) * 100)
  }

  const save = () => {
    localStorage.setItem('maxxProfile', JSON.stringify(profile))
    setSaved(true)
    notify('Profile saved! Your job matches have been updated. 🎯')
    setTimeout(() => setSaved(false), 2000)
  }

  const pct = completeness()

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar">{(profile.name || username)[0]?.toUpperCase()}</div>
        <div className="profile-info">
          <h2>{profile.name || username}</h2>
          <p>{profile.desiredRole || 'Set your desired role below'}</p>
          {profile.location && <p style={{ marginTop: 4, fontSize: 13, color: 'var(--muted)' }}>📍 {profile.location}</p>}
        </div>
        <div className="completeness-bar">
          <div className="completeness-label">
            <span>Profile Completeness</span>
            <strong style={{ color: pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : 'var(--purple2)' }}>{pct}%</strong>
          </div>
          <div className="completeness-track"><div className="completeness-fill" style={{ width: `${pct}%` }} /></div>
        </div>
      </div>

      <div className="profile-section">
        <h3>Personal Info</h3>
        <div className="profile-grid">
          <div className="profile-field">
            <label>Full Name</label>
            <input value={profile.name || ''} onChange={set('name')} placeholder="Your full name" />
          </div>
          <div className="profile-field">
            <label>Location</label>
            <input value={profile.location || ''} onChange={set('location')} placeholder="e.g. Bangalore" />
          </div>
          <div className="profile-field full">
            <label>Bio</label>
            <textarea value={profile.bio || ''} onChange={set('bio')} placeholder="Brief summary of your background and goals…" />
          </div>
        </div>
      </div>

      <div className="profile-section">
        <h3>Career Preferences</h3>
        <div className="profile-grid">
          <div className="profile-field">
            <label>Desired Role</label>
            <input value={profile.desiredRole || ''} onChange={set('desiredRole')} placeholder="e.g. Frontend Developer" />
          </div>
          <div className="profile-field">
            <label>Years of Experience</label>
            <input value={profile.experience || ''} onChange={set('experience')} placeholder="e.g. 3" type="number" min="0" />
          </div>
          <div className="profile-field">
            <label>Work Preference</label>
            <select value={profile.workPreference || 'Hybrid'} onChange={set('workPreference')}>
              <option>Remote</option><option>Hybrid</option><option>On-site</option>
            </select>
          </div>
          <div className="profile-field">
            <label>Employment Type</label>
            <select value={profile.employmentType || 'Full-time'} onChange={set('employmentType')}>
              <option>Full-time</option><option>Part-time</option><option>Contract</option><option>Freelance</option>
            </select>
          </div>
          <div className="profile-field">
            <label>Expected Salary</label>
            <input value={profile.expectedSalary || ''} onChange={set('expectedSalary')} placeholder="e.g. ₹12 LPA" />
          </div>
          <div className="profile-field">
            <label>Education</label>
            <input value={profile.education || ''} onChange={set('education')} placeholder="e.g. B.Tech Computer Science" />
          </div>
        </div>
      </div>

      <div className="profile-section">
        <h3>Skills</h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Add skills to improve your match scores. These are compared against job requirements.</p>
        <div className="skills-input-wrap">
          <input className="profile-field" style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', background: 'var(--navy2)', color: 'var(--text)' }}
            value={skillInput} onChange={e => setSkillInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
            placeholder="Type a skill and press Enter…" />
          <button className="btn-outline" onClick={addSkill}><Plus size={15} />Add</button>
        </div>
        {profile.skills.length > 0 && (
          <div className="skills-tags">
            {profile.skills.map(s => (
              <div key={s} className="skill-tag-removable">
                {s}
                <button onClick={() => removeSkill(s)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button className="btn-primary lg" onClick={save}>
          {saved ? '✓ Saved!' : '💾 Save Profile'}
        </button>
      </div>
    </div>
  )
}

/* ── ADMIN PAGE (preserved + restyled) ───────────────────────── */
function AdminPage({ notify }) {
  const [data, setData] = useState({ users: [], apps: [], stats: {} })
  const [query, setQuery] = useState('')

  useEffect(() => {
    Promise.all([api.get('/admin/users'), api.get('/admin/applications'), api.get('/admin/stats')])
      .then(([u, a, s]) => setData({ users: u.data, apps: a.data, stats: s.data }))
      .catch(() => notify('Could not load admin data', 'error'))
  }, [])

  const users = data.users.filter(u => `${u.username} ${u.email}`.toLowerCase().includes(query.toLowerCase()))
  const apps = data.apps.filter(a => `${a.companyName} ${a.jobRole} ${a.user?.username}`.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="admin-page">
      <div style={{ marginBottom: 28 }}>
        <div className="page-eyebrow">ADMIN CONSOLE</div>
        <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          Admin Dashboard <span className="admin-pill"><Shield size={13} />Live</span>
        </div>
      </div>

      <div className="admin-grid">
        {[
          { label: 'Total Users', value: data.stats.totalUsers || 0, icon: '👥' },
          { label: 'Applications', value: data.stats.totalApplications || 0, icon: '📋' },
          { label: 'Interviews', value: data.stats.byStatus?.INTERVIEW || 0, icon: '🎤' },
          { label: 'Offers', value: data.stats.byStatus?.OFFER || 0, icon: '🎉' },
        ].map(s => (
          <div key={s.label} className="admin-stat-card">
            <div style={{ fontSize: 24, marginBottom: 10 }}>{s.icon}</div>
            <strong>{s.value}</strong>
            <small>{s.label}</small>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div className="search-input-wrap">
          <Search size={16} />
          <input className="search-input" style={{ width: 300 }} placeholder="Search users or applications…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-head">
          <div><h3>Users</h3><p>All accounts in the workspace</p></div>
          <span className="admin-pill">{users.length} users</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead><tr><th>ID</th><th>Username</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>No users found</td></tr>
              ) : users.map(u => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td className="strong">{u.username}</td>
                  <td>{u.email}</td>
                  <td><span className="admin-pill">{u.role}</span></td>
                  <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-head">
          <div><h3>All Applications</h3><p>A complete view across all users</p></div>
          <span className="admin-pill">{apps.length} total</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead><tr><th>Company</th><th>Role</th><th>Applicant</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {apps.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>No applications found</td></tr>
              ) : apps.map(a => (
                <tr key={a.id}>
                  <td className="strong">{a.companyName}</td>
                  <td>{a.jobRole}</td>
                  <td>{a.user?.username || '—'}</td>
                  <td><span className={`app-status-badge status-${STATUS_CLASS[a.status] || 'applied'}`}>{a.status}</span></td>
                  <td>{a.dateApplied || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
