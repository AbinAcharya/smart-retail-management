import { useEffect, useRef, useState } from 'react'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Boxes,
  Camera,
  CircleHelp,
  Clock3,
  Command,
  Download,
  Ellipsis,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageCheck,
  Plus,
  ScanLine,
  Search,
  Settings2,
  ShoppingBasket,
  Sparkles,
  UsersRound,
  WandSparkles,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import './App.css'

const navigation = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'demand', label: 'Demand planning', icon: Activity },
  { id: 'customers', label: 'Customer signals', icon: UsersRound },
  { id: 'vision', label: 'Store vision', icon: ScanLine },
  { id: 'journeys', label: 'Synthetic journeys', icon: WandSparkles },
]

const INVENTORY_STORAGE_KEY = 'kinetix-store-inventory'
const MIN_PURCHASE_BASKETS_FOR_STEADIER_TREND = 5

function getViewFromHash() {
  const requestedView = window.location.hash.slice(1)
  return navigation.some(({ id }) => id === requestedView) ? requestedView : 'overview'
}

function useAccessibleDialog(isOpen, onClose, fallbackRef) {
  const dialogRef = useRef(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return undefined

    const previousFocus = document.activeElement
    const dialog = dialogRef.current
    const fallbackElement = fallbackRef?.current
    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const getFocusable = () => [...(dialog?.querySelectorAll(focusableSelector) ?? [])]
      .filter((element) => element.getAttribute('aria-hidden') !== 'true')
    const focusable = getFocusable()
    ;(focusable[0] ?? dialog)?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const currentFocusable = getFocusable()
      if (currentFocusable.length === 0) {
        event.preventDefault()
        dialog?.focus()
        return
      }
      const first = currentFocusable[0]
      const last = currentFocusable[currentFocusable.length - 1]
      if (event.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
      else fallbackElement?.focus()
    }
  }, [fallbackRef, isOpen])

  return dialogRef
}

function AdminAuth({ onAuthenticated }) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [working, setWorking] = useState(false)
  const [registrationOpen, setRegistrationOpen] = useState(null)
  const [today, setToday] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setToday(new Date()), 60_000)
    fetch('/api/auth/status')
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error)
        setRegistrationOpen(result.registrationOpen)
      })
      .catch(() => {
        setRegistrationOpen(false)
        setMessage('The local data service is unavailable. Restart the dashboard server and try again.')
      })
    return () => window.clearInterval(timer)
  }, [])

  const authenticate = async (endpoint) => {
    if (!name.trim() || !password) {
      setMessage('Enter your admin name and password.')
      return
    }
    setWorking(true)
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), password }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Authentication failed.')
      onAuthenticated(result.admin.name)
    } catch (error) {
      setMessage(error instanceof TypeError
        ? 'Cannot reach the dashboard server. Start it with npm run dev from the smart-retail-dashboard folder, then try again.'
        : error instanceof Error ? error.message : 'Authentication could not be completed.')
    } finally {
      setWorking(false)
    }
  }

  const login = (event) => {
    event.preventDefault()
    void authenticate('/api/auth/login')
  }

  return (
    <main className="auth-screen">
      <aside className="auth-aside">
        <a className="brand" href="#admin-access">
          <span className="brand-mark"><Command size={17} strokeWidth={2.4} /></span>
          <span>Kinetix<span className="brand-period">.</span><small>RETAIL INTELLIGENCE</small></span>
        </a>
        <div className="auth-aside-copy"><span className="auth-aside-kicker">SMART RETAIL ANALYTICS</span><h2>Store operations,<br />in clear view.</h2><p>Inventory, demand, and store signals in one place.</p></div>
        <div className="auth-decoration" aria-hidden="true"><i /><i /><i /><i /><i /><i /><span /></div>
        <span className="auth-aside-footer">KINETIX INTELLIGENCE</span>
      </aside>
      <section className="auth-main">
        <div className="auth-card">
          <span className="auth-eyebrow">ADMINISTRATOR</span>
          <h1>Admin access</h1>
          <p>{registrationOpen ? 'Complete the one-time admin registration to get started.' : 'Log in with the registered admin account.'}</p>
          <form onSubmit={login}>
            <label className="auth-field"><span>Admin name</span><input autoComplete="username" value={name} onChange={(event) => { setName(event.target.value); setMessage('') }} placeholder="Enter your name" /></label>
            <label className="auth-field"><span>Password</span><input autoComplete="current-password" type="password" value={password} onChange={(event) => { setPassword(event.target.value); setMessage('') }} placeholder="Enter your password" /></label>
            <div className="auth-hint">{registrationOpen === null ? 'Checking admin setup...' : registrationOpen ? 'Register once using the configured Abin admin credentials.' : 'The one-time registration is complete.'}</div>
            <div className="auth-actions">{registrationOpen && <button className="button-secondary" type="button" disabled={working} onClick={() => void authenticate('/api/auth/register')}>Register</button>}<button className="button-primary" type="submit" disabled={working || registrationOpen === null}>{working ? 'Please wait...' : 'Login'}</button></div>
            <div className="auth-message" role="status" aria-live="polite">{message}</div>
          </form>
          <div className="auth-local-note"><CircleHelp size={14} /><span>Admin credentials and store data are stored by the local server.</span></div>
        </div>
        <div className="auth-date">{today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
      </section>
    </main>
  )
}

const viewDetails = {
  overview: { title: 'Overview', subtitle: 'Here’s what’s happening across your store today.' },
  inventory: { title: 'Inventory health', subtitle: 'Stock positions and suggested replenishment.' },
  demand: { title: 'Demand planning', subtitle: 'Forecasted demand against recent sales.' },
  customers: { title: 'Customer signals', subtitle: 'Product trends from your catalog and synthetic journey history.' },
  vision: { title: 'Store vision', subtitle: 'Shelf availability and footfall from the YOLO demo feed.' },
  journeys: { title: 'Synthetic journeys', subtitle: 'Explore simulated customer movement patterns.' },
}

function MetricCard({ label, value, change, note, icon: Icon, tone, direction = 'up' }) {
  return (
    <article className="metric-card">
      <div className="metric-topline">
        <span>{label}</span>
        <span className={`metric-icon ${tone}`}><Icon size={17} strokeWidth={1.8} /></span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-foot">
        <span className={`metric-change ${direction}`}>
          {direction === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {change}
        </span>
        <span>{note}</span>
      </div>
    </article>
  )
}

function InventoryTable({ compact = false, inventory, emptyMessage, onReplenish, onEdit, onRemove }) {
  const [openMenuSku, setOpenMenuSku] = useState('')
  const displayedInventory = compact ? inventory.slice(0, 4) : inventory

  if (inventory.length === 0) {
    return <div className="inventory-empty"><ShoppingBasket size={20} /><strong>{emptyMessage}</strong>{!compact && <span>Add the products from your store above to begin tracking inventory.</span>}</div>
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>On hand</th>
            {!compact && <th>Demand trend</th>}
            <th>Status</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {displayedInventory.map((item) => (
            <tr key={item.sku}>
              <td>
                <div className="product-cell">
                  <span className={`product-mark ${item.stock < item.reorder ? 'critical' : 'healthy'}`}><ShoppingBasket size={15} /></span>
                  <span><strong>{item.name}</strong><small>{item.sku} · {item.category}</small></span>
                </div>
              </td>
              <td><strong>{item.stock}</strong><small className="cell-sub">Reorder at {item.reorder}</small></td>
              {!compact && <td className="trend-neutral">{item.demand || 'No sales yet'}</td>}
              <td><span className={`status-pill ${item.stock < item.reorder ? 'critical' : 'healthy'}`}>{item.stock < item.reorder ? 'Reorder now' : 'Healthy'}</span></td>
              <td className="action-cell">
                <div className="product-actions">
                  {item.stock < item.reorder && <button className="text-action" onClick={() => onReplenish(item.sku)}>Replenish</button>}
                  {item.stock >= item.reorder && <button className="text-action replenished-action" disabled title="Stock is at or above its reorder target">Replenish</button>}
                  <div className="row-menu-wrap">
                    <button className="icon-button subtle" aria-label={`More actions for ${item.name}`} aria-expanded={openMenuSku === item.sku} onClick={() => setOpenMenuSku((current) => current === item.sku ? '' : item.sku)}><Ellipsis size={18} /></button>
                    {openMenuSku === item.sku && <div className="row-action-menu"><button onClick={() => { onEdit(item); setOpenMenuSku('') }}>Edit product</button><button className="remove-action" onClick={() => { onRemove(item); setOpenMenuSku('') }}>Remove product</button></div>}
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="inventory-mobile-list">
        {displayedInventory.map((item) => (
          <article className="inventory-mobile-card" key={item.sku}>
            <div className="inventory-mobile-heading">
              <span className={`product-mark ${item.stock < item.reorder ? 'critical' : 'healthy'}`}><ShoppingBasket size={15} /></span>
              <span className="inventory-mobile-name"><strong>{item.name}</strong><small>{item.sku} · {item.category}</small></span>
              <span className={`status-pill ${item.stock < item.reorder ? 'critical' : 'healthy'}`}>{item.stock < item.reorder ? 'Reorder' : 'Healthy'}</span>
            </div>
            <div className="inventory-mobile-details">
              <span><small>On hand</small><strong>{item.stock}</strong></span>
              <span><small>Reorder at</small><strong>{item.reorder}</strong></span>
              {!compact && <span><small>Demand</small><strong>{item.demand || 'No sales yet'}</strong></span>}
            </div>
            <div className="inventory-mobile-actions">
              {item.stock < item.reorder && <button className="text-action" onClick={() => onReplenish(item.sku)}>Replenish</button>}
              <button className="text-action" onClick={() => onEdit(item)}>Edit</button>
              <button className="text-action remove-action" onClick={() => onRemove(item)}>Remove</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function DemandChart({ detailed = false, data }) {
  return (
    <div className={`chart-shell ${detailed ? 'chart-detailed' : ''}`}>
      <div className="chart-legend">
        <span><i className="legend-dot sales" />Units per generated journey</span>
      </div>
      {data.length === 0 ? (
        <div className="chart-empty">No simulated activity yet. Generate a journey to add sales.</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 14, right: 12, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#206657" stopOpacity={0.16} />
                <stop offset="95%" stopColor="#206657" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#edf0ed" strokeDasharray="3 5" />
            <XAxis dataKey="run" axisLine={false} tickLine={false} tick={{ fill: '#8a928d', fontSize: 11 }} dy={10} />
            <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#8a928d', fontSize: 11 }} />
            <Tooltip contentStyle={{ border: '1px solid #e8ece8', borderRadius: 6, fontSize: 12 }} />
            <Area type="monotone" dataKey="units" name="Simulated units" stroke="#206657" strokeWidth={2.5} fill="url(#salesFill)" activeDot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

function App() {
  const [adminName, setAdminName] = useState('')
  const [authChecking, setAuthChecking] = useState(true)
  const [activeView, setActiveView] = useState(getViewFromHash)
  const [journeyRuns, setJourneyRuns] = useState([])
  const [stockItems, setStockItems] = useState([])
  const [dataLoaded, setDataLoaded] = useState(false)
  const [dataError, setDataError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const [utilityPanel, setUtilityPanel] = useState('')
  const [removeCandidate, setRemoveCandidate] = useState(null)
  const [editingSku, setEditingSku] = useState('')
  const [productMessage, setProductMessage] = useState('')
  const [productDraft, setProductDraft] = useState({ name: '', category: 'Fresh produce', stock: '', reorder: '', unitPrice: '' })
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const searchInputRef = useRef(null)
  const pageHeadingRef = useRef(null)
  const saveQueueRef = useRef(Promise.resolve())
  const utilityDialogRef = useAccessibleDialog(Boolean(utilityPanel), () => setUtilityPanel(''), pageHeadingRef)
  const removeDialogRef = useAccessibleDialog(Boolean(removeCandidate), () => setRemoveCandidate(null), pageHeadingRef)
  const currentView = viewDetails[activeView]
  const pageTitle = activeView === 'overview' ? `Welcome back, ${adminName}` : currentView.title
  const latestJourney = journeyRuns[journeyRuns.length - 1]
  const netSales = journeyRuns.reduce((total, journey) => total + journey.sales, 0)
  const unitsSold = journeyRuns.reduce((total, journey) => total + journey.units, 0)
  const trackedCategories = new Set(stockItems.map((item) => item.category)).size
  const currentStockTotal = stockItems.reduce((total, item) => total + item.stock, 0)
  const inventoryCapacity = stockItems.reduce((total, item) => total + item.reorder, 0)
  const lowStockItems = stockItems.filter((item) => item.stock < item.reorder)
  const urgentCount = stockItems.filter((item) => item.stock <= item.reorder / 2).length
  const inventoryHealth = inventoryCapacity ? `${Math.round((Math.min(currentStockTotal, inventoryCapacity) / inventoryCapacity) * 100)}%` : '—'
  const firstReorder = lowStockItems[0]
  const matchingProducts = stockItems.filter((item) => `${item.name} ${item.sku} ${item.category}`.toLocaleLowerCase().includes(searchTerm.trim().toLocaleLowerCase()))
  const visibleInventory = activeView === 'inventory' && searchTerm.trim() ? matchingProducts : stockItems
  const journeyData = journeyRuns.slice(-7).map((journey, index) => ({
    run: `Run ${journeyRuns.length - Math.min(journeyRuns.length, 7) + index + 1}`,
    units: journey.units,
  }))
  const purchaseCounts = new Map()
  let purchaseJourneyCount = 0
  for (const journey of journeyRuns) {
    const basketProducts = new Set()
    for (const item of journey.basket) {
      const key = item.name.trim().toLocaleLowerCase()
      if (!key) continue
      const count = purchaseCounts.get(key) ?? { journeys: 0, units: 0 }
      count.units += Number.isInteger(item.quantity) && item.quantity > 0 ? item.quantity : 0
      purchaseCounts.set(key, count)
      basketProducts.add(key)
    }
    if (basketProducts.size > 0) {
      purchaseJourneyCount += 1
      for (const key of basketProducts) purchaseCounts.get(key).journeys += 1
    }
  }
  const likelyNextPurchases = stockItems
    .map((item) => ({
      ...item,
      purchaseSignal: purchaseCounts.get(item.name.trim().toLocaleLowerCase()) ?? { journeys: 0, units: 0 },
    }))
    .filter((item) => item.purchaseSignal.journeys > 0)
    .sort((a, b) => b.purchaseSignal.journeys - a.purchaseSignal.journeys || b.purchaseSignal.units - a.purchaseSignal.units)
    .slice(0, 5)
  const purchaseSignalStrength = purchaseJourneyCount >= MIN_PURCHASE_BASKETS_FOR_STEADIER_TREND ? 'steadier' : 'early'
  const journeyRouteCounts = {
    produce: journeyRuns.filter((journey) => journey.route === 'produce').length,
    pantry: journeyRuns.filter((journey) => journey.route === 'pantry').length,
    exit: journeyRuns.filter((journey) => journey.route === 'exit').length,
  }
  const routePath = latestJourney?.route === 'produce'
    ? 'M60 250 C100 235 135 175 205 155 S270 90 340 112 S500 155 650 237'
    : latestJourney?.route === 'pantry'
      ? 'M60 250 C160 265 300 230 440 150 S500 95 510 100 C450 85 340 95 270 105 S440 180 650 237'
      : 'M60 250 C200 270 500 250 650 237'

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const syncViewFromLocation = () => {
      setActiveView(getViewFromHash())
      setMobileNavOpen(false)
    }
    window.addEventListener('popstate', syncViewFromLocation)
    window.addEventListener('hashchange', syncViewFromLocation)
    return () => {
      window.removeEventListener('popstate', syncViewFromLocation)
      window.removeEventListener('hashchange', syncViewFromLocation)
    }
  }, [])

  useEffect(() => {
    let active = true
    fetch('/api/auth/session')
      .then(async (response) => {
        if (!response.ok) return null
        return response.json()
      })
      .then((result) => {
        if (active && result?.admin?.name) setAdminName(result.admin.name)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setAuthChecking(false)
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!adminName) return undefined
    let active = true

    const loadData = async () => {
      try {
        const response = await fetch('/api/data')
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Could not load saved store data.')
        if (!result.initialized) {
          let legacyInventory = []
          try {
            const storedInventory = JSON.parse(localStorage.getItem(INVENTORY_STORAGE_KEY) || '[]')
            if (Array.isArray(storedInventory)) legacyInventory = storedInventory
          } catch {
            legacyInventory = []
          }
          const migration = await fetch('/api/data', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inventory: legacyInventory, journeys: [] }),
          })
          if (!migration.ok) throw new Error('Could not migrate the existing inventory.')
          result.inventory = legacyInventory
          result.journeys = []
          localStorage.removeItem(INVENTORY_STORAGE_KEY)
        }
        if (active) {
          setStockItems(result.inventory)
          setJourneyRuns(result.journeys)
          setDataError('')
          setDataLoaded(true)
        }
      } catch (error) {
        if (active) setDataError(error instanceof Error ? error.message : 'Could not load saved store data.')
      }
    }

    void loadData()
    return () => { active = false }
  }, [adminName])

  useEffect(() => {
    const handleShortcut = (event) => {
      if (event.key === 'Escape') {
        setMobileNavOpen(false)
        setSearchOpen(false)
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === 'k') {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  useEffect(() => {
    if (!adminName || !dataLoaded) return
    const snapshot = JSON.stringify({ inventory: stockItems, journeys: journeyRuns })
    const saveSnapshot = async () => {
      const response = await fetch('/api/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: snapshot,
      })
      if (!response.ok) throw new Error('Could not save your store data.')
      setDataError('')
    }
    saveQueueRef.current = saveQueueRef.current.catch(() => {}).then(saveSnapshot).catch(() => {
      setDataError('Changes could not be saved. Check that the local server is running.')
    })
  }, [adminName, dataLoaded, stockItems, journeyRuns])

  const selectView = (id) => {
    if (!navigation.some((item) => item.id === id)) return
    if (window.location.hash !== `#${id}`) window.history.pushState(null, '', `#${id}`)
    setActiveView(id)
    setMobileNavOpen(false)
    setSearchOpen(false)
  }

  const generateJourney = () => {
    const route = ['produce', 'pantry', 'exit'][Math.floor(Math.random() * 3)]
    const availableProducts = stockItems.filter((item) => item.stock > 0)
    const preferredRouteProducts = route === 'produce'
      ? stockItems.filter((item) => item.category === 'Fresh produce' && item.stock > 0)
      : route === 'pantry'
        ? stockItems.filter((item) => ['Pantry', 'Snacks'].includes(item.category) && item.stock > 0)
        : []
    const routeProducts = route === 'exit'
      ? []
      : preferredRouteProducts.length > 0 ? preferredRouteProducts : availableProducts
    const basket = []

    if (routeProducts.length > 0) {
      const firstProduct = routeProducts[Math.floor(Math.random() * routeProducts.length)]
      basket.push({ ...firstProduct, quantity: Math.min(Math.floor(Math.random() * 3) + 1, firstProduct.stock) })

      const addOnProducts = stockItems.filter((item) => item.sku !== firstProduct.sku && item.stock > 0)
      if (Math.random() < 0.45 && addOnProducts.length > 0) {
        const addOn = addOnProducts[Math.floor(Math.random() * addOnProducts.length)]
        basket.push({ ...addOn, quantity: 1 })
      }
    }

    const units = basket.reduce((total, item) => total + item.quantity, 0)
    const sales = Number(basket.reduce((total, item) => total + item.unitPrice * item.quantity, 0).toFixed(2))
    const routeLabel = route === 'produce' ? 'Produce first' : route === 'pantry' ? 'Pantry first' : 'Straight to exit'
    setJourneyRuns((runs) => [...runs, {
      id: `${Date.now()}-${Math.random()}`,
      route,
      routeLabel,
      basket: basket.map((item) => ({ name: item.name, quantity: item.quantity, unitPrice: item.unitPrice })),
      units,
      sales,
    }])
  }

  const replenishItem = (sku) => {
    setStockItems((items) => items.map((item) => {
      if (item.sku !== sku) return item
      return { ...item, stock: Math.max(item.stock, item.reorder) }
    }))
  }

  const replenishAll = () => {
    setStockItems((items) => items.map((item) => item.stock < item.reorder ? { ...item, stock: item.reorder } : item))
  }

  const submitProduct = (event) => {
    event.preventDefault()
    const name = productDraft.name.trim()
    const stock = Number(productDraft.stock)
    const reorder = Number(productDraft.reorder)
    const unitPrice = Number(productDraft.unitPrice)
    if (!name || !Number.isInteger(stock) || stock < 0 || !Number.isInteger(reorder) || reorder < 1 || !Number.isFinite(unitPrice) || unitPrice < 0) {
      setProductMessage('Enter a product name, non-negative stock, a reorder level above zero, and a valid price.')
      return
    }
    if (stockItems.some((item) => item.sku !== editingSku && item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setProductMessage('A product with that name is already tracked.')
      return
    }

    if (editingSku) {
      setStockItems((items) => items.map((item) => item.sku === editingSku ? { ...item, name, category: productDraft.category, stock, reorder, unitPrice } : item))
    } else {
      const sku = `SKU-${Date.now().toString(36).toUpperCase()}`
      setStockItems((items) => [...items, { sku, name, category: productDraft.category, stock, reorder, unitPrice, demand: '' }])
    }
    setEditingSku('')
    setProductDraft({ name: '', category: 'Fresh produce', stock: '', reorder: '', unitPrice: '' })
    setProductMessage('')
  }

  const editProduct = (item) => {
    setEditingSku(item.sku)
    setProductDraft({ name: item.name, category: item.category, stock: String(item.stock), reorder: String(item.reorder), unitPrice: String(item.unitPrice) })
    setProductMessage('')
  }

  const cancelProductEdit = () => {
    setEditingSku('')
    setProductDraft({ name: '', category: 'Fresh produce', stock: '', reorder: '', unitPrice: '' })
    setProductMessage('')
  }

  const removeProduct = (item) => {
    setRemoveCandidate(item)
  }

  const confirmRemoveProduct = () => {
    if (!removeCandidate) return
    const sku = removeCandidate.sku
    setStockItems((items) => items.filter((item) => item.sku !== sku))
    setSearchTerm('')
    if (editingSku === sku) cancelProductEdit()
    setRemoveCandidate(null)
  }

  const exportInventory = () => {
    const rows = [['SKU', 'Product', 'Category', 'On hand', 'Reorder at', 'Unit price'], ...stockItems.map((item) => [item.sku, item.name, item.category, item.stock, item.reorder, item.unitPrice])]
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'store-inventory.csv'
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
  }

  const openProductFromSearch = (product) => {
    setSearchTerm(product.name)
    setSearchOpen(false)
    selectView('inventory')
  }

  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    setAdminName('')
    setDataLoaded(false)
    window.history.replaceState(null, '', '#overview')
    setActiveView('overview')
  }

  const authenticateAdmin = (name) => {
    setDataLoaded(false)
    setAdminName(name)
  }

  if (authChecking) {
    return <main className="auth-screen"><section className="auth-main"><div className="auth-card"><span className="auth-eyebrow">KINETIX</span><h1>Checking admin session</h1></div></section></main>
  }

  if (!adminName) {
    return <AdminAuth onAuthenticated={authenticateAdmin} />
  }

  if (!dataLoaded) {
    return <main className="auth-screen"><section className="auth-main"><div className="auth-card"><span className="auth-eyebrow">KINETIX</span><h1>{dataError || 'Loading saved store data...'}</h1></div></section></main>
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#overview" onClick={(event) => { event.preventDefault(); selectView('overview') }}>
          <span className="brand-mark"><Command size={17} strokeWidth={2.4} /></span>
          <span>kinetix<span className="brand-period">.</span><small>RETAIL INTELLIGENCE</small></span>
        </a>
        <div className="store-select store-select-empty" aria-hidden="true" />
        <div className="nav-label">WORKSPACE</div>
        <nav id="main-navigation" className="main-nav" aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${activeView === id ? 'selected' : ''}`} aria-current={activeView === id ? 'page' : undefined} onClick={() => selectView(id)}>
              <Icon size={17} strokeWidth={1.8} /><span>{label}</span>
                {id === 'inventory' && lowStockItems.length > 0 && <span className="nav-count">{lowStockItems.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
            <div className="model-health"><span className="pulse-dot" /><span><strong>Model services</strong><small>Not connected</small></span><button className="sidebar-more" aria-label="Model service details" aria-expanded={servicesOpen} onClick={() => setServicesOpen((open) => !open)}><Ellipsis size={16} /></button>{servicesOpen && <div className="service-popover"><strong>Demo environment</strong><span>Inventory tools are available. AI model connections are not configured.</span></div>}</div>
          <button className="nav-item" onClick={() => setUtilityPanel('settings')}><Settings2 size={17} strokeWidth={1.8} /><span>Settings</span></button>
          <button className="nav-item" onClick={() => setUtilityPanel('help')}><CircleHelp size={17} strokeWidth={1.8} /><span>Help center</span></button>
          <div className="profile-row"><span className="profile-avatar">{adminName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span><span><strong>{adminName}</strong><small>Administrator</small></span><button className="sign-out-button" aria-label="Log out" title="Log out" onClick={signOut}><LogOut size={16} /></button></div>
        </div>
      </aside>
      {mobileNavOpen && <button className="mobile-nav-backdrop" type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}

      <main className="main-panel">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileNavOpen((open) => !open)} aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileNavOpen} aria-controls="main-navigation"><Menu size={19} /></button>
          <div className="breadcrumbs"><strong>{navigation.find((item) => item.id === activeView)?.label}</strong></div>
          <div className="topbar-actions">
            <div className="search-wrap">
              <label className="search-box"><Search size={16} /><input ref={searchInputRef} aria-label="Search inventory" placeholder="Search inventory..." value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setSearchOpen(true) }} onFocus={() => setSearchOpen(true)} onKeyDown={(event) => { if (event.key === 'Enter' && searchTerm.trim()) { event.preventDefault(); selectView('inventory') } if (event.key === 'Escape') setSearchOpen(false) }} /><kbd>⌘ K</kbd></label>
              {searchOpen && searchTerm.trim() && <div className="search-results" role="listbox" aria-label="Inventory search results">{matchingProducts.length ? matchingProducts.slice(0, 6).map((product) => <button key={product.sku} role="option" aria-selected="false" onClick={() => openProductFromSearch(product)}><ShoppingBasket size={14} /><span><strong>{product.name}</strong><small>{product.sku} · {product.category}</small></span></button>) : <div className="search-empty">No matching products.</div>}</div>}
            </div>
            <div className="notification-wrap">
              <button className="icon-button notification-button" aria-label={`Notifications${lowStockItems.length ? `, ${lowStockItems.length} low stock` : ''}`} aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)}><Bell size={18} />{lowStockItems.length > 0 && <i />}</button>
              {notificationsOpen && <div className="notification-popover"><div className="popover-heading"><strong>Inventory alerts</strong><span>{lowStockItems.length}</span></div>{lowStockItems.length ? lowStockItems.map((item) => <button className="notification-item" key={item.sku} onClick={() => { setSearchTerm(item.name); setNotificationsOpen(false); selectView('inventory') }}><span className="notification-alert-dot" /><span><strong>{item.name}</strong><small>{item.stock} on hand · reorder at {item.reorder}</small></span></button>) : <div className="notification-empty">No products need replenishment.</div>}</div>}
            </div>
            <span className="topbar-divider" />
            <span className="today-label"><Clock3 size={15} /> {now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          </div>
        </header>

        <div className="content-area">
          {dataError && <div className="persistence-notice" role="alert">{dataError}</div>}
          <div className="page-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" />{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}</div>
              <h1 ref={pageHeadingRef} tabIndex={-1}>{pageTitle}</h1>
              <p>{currentView.subtitle}</p>
            </div>
            <div className="heading-actions">
              <span className="status-pill warning">Demo data</span>
              {activeView === 'inventory' && <button className="button-secondary" onClick={exportInventory}><Download size={15} /> Export inventory</button>}
            </div>
          </div>

          {(activeView === 'overview' || activeView === 'inventory') && (
            <>
              <div className="metrics-note"><Sparkles size={14} /><span>Demo data · Sales and units come from simulated journeys, not live transactions. Simulations do not change inventory stock.</span></div>
              <section className="metrics-grid" aria-label="Store performance">
                <MetricCard label="Net sales" value={netSales.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} change={journeyRuns.length ? `${journeyRuns.length} journeys` : 'No runs yet'} note="simulated baskets" icon={Activity} tone="green" />
                <MetricCard label="Units sold" value={unitsSold.toLocaleString('en-US')} change={journeyRuns.length ? `${journeyRuns.length} journeys` : 'No runs yet'} note="simulated purchases" icon={ShoppingBasket} tone="amber" />
                <MetricCard label="Inventory health" value={inventoryHealth} change={`${currentStockTotal} units`} note="of reorder target" icon={PackageCheck} tone="blue" />
                <MetricCard label="Items to replenish" value={lowStockItems.length.toString()} change={`${urgentCount} urgent`} note={`across ${trackedCategories} categories`} icon={Boxes} tone="rose" direction="down" />
              </section>
            </>
          )}

          {(activeView === 'overview' || activeView === 'demand') && (
            <section className="primary-grid">
              <article className="panel demand-panel">
                <div className="panel-heading">
                  <div><span className="panel-kicker">SIMULATED SALES</span><h2>Journey activity</h2></div>
                </div>
                <div className="chart-summary"><strong>{unitsSold.toLocaleString('en-US')}</strong><span>units from {journeyRuns.length} journeys</span></div>
                <p className="simulation-note">Synthetic baskets are for analysis only; they do not deduct from on-hand inventory.</p>
                <DemandChart detailed={activeView === 'demand'} data={journeyData} />
                <div className="chart-footnote"><span><span className="mini-status" />LSTM forecast requires historical data</span><span>Saved demo history</span></div>
              </article>
              <article className="panel action-panel">
                <div className="panel-heading">
                  <div><span className="panel-kicker">NEEDS ATTENTION</span><h2>Replenishment queue <span className="count-badge">{lowStockItems.length}</span></h2></div>
                  <button className="text-action" onClick={() => selectView('inventory')}>View all</button>
                </div>
                <div className="replenishment-list">
                  {lowStockItems.slice(0, 3).map((item) => (
                    <div className="replenishment-item" key={item.sku}>
                      <span className="product-mark critical"><ShoppingBasket size={15} /></span>
                      <div className="replenishment-copy"><strong>{item.name}</strong><small>{item.stock} on hand · reorder at {item.reorder}</small></div>
                      <span className="severity critical"><i />{item.stock === 0 ? 'Out of stock' : 'Reorder'}</span>
                    </div>
                  ))}
                </div>
                <div className="suggestion-box"><Sparkles size={16} /><span><strong>Suggested replenishment</strong><small>{firstReorder ? `${firstReorder.name} · ${Math.max(0, firstReorder.reorder - firstReorder.stock)} units to reorder` : 'All tracked items are above reorder level'}</small></span><button aria-label="Review suggested order" onClick={() => selectView('inventory')}>Review</button></div>
              </article>
            </section>
          )}

          {(activeView === 'overview' || activeView === 'inventory') && (
            <>
              {activeView === 'inventory' && <section className="panel product-form-panel">
                <div className="panel-heading"><div><span className="panel-kicker">STORE CATALOG</span><h2>{editingSku ? 'Edit product' : 'Add a store product'}</h2></div></div>
                <form className="product-form" onSubmit={submitProduct}>
                  <label><span>Product name</span><input required value={productDraft.name} onChange={(event) => setProductDraft((draft) => ({ ...draft, name: event.target.value }))} placeholder="Enter a product name" /></label>
                  <label><span>Category</span><select value={productDraft.category} onChange={(event) => setProductDraft((draft) => ({ ...draft, category: event.target.value }))}><option>Fresh produce</option><option>Pantry</option><option>Snacks</option><option>Dairy alternatives</option><option>Household</option><option>Other</option></select></label>
                  <label><span>Opening stock</span><input required type="number" min="0" step="1" value={productDraft.stock} onChange={(event) => setProductDraft((draft) => ({ ...draft, stock: event.target.value }))} placeholder="0" /></label>
                  <label><span>Reorder at</span><input required type="number" min="1" step="1" value={productDraft.reorder} onChange={(event) => setProductDraft((draft) => ({ ...draft, reorder: event.target.value }))} placeholder="1" /></label>
                  <label><span>Unit price ($)</span><input required type="number" min="0" step="0.01" value={productDraft.unitPrice} onChange={(event) => setProductDraft((draft) => ({ ...draft, unitPrice: event.target.value }))} placeholder="0.00" /></label>
                  <div className="product-form-actions"><button className="button-primary" type="submit"><Plus size={15} />{editingSku ? 'Save changes' : 'Add product'}</button>{editingSku && <button className="button-secondary" type="button" onClick={cancelProductEdit}>Cancel</button>}</div>
                </form>
                {productMessage && <p className="form-message" role="status">{productMessage}</p>}
              </section>}
              <section className="panel inventory-panel">
                <div className="panel-heading">
                  <div><span className="panel-kicker">STOCK MONITOR</span><h2>{activeView === 'inventory' ? 'All tracked products' : 'Inventory watchlist'}</h2></div>
                  <div className="panel-heading-actions">
                    <span className="updated-label"><span className="mini-status" />{activeView === 'inventory' && searchTerm.trim() ? `Showing ${visibleInventory.length} of ${stockItems.length} products` : `${stockItems.length} products`}</span>
                    {activeView === 'inventory' && searchTerm.trim() && <button className="text-action" onClick={() => setSearchTerm('')}>Show all</button>}
                    {activeView === 'inventory' && <button className="button-secondary replenish-all-button" disabled={lowStockItems.length === 0} onClick={replenishAll}><PackageCheck size={14} /> Replenish all</button>}
                    {activeView === 'overview' && <button className="text-action" onClick={() => selectView('inventory')}>Manage inventory</button>}
                  </div>
                </div>
                <InventoryTable compact={activeView === 'overview'} inventory={activeView === 'overview' ? stockItems : visibleInventory} emptyMessage={activeView === 'inventory' && searchTerm.trim() ? 'No products match your search' : 'No products added yet'} onReplenish={replenishItem} onEdit={editProduct} onRemove={removeProduct} />
              </section>
            </>
          )}

          {activeView === 'customers' && (
            <div className="customer-signals-grid">
              <section className="panel customer-panel">
                <div className="panel-heading"><div><span className="panel-kicker">CATALOG · SYNTHETIC JOURNEYS</span><h2>Likely next purchases</h2></div><span className={`status-pill ${purchaseSignalStrength === 'steadier' ? 'healthy' : 'warning'}`}>{purchaseSignalStrength === 'steadier' ? 'More history' : 'Early signal'}</span></div>
                <p className="panel-description">Products are ranked by how often they appear in your generated shopping baskets. History: {purchaseJourneyCount} shopping {purchaseJourneyCount === 1 ? 'basket' : 'baskets'}; {purchaseSignalStrength === 'early' ? `collect at least ${MIN_PURCHASE_BASKETS_FOR_STEADIER_TREND} baskets for a steadier trend. ` : ''}This is not an individual prediction.</p>
                {likelyNextPurchases.length > 0 ? (
                  <div className="purchase-signal-list">
                    {likelyNextPurchases.map((item, index) => (
                      <div className="purchase-signal-row" key={item.sku}>
                        <span className="purchase-rank">{index + 1}</span>
                        <span className="product-mark healthy"><ShoppingBasket size={15} /></span>
                        <span className="purchase-product"><strong>{item.name}</strong><small>{item.category}</small></span>
                        <span className="purchase-frequency">In {item.purchaseSignal.journeys} / {purchaseJourneyCount} baskets</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="purchase-signal-empty">
                    <ShoppingBasket size={20} />
                    <strong>{stockItems.length ? 'No purchase patterns yet' : 'Add products to get started'}</strong>
                    <span>{stockItems.length ? 'Generate synthetic journeys that include your products to build these trends.' : 'Add products to your inventory, then generate synthetic journeys to see product trends.'}</span>
                    <button className="button-secondary" onClick={() => selectView(stockItems.length ? 'journeys' : 'inventory')}>{stockItems.length ? 'Generate journeys' : 'Go to inventory'}</button>
                  </div>
                )}
              </section>
              <section className="panel customer-availability-panel">
                <div className="panel-heading"><div><span className="panel-kicker">CUSTOMER-LEVEL SIGNALS</span><h2>Likely next customers</h2></div><span className="status-pill warning">Not available</span></div>
                <p>Generated journeys contain anonymous simulated routes and baskets, not real customer identities.</p>
                <p>Individual customer predictions need consented customer or transaction data. The demo camera feed is not connected and, by itself, cannot show what an identifiable person is likely to buy.</p>
              </section>
            </div>
          )}

          {activeView === 'vision' && (
            <section className="vision-grid">
              <article className="panel vision-feed">
                <div className="panel-heading"><div><span className="panel-kicker">YOLO OBJECT DETECTION</span><h2>Store camera overview</h2></div><span className="status-pill warning"><i className="status-dot" />Demo feed</span></div>
                <div className="camera-placeholder"><div className="camera-grid" /><div className="camera-aisle"><span className="detect-box detect-one"><b>Person · 0.94</b></span><span className="detect-box detect-two"><b>Shelf gap · 0.87</b></span><span className="detect-box detect-three"><b>Product · 0.91</b></span></div><div className="camera-label"><Camera size={15} /> AISLE 03 · SAMPLE FRAME</div></div>
                <div className="camera-caption"><span>Model: YOLO · Detection preview</span><span>Not connected to a live camera</span></div>
              </article>
              <article className="panel detection-panel"><div className="panel-heading"><div><span className="panel-kicker">TODAY · SAMPLE COUNTS</span><h2>Detection summary</h2></div></div><div className="detection-stat"><span className="detection-icon peach"><UsersRound size={17} /></span><span><strong>286</strong><small>Footfall detected</small></span><em>+12% vs. avg.</em></div><div className="detection-stat"><span className="detection-icon mint"><ScanLine size={17} /></span><span><strong>7</strong><small>Shelf gaps flagged</small></span><em className="em-warning">3 need review</em></div><div className="detection-stat"><span className="detection-icon blue"><Boxes size={17} /></span><span><strong>94.2%</strong><small>Estimated shelf availability</small></span><em>Target 96%</em></div><div className="demo-note">All detections shown here are sample data until a camera feed and trained weights are connected.</div></article>
            </section>
          )}

          {activeView === 'journeys' && (
            <section className="journey-grid">
              <article className="panel journey-panel">
                <div className="panel-heading">
                  <div><span className="panel-kicker">GAN-INSPIRED SYNTHETIC DATA</span><h2>Customer movement simulation</h2></div>
                  <button className="button-primary" onClick={generateJourney}><Sparkles size={15} /> Generate paths</button>
                </div>
                <div className={`journey-map variant-${journeyRuns.length % 3}`}>
                  <div className="map-zone entrance">ENTRANCE</div>
                  <div className="map-zone produce">PRODUCE</div>
                  <div className="map-zone pantry">PANTRY</div>
                  <div className="map-zone checkout">EXIT</div>
                  <svg viewBox="0 0 720 300" preserveAspectRatio="none" aria-label={latestJourney ? `${latestJourney.routeLabel} route` : 'No generated customer path'}>
                    {latestJourney && <path d={routePath} />}
                  </svg>
                  {latestJourney && <><span className="map-pin pin-start" /><span className="map-pin pin-end" /></>}
                </div>
                <div className="journey-footer">
                  <span><i className="journey-key" />{latestJourney ? `${latestJourney.routeLabel} · Run ${journeyRuns.length}` : 'No journey generated yet'}</span>
                  <span>{latestJourney ? `${latestJourney.units} units · ${latestJourney.sales.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}` : 'Choose Generate paths to start'}</span>
                </div>
                {latestJourney && <div className="journey-basket">{latestJourney.basket.length ? latestJourney.basket.map((item) => `${item.quantity} × ${item.name}`).join(' · ') : 'No purchase on this route'}</div>}
              </article>
              <article className="panel journey-insights">
                <div className="panel-heading"><div><span className="panel-kicker">SAVED RESULTS</span><h2>Visit patterns</h2></div></div>
                <div className="journey-stat"><strong>{journeyRuns.length}</strong><span>journeys generated</span></div>
                <div className="route-counts">
                  <div><span>Produce first</span><strong>{journeyRouteCounts.produce}</strong></div>
                  <div><span>Pantry first</span><strong>{journeyRouteCounts.pantry}</strong></div>
                  <div><span>Straight to exit</span><strong>{journeyRouteCounts.exit}</strong></div>
                </div>
                <p className="demo-note">Each run randomly selects one route. Shopping routes create a sample basket; exit-only journeys add no sales. Simulations do not change on-hand inventory.</p>
              </article>
            </section>
          )}

          <footer className="page-footer"><span>Kinetix Intelligence <i>·</i> Prototype</span><span>Model outputs use demo data until connected to real store systems.</span><button className="icon-button subtle" aria-label="More information" onClick={() => setUtilityPanel('help')}><CircleHelp size={16} /></button></footer>
        </div>
      </main>
      {utilityPanel && (
        <div className="utility-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setUtilityPanel('') }}>
          <section ref={utilityDialogRef} className="utility-dialog" role="dialog" aria-modal="true" aria-labelledby="utility-title" tabIndex={-1}>
            <div className="utility-dialog-heading">
              <div><span className="panel-kicker">KINETIX</span><h2 id="utility-title">{utilityPanel === 'settings' ? 'Settings' : 'Help center'}</h2></div>
              <button className="icon-button" aria-label="Close dialog" onClick={() => setUtilityPanel('')}>×</button>
            </div>
            {utilityPanel === 'settings'
              ? <div className="utility-copy"><p>Inventory, stock levels, and synthetic journey history are saved in the local server’s SQLite database.</p><p>Data persists across page reloads and server restarts while the server’s data directory is retained. Sales shown here are simulated, not real transactions. This prototype is not connected to a live AI model service.</p></div>
              : <div className="utility-copy"><p>Add your store items from <strong>Inventory</strong>, including category, opening stock, reorder point, and price.</p><p>Use <strong>Search</strong> to find a product, review low-stock items from the notification bell, and use <strong>Replenish</strong> to restore stock to its reorder target.</p><p>Generate synthetic journeys to see simulated shopping paths and sales from products in your catalog.</p></div>}
            <div className="utility-dialog-actions"><button className="button-primary" onClick={() => setUtilityPanel('')}>Close</button></div>
          </section>
        </div>
      )}
      {removeCandidate && (
        <div className="utility-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setRemoveCandidate(null) }}>
          <section ref={removeDialogRef} className="utility-dialog confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="remove-title" aria-describedby="remove-description" tabIndex={-1}>
            <div className="utility-dialog-heading">
              <div><span className="panel-kicker">REMOVE PRODUCT</span><h2 id="remove-title">Remove {removeCandidate.name}?</h2></div>
              <button className="icon-button" aria-label="Cancel removal" onClick={() => setRemoveCandidate(null)}>×</button>
            </div>
            <p id="remove-description" className="confirm-description">This removes the product from your inventory and cannot be undone. Saved journey history will remain.</p>
            <div className="utility-dialog-actions">
              <button className="button-secondary" onClick={() => setRemoveCandidate(null)}>Cancel</button>
              <button className="button-primary danger-button" onClick={confirmRemoveProduct}>Remove product</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default App
