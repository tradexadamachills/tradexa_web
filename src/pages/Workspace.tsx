import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  ArrowUpToLine,
  Bell,
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Eye,
  EyeOff,
  Globe2,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Star,
  Wallet,
  X,
  ChartNoAxesCombined,
  RefreshCw,
} from "lucide-react";
import { Link, NavLink, Navigate, useParams } from "react-router-dom";
import { useAuth } from "../auth";
import {
  AssetIcon,
  Badge,
  Brand,
  Change,
  Chart,
  Empty,
  PageHeading,
} from "../components/ui";
import { supabase, errorMessage, invoke } from "../lib/client";
import { previewCurve } from "./Landing";
import { VerificationPanel } from "./Auth";
import { parseCryptoQuotes, parseServerQuotes } from "../lib/market-quotes";
type Quote = {
  status?: "live" | "delayed" | "closed";
  source?: string;
  asOf?: number;
  symbol: string;
  name: string;
  price: number;
  change: number;
  category: string;
};
type Snapshot = {
  value: number;
  available_balance: number;
  daily_pnl: number;
  daily_change_percent: number;
  recorded_at: string;
  currency?: string | null;
};
const sampleQuotes: Quote[] = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    price: 68245.36,
    change: 2.41,
    category: "Crypto",
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    price: 3528.72,
    change: 1.86,
    category: "Crypto",
  },
  {
    symbol: "XAU",
    name: "Gold",
    price: 2354.65,
    change: -0.38,
    category: "Commodities",
  },
  {
    symbol: "SOL",
    name: "Solana",
    price: 148.29,
    change: 3.24,
    category: "Crypto",
  },
  {
    symbol: "XAG",
    name: "Silver",
    price: 28.42,
    change: 0.72,
    category: "Commodities",
  },
];
export function useMarkets(preview: boolean) {
  const [quotes, setQuotes] = useState<Quote[]>(preview ? sampleQuotes : []),
    [loading, setLoading] = useState(!preview),
    [error, setError] = useState("");
  useEffect(() => {
    if (preview) return;
    let active = true;
    const controller = new AbortController();
    let pending = false;
    async function load() {
      if (pending) return;
      pending = true;
      try {
        let rows: Quote[];
        try {
          rows = parseServerQuotes(await invoke("market-data", { action: "quotes" }));
        } catch {
          // Backend unreachable: public crypto prices only, still no made-up values.
          const response = await fetch(
            "https://data-api.binance.vision/api/v3/ticker/24hr?symbols=" +
              encodeURIComponent(JSON.stringify(["BTCUSDT", "ETHUSDT", "SOLUSDT"])),
            { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]), cache: "no-store" },
          );
          if (!response.ok) throw new Error("Market quotes are unavailable.");
          rows = parseCryptoQuotes(await response.json()).map((q) => ({
            ...q,
            status: "live" as const,
            source: "Binance spot",
          }));
        }
        if (!rows.length) throw new Error("No current quotes are available right now.");
        if (active) {
          setQuotes(rows);
          setError("");
        }
      } catch (e) {
        if (active) {
          setQuotes([]);
          setError(errorMessage(e));
        }
      } finally {
        pending = false;
        if (active) setLoading(false);
      }
    }
    void load();
    const timer = setInterval(() => void load(), 10000);
    return () => {
      active = false;
      controller.abort();
      clearInterval(timer);
    };
  }, [preview]);
  return { quotes, loading, error };
}
function usePortfolio(preview: boolean) {
  const auth = useAuth(),
    [rows, setRows] = useState<Snapshot[]>([]),
    [loading, setLoading] = useState(!preview),
    [error, setError] = useState("");
  const userId = auth.user?.id;
  const refresh = useCallback(async () => {
    if (preview) return;
    if (!supabase || !userId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("portfolio_snapshots")
      .select(
        "value,available_balance,daily_pnl,daily_change_percent,recorded_at,currency",
      )
      .eq("user_id", userId)
      .order("recorded_at", { ascending: false })
      .limit(1000);
    if (error) {
      setRows([]);
      setError("Portfolio data is unavailable. Please retry.");
    } else {
      setRows((data ?? []) as Snapshot[]);
      setError("");
    }
    setLoading(false);
  }, [preview, userId]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { rows, loading, error, refresh };
}
const navigation = [
  { id: "home", label: "Overview", icon: LayoutDashboard },
  { id: "markets", label: "Markets", icon: Globe2 },
  { id: "trade", label: "Trade", icon: ChartNoAxesCombined },
  { id: "portfolio", label: "Portfolio", icon: Wallet },
];
const management = [
  { id: "verification", label: "Verification", icon: ShieldCheck },
  { id: "profile", label: "My profile", icon: Settings2 },
  { id: "security", label: "Security", icon: LockKeyhole },
];
export function Workspace({ preview = false }: { preview?: boolean }) {
  const auth = useAuth(),
    { tab = "home" } = useParams(),
    [mobile, setMobile] = useState(false);
  const root = preview ? "/preview" : "/app";
  const markets = useMarkets(preview),
    portfolio = usePortfolio(preview);
  const name = preview
    ? "Alex"
    : String(
        auth.user?.user_metadata?.full_name ??
          auth.user?.email?.split("@")[0] ??
          "there",
      ).split(" ")[0];
  if (!preview && auth.phase !== "ready")
    return <Navigate to="/login" replace />;
  return (
    <div className="workspace">
      <a className="skip-link" href="#workspace-main">
        Skip to content
      </a>
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <div className="sidebar-brand">
          <Brand />
          <button
            className="icon-button sidebar-close"
            aria-label="Close sidebar"
            onClick={() => setMobile(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="workspace-switch">
          <span className="workspace-avatar">T</span>
          <div>
            <strong>Personal workspace</strong>
            <span>{preview ? "Design preview" : "Your Tradexa account"}</span>
          </div>
          <ChevronDown size={15} />
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav aria-label="Workspace navigation">
          {navigation.map((item) => (
            <NavLink
              end={item.id === "home"}
              key={item.id}
              to={`${root}/${item.id}`}
              onClick={() => setMobile(false)}
              className={({ isActive }) =>
                isActive || (tab === "home" && item.id === "home")
                  ? "sidebar-link active"
                  : "sidebar-link"
              }
            >
              <item.icon size={19} />
              {item.label}
              {item.id === "trade" && <span className="coming-tag">Soon</span>}
            </NavLink>
          ))}
        </nav>
        <span className="nav-label">ACCOUNT</span>
        <nav aria-label="Account navigation">
          {management.map((item) => (
            <NavLink
              key={item.id}
              to={`${root}/${item.id}`}
              onClick={() => setMobile(false)}
              className={({ isActive }) =>
                isActive ? "sidebar-link active" : "sidebar-link"
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <span>
              <Sparkles size={19} />
            </span>
            <strong>A little guidance?</strong>
            <p>Your questions deserve clear answers.</p>
            <Link to={`${root}/help`}>
              Visit help center <ArrowUpRight size={14} />
            </Link>
          </div>
          <Link className="sidebar-link" to={`${root}/help`}>
            <CircleHelp size={18} /> Help & support
          </Link>
          <button
            className="sidebar-link"
            onClick={() =>
              preview ? location.assign("/") : void auth.signOut()
            }
          >
            <LogOut size={18} />
            {preview ? "Exit preview" : "Sign out"}
          </button>
        </div>
      </aside>
      {mobile && (
        <button
          className="sidebar-backdrop"
          aria-label="Close sidebar overlay"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="workspace-body">
        <header className="workspace-topbar">
          <div>
            <button
              className="icon-button mobile-toggle"
              aria-label="Open sidebar"
              onClick={() => setMobile(true)}
            >
              <Menu size={21} />
            </button>
            <span className="breadcrumb">
              Workspace <ChevronRight size={13} />{" "}
              <strong>
                {[
                  ...navigation,
                  ...management,
                  { id: "help", label: "Help & support" },
                  { id: "notifications", label: "Notifications" },
                ].find((item) => item.id === tab)?.label ?? "Overview"}
              </strong>
            </span>
          </div>
          <div className="topbar-actions">
            <span className="connection-pill">
              <span className="status-dot" />
              {preview ? "Preview mode" : "Secure session"}
            </span>
            <Link
              className="icon-button notification-button"
              aria-label="Notifications"
              to={`${root}/notifications`}
            >
              <Bell size={19} />
            </Link>
            <Link
              className="user-avatar"
              to={`${root}/profile`}
              aria-label="Your profile"
            >
              {name[0]?.toUpperCase()}
            </Link>
          </div>
        </header>
        {preview && (
          <div className="preview-banner">
            <span>
              <Sparkles size={14} />
              <strong>Workspace preview</strong> · Sample data. No real account,
              verification or transactions.
            </span>
            <Link to="/login">
              Create your account <ArrowUpRight size={14} />
            </Link>
          </div>
        )}
        <main id="workspace-main" className="workspace-main">
          {tab === "home" ? (
            <Overview
              preview={preview}
              name={name}
              quotes={markets.quotes}
              snapshots={portfolio.rows}
              loading={portfolio.loading}
              error={portfolio.error}
              refresh={portfolio.refresh}
              root={root}
            />
          ) : tab === "markets" ? (
            <Markets {...markets} preview={preview} root={root} />
          ) : tab === "portfolio" ? (
            <Portfolio
              preview={preview}
              rows={portfolio.rows}
              loading={portfolio.loading}
              error={portfolio.error}
            />
          ) : tab === "trade" ? (
            <Trade quotes={markets.quotes} preview={preview} />
          ) : tab === "profile" ? (
            <Profile preview={preview} />
          ) : tab === "security" ? (
            <Security preview={preview} />
          ) : tab === "verification" ? (
            preview ? (
              <PreviewVerification />
            ) : (
              <VerificationPanel />
            )
          ) : tab === "notifications" ? (
            <>
              <PageHeading
                title="Notifications"
                detail="Updates worth your attention."
              />
              <div className="panel">
                <Empty
                  icon={<Bell />}
                  title="All caught up"
                  detail="Important account and verification updates will appear here when a notification source is connected."
                />
              </div>
            </>
          ) : tab === "help" ? (
            <Help preview={preview} />
          ) : (
            <>
              <PageHeading title="Page not found" />
              <Link className="button" to={root}>
                Back to your workspace
              </Link>
            </>
          )}
          <footer className="workspace-footer">
            <span>© {new Date().getFullYear()} Tradexa</span>
            <span>
              <ShieldCheck size={13} /> Your perspective. Protected.
            </span>
            <Link to="/privacy">Privacy information</Link>
          </footer>
        </main>
      </div>
    </div>
  );
}
function Overview({
  preview,
  name,
  quotes,
  snapshots,
  loading,
  error,
  refresh,
  root,
}: {
  preview: boolean;
  name: string;
  quotes: Quote[];
  snapshots: Snapshot[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  root: string;
}) {
  const [hidden, setHidden] = useState(false),
    [period, setPeriod] = useState("1M");
  const latest = snapshots[0];
  const cutoff =
    Date.now() -
    ({ "1D": 1, "1W": 7, "1M": 30, "3M": 90, "1Y": 365, ALL: 99999 }[period] ??
      30) *
      86400000;
  const values = preview
    ? previewCurve
    : snapshots
        .toReversed()
        .filter((row) => Date.parse(row.recorded_at) >= cutoff)
        .map((row) => Number(row.value))
        .filter(Number.isFinite);
  const amount = (value: number | undefined) =>
    hidden
      ? "\u2022\u2022\u2022\u2022\u2022\u2022"
      : value == null
        ? "\u2014"
        : preview || latest?.currency
          ? new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: preview ? "USD" : latest!.currency!,
            }).format(value)
          : `${Number(value).toLocaleString()} units`;
  const [notice, setNotice] = useState("");
  return (
    <>
      <PageHeading
        label="YOUR WORKSPACE, AT A GLANCE"
        title={`Good to see you, ${name}.`}
        detail="A fresh perspective on what matters today."
        action={
          <span className="date-chip">
            {new Intl.DateTimeFormat("en", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }).format(new Date())}
            <ChevronDown size={13} />
          </span>
        }
      />
      <div className="overview-grid">
        <section className="panel portfolio-card">
          <div className="card-top">
            <span>
              <Wallet size={16} /> Total portfolio value
            </span>
            <button
              className="icon-button"
              aria-label={hidden ? "Show balance" : "Hide balance"}
              onClick={() => setHidden(!hidden)}
            >
              {hidden ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          <div className="portfolio-total">
            {amount(preview ? 24680.5 : latest?.value)}
            {!hidden && preview && <Badge tone="green">Sample data</Badge>}
          </div>
          <div className="portfolio-meta">
            <span>
              Today’s change{" "}
              <strong className="positive">
                {preview
                  ? "+$342.80 (+1.41%)"
                  : latest
                    ? `${amount(latest.daily_pnl)} (${Number(latest.daily_change_percent).toFixed(2)}%)`
                    : "Not available yet"}
              </strong>
            </span>
            <span className="available">
              <i /> Available balance{" "}
              <strong>
                {amount(preview ? 8240 : latest?.available_balance)}
              </strong>
            </span>
          </div>
          <div className="performance-header">
            <h3>Portfolio performance</h3>
            <div className="periods">
              {["1D", "1W", "1M", "3M", "1Y", "ALL"].map((value) => (
                <button
                  aria-pressed={period === value}
                  key={value}
                  className={period === value ? "selected" : ""}
                  onClick={() => setPeriod(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="loading-state">
              <RefreshCw className="spin" size={20} /> Loading portfolio?
            </div>
          ) : error ? (
            <div className="inline-error">
              {error}
              <button onClick={() => void refresh()}>Retry</button>
            </div>
          ) : (
            <Chart values={values} preview={preview} />
          )}
        </section>
        <aside className="overview-right">
          <section className="panel quick-actions">
            <div className="card-top">
              <h3>Quick actions</h3>
              <span className="micro">YOUR NEXT MOVE</span>
            </div>
            <div className="quick-grid">
              {[
                { icon: ArrowUpRight, label: "Trade", detail: "Coming soon" },
                { icon: Globe2, label: "Markets", detail: "Explore assets" },
                {
                  icon: ArrowDownToLine,
                  label: "Deposit",
                  detail: "Not enabled",
                },
                {
                  icon: ArrowUpToLine,
                  label: "Withdraw",
                  detail: "Not enabled",
                },
              ].map((item) =>
                item.label === "Markets" ? (
                  <Link key={item.label} to={`${root}/markets`}>
                    <span>
                      <item.icon size={21} />
                    </span>
                    <strong>{item.label}</strong>
                    <small>{item.detail}</small>
                  </Link>
                ) : (
                  <button
                    key={item.label}
                    onClick={() =>
                      setNotice(`${item.label} is not enabled in this release.`)
                    }
                  >
                    <span>
                      <item.icon size={21} />
                    </span>
                    <strong>{item.label}</strong>
                    <small>{item.detail}</small>
                  </button>
                ),
              )}
            </div>
            {notice && (
              <p className="action-notice" role="status">
                {notice}
              </p>
            )}
          </section>
          <section className="account-confidence">
            <div className="confidence-icon">
              <ShieldCheck size={21} />
            </div>
            <div>
              <h3>
                {preview
                  ? "Security at every step"
                  : "Your account is verified"}
              </h3>
              <p>
                {preview
                  ? "A look at the security built into your journey."
                  : "Document screening and admin review completed."}
              </p>
              <Link to={`${root}/security`}>
                View account security <ArrowRight size={13} />
              </Link>
            </div>
          </section>
        </aside>
      </div>
      <div className="overview-lower">
        <section className="panel market-panel">
          <div className="card-top">
            <div>
              <h3>Market overview</h3>
              <p>
                {preview
                  ? "Sample quotes for the interface preview."
                  : "A view of your connected markets."}
              </p>
            </div>
            <Link className="text-link" to={`${root}/markets`}>
              View all markets <ArrowUpRight size={15} />
            </Link>
          </div>
          <QuoteTable
            quotes={quotes.slice(0, 4)}
            preview={preview}
            root={root}
          />
        </section>
        <section className="panel watchlist-panel">
          <div className="card-top">
            <h3>Your watchlist</h3>
            <Link
              className="icon-button"
              to={`${root}/markets`}
              aria-label="Manage watchlist"
            >
              <Plus size={17} />
            </Link>
          </div>
          {preview ? (
            <div className="watchlist">
              {quotes.slice(0, 3).map((q) => (
                <div key={q.symbol}>
                  <AssetIcon symbol={q.symbol} />
                  <span>
                    <strong>{q.name}</strong>
                    <small>{q.symbol}</small>
                  </span>
                  <Change value={q.change} />
                </div>
              ))}
            </div>
          ) : (
            <Empty
              icon={<Star size={25} />}
              title="Make it your market"
              detail="Visit Markets to star the assets you want to follow."
            />
          )}
          <Link className="watchlist-footer" to={`${root}/markets`}>
            Explore your markets <ArrowRight size={14} />
          </Link>
        </section>
      </div>
      <section className="insight-banner">
        <span className="insight-icon">
          <BookOpen size={26} />
        </span>
        <div>
          <span className="micro">A LITTLE KNOWLEDGE GOES A LONG WAY</span>
          <h3>Clarity before every decision.</h3>
          <p>
            Understand your account, verification and the tools in your
            workspace.
          </p>
        </div>
        <Link className="button button-ghost" to={`${root}/help`}>
          Explore the help center <ArrowUpRight size={16} />
        </Link>
      </section>
    </>
  );
}
function QuoteTable({
  quotes,
  preview,
  root,
}: {
  quotes: Quote[];
  preview: boolean;
  root: string;
}) {
  return quotes.length ? (
    <div className="table-scroll">
      <table className="market-table">
        <thead>
          <tr>
            <th>Asset</th>
            <th>Price {preview ? "Sample" : "USD"}</th>
            <th>24h change</th>
            <th className="category-cell">Market</th>
            <th>
              <span className="sr-only">Details</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {quotes.map((quote) => (
            <tr key={quote.symbol}>
              <td>
                <div className="asset-cell">
                  <AssetIcon symbol={quote.symbol} />
                  <span>
                    <strong>{quote.name}</strong>
                    <small>{quote.symbol}</small>
                  </span>
                </div>
              </td>
              <td className="price">
                {preview ? "$" : ""}
                {quote.price.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                {quote.asOf && (
                  <small className="quote-time">
                    {quote.status === "closed"
                      ? "Market closed"
                      : quote.status === "delayed"
                        ? "Delayed"
                        : "Live"}{" "}
                    · {quote.source ?? "Binance spot"} ·{" "}
                    {new Date(quote.asOf).toLocaleTimeString()}
                  </small>
                )}
              </td>
              <td>
                <Change value={quote.change} />
              </td>
              <td className="category-cell">
                <Badge>{quote.category}</Badge>
              </td>
              <td>
                <Link
                  className="icon-button"
                  to={`${root}/trade?asset=${quote.symbol}`}
                  aria-label={`Explore ${quote.name}`}
                >
                  <ArrowUpRight size={17} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty
      icon={<Globe2 size={26} />}
      title="Market quotes are unavailable"
      detail="No placeholder prices are substituted. Live quotes will appear when the data source is available."
    />
  );
}
function Markets({
  quotes,
  loading,
  error,
  preview,
  root,
}: {
  quotes: Quote[];
  loading: boolean;
  error: string;
  preview: boolean;
  root: string;
}) {
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("All markets"),
    [favorites, setFavorites] = useState<string[]>(() => {
      try {
        return JSON.parse(
          localStorage.getItem("tradexa.watchlist") ?? "[]",
        ) as string[];
      } catch {
        return [];
      }
    });
  const filtered = quotes.filter(
    (q) =>
      (category === "All markets" ||
        (category === "Watchlist" && favorites.includes(q.symbol)) ||
        category === q.category) &&
      `${q.name} ${q.symbol}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        label="A WIDER PERSPECTIVE"
        title="Find your market."
        detail={
          preview
            ? "Illustrative prices. Explore the interface without making a transaction."
            : "Public crypto market quotes. Other markets require a configured backend source."
        }
      />
      <div className="market-summaries">
        {quotes.slice(0, 3).map((q) => (
          <div className="panel" key={q.symbol}>
            <AssetIcon symbol={q.symbol} />
            <h3>
              {q.name}
              <span>{q.symbol}</span>
            </h3>
            <strong>${q.price.toLocaleString()}</strong>
            <Change value={q.change} />
          </div>
        ))}
      </div>
      <div className="panel">
        <div className="market-toolbar">
          <div className="filter-tabs">
            {["All markets", "Watchlist", "Crypto", "Commodities"].map(
              (value) => (
                <button
                  key={value}
                  className={category === value ? "selected" : ""}
                  onClick={() => setCategory(value)}
                >
                  {value}
                </button>
              ),
            )}
          </div>
          <label className="search-field">
            <Search size={16} />
            <span className="sr-only">Search markets</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search markets"
            />
          </label>
        </div>
        {loading ? (
          <div className="loading-state">Loading market quotes?</div>
        ) : error ? (
          <p className="inline-error">{error}</p>
        ) : (
          <QuoteTable quotes={filtered} preview={preview} root={root} />
        )}
        <div className="watchlist-controls">
          {filtered.map((q) => (
            <button
              key={q.symbol}
              className="chip-button"
              aria-pressed={favorites.includes(q.symbol)}
              onClick={() => {
                const next = favorites.includes(q.symbol)
                  ? favorites.filter((v) => v !== q.symbol)
                  : [...favorites, q.symbol];
                setFavorites(next);
                localStorage.setItem("tradexa.watchlist", JSON.stringify(next));
              }}
            >
              <Star
                size={13}
                fill={favorites.includes(q.symbol) ? "currentColor" : "none"}
              />
              {q.symbol}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
function Portfolio({
  preview,
  rows,
  loading,
  error,
}: {
  preview: boolean;
  rows: Snapshot[];
  loading: boolean;
  error: string;
}) {
  return (
    <>
      <PageHeading
        label="YOUR ENTIRE PICTURE"
        title="Your portfolio."
        detail="A considered view of balances and account performance."
      />
      <div className="panel">
        <div className="card-top">
          <h3>Account performance</h3>
          <Badge tone="blue">
            {preview ? "Sample visualization" : "Account data"}
          </Badge>
        </div>
        {loading ? (
          <div className="loading-state">Loading your portfolio?</div>
        ) : error ? (
          <p className="inline-error">{error}</p>
        ) : (
          <Chart
            values={
              preview
                ? previewCurve
                : rows.toReversed().map((row) => Number(row.value))
            }
            preview={preview}
          />
        )}
      </div>
      <div className="panel spaced">
        <Empty
          icon={<Wallet size={30} />}
          title="No connected positions"
          detail="Positions and holdings will appear after an authorized broker or portfolio source is connected. No live trading is enabled."
        />
      </div>
    </>
  );
}
function Trade({ quotes, preview }: { quotes: Quote[]; preview: boolean }) {
  const [side, setSide] = useState("Buy"),
    [size, setSize] = useState("1");
  const selected = new URLSearchParams(location.search).get("asset") ?? "BTC";
  const asset = quotes.find((q) => q.symbol === selected) ?? quotes[0];
  return (
    <>
      <PageHeading
        label="YOUR TRADING WORKSPACE"
        title="A closer look."
        detail="Explore the layout. Order execution is intentionally disabled."
      />
      <div className="trade-grid">
        <section className="panel">
          <div className="card-top">
            <div className="asset-cell">
              <AssetIcon symbol={asset?.symbol ?? "BTC"} />
              <div>
                <h3>{asset?.name ?? "Bitcoin"}</h3>
                <p>{asset?.symbol ?? "BTC"} / USDT</p>
              </div>
            </div>
            <Badge tone="amber">{preview ? "Sample data" : "Read only"}</Badge>
          </div>
          <Chart values={preview ? previewCurve : []} preview={preview} />
          <div className="trade-note">
            <LockKeyhole size={15} /> Charts require an authorized historical
            data feed.
          </div>
        </section>
        <section className="panel order-panel">
          <h3>Order ticket</h3>
          <div className="side-tabs">
            {["Buy", "Sell"].map((item) => (
              <button
                key={item}
                className={side === item ? "selected" : ""}
                onClick={() => setSide(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <label htmlFor="order-size">Quantity</label>
          <input
            id="order-size"
            type="number"
            min="0.001"
            step="0.001"
            value={size}
            onChange={(e) => setSize(e.target.value)}
          />
          <div className="order-summary">
            <span>
              Order type<strong>Market</strong>
            </span>
            <span>
              Execution<strong>Not enabled</strong>
            </span>
            <span>
              Risk checks<strong>Required before launch</strong>
            </span>
          </div>
          <button className="button full" disabled>
            Live trading is not enabled <LockKeyhole size={15} />
          </button>
          <p className="small-muted">
            No order, payment or balance change will be created.
          </p>
        </section>
      </div>
    </>
  );
}
function Profile({ preview }: { preview: boolean }) {
  const auth = useAuth(),
    [name, setName] = useState(
      preview
        ? "Alex Morgan"
        : String(auth.user?.user_metadata?.full_name ?? ""),
    ),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (preview) {
      setNotice("Preview only. Your real profile was not changed.");
      return;
    }
    if (!supabase || !auth.user) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name })
      .eq("id", auth.user.id)
      .select("full_name")
      .single();
    setNotice(
      error ? "Could not save your profile." : "Your profile has been updated.",
    );
    if (!error) await auth.refresh(true);
    setBusy(false);
  }
  return (
    <>
      <PageHeading
        title="Make yourself at home."
        detail="Manage the details behind your account."
      />
      <div className="settings-grid">
        <section className="panel">
          <div className="profile-intro">
            <span className="large-avatar">{name[0] ?? "T"}</span>
            <div>
              <h3>{name || "Your profile"}</h3>
              <p>{preview ? "alex@example.com" : auth.user?.email}</p>
            </div>
            <Badge tone="green">
              {preview ? "Sample profile" : "Verified"}
            </Badge>
          </div>
          <form onSubmit={save} className="settings-form">
            <label htmlFor="full-name">Full name</label>
            <input
              id="full-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={2}
              maxLength={100}
              required
            />
            <label htmlFor="profile-email">Email address</label>
            <input
              id="profile-email"
              value={preview ? "alex@example.com" : (auth.user?.email ?? "")}
              disabled
            />
            <p className="small-muted">
              Email changes require a separate ownership-verification process.
            </p>
            <button className="button" disabled={busy}>
              Save profile
            </button>
            {notice && (
              <p role="status" className="small-muted">
                {notice}
              </p>
            )}
          </form>
        </section>
        <section className="panel">
          <h3>Account status</h3>
          <div className="detail-list">
            <span>
              Email verification
              <Badge tone="green">{preview ? "Preview" : "Verified"}</Badge>
            </span>
            <span>
              Identity screening
              <Badge tone="green">{preview ? "Preview" : "Passed"}</Badge>
            </span>
            <span>
              Admin review
              <Badge tone="green">{preview ? "Preview" : "Approved"}</Badge>
            </span>
            <span>
              Live trading<Badge>Not enabled</Badge>
            </span>
          </div>
        </section>
      </div>
    </>
  );
}
function Security({ preview }: { preview: boolean }) {
  const auth = useAuth();
  return (
    <>
      <PageHeading
        title="Confidence comes from control."
        detail="Your account security, at a glance."
      />
      <div className="panel security-settings">
        {[
          {
            icon: MailIcon,
            title: "Email verification",
            detail:
              "A backend-verified email code is required for account access.",
            status: preview ? "Preview" : "Enabled",
          },
          {
            icon: LockKeyhole,
            title: "Web passcode",
            detail:
              "Six digits, salted PBKDF2 derivation and a local retry lockout.",
            status: preview ? "Preview" : "Enabled",
          },
          {
            icon: ShieldCheck,
            title: "Identity verification",
            detail:
              "Specialist screening followed by an authorized admin review.",
            status: preview ? "Preview" : "Approved",
          },
          {
            icon: Eye,
            title: "Device biometrics",
            detail:
              "Available through the Tradexa mobile app. Not used as identity proof.",
            status: "Mobile app",
          },
        ].map((item) => (
          <div className="security-setting" key={item.title}>
            <span className="setting-icon">
              <item.icon size={21} />
            </span>
            <div>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </div>
            <Badge tone="blue">{item.status}</Badge>
          </div>
        ))}
      </div>
      <div className="panel spaced">
        <h3>This session</h3>
        <p className="small-muted">
          Web sessions stay in this browser tab. Switching away locks the
          workspace. Browser-local passcodes are privacy locks; the backend
          remains responsible for authorization.
        </p>
        <button
          className="button button-ghost"
          onClick={() =>
            preview ? location.assign("/login") : void auth.signOut()
          }
        >
          <LogOut size={16} /> Sign out of this session
        </button>
      </div>
    </>
  );
}
function MailIcon({ size = 20 }: { size?: number }) {
  return <Bell size={size} />;
}
function PreviewVerification() {
  return (
    <>
      <PageHeading
        label="ACCOUNT VERIFICATION"
        title="A clear path to trust."
        detail="This is an interface preview, not a real verification result."
      />
      <div className="panel verification-preview">
        {[
          "Account created",
          "Email ownership verified",
          "Document pre-screening",
          "Live face & liveness checks",
          "Admin document review",
        ].map((title, i) => (
          <div key={title}>
            <span className="step-circle">{i + 1}</span>
            <div>
              <h3>{title}</h3>
              <p>
                {i === 4
                  ? "An authorized reviewer makes the final decision after screening."
                  : "Part of your live account onboarding journey."}
              </p>
            </div>
            <Badge>{i === 4 ? "Human review" : "Account step"}</Badge>
          </div>
        ))}
        <Link className="button" to="/login">
          Start your real verification <ArrowUpRight size={16} />
        </Link>
      </div>
    </>
  );
}
function Help({ preview }: { preview: boolean }) {
  const [subject, setSubject] = useState(""),
    [message, setMessage] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const auth = useAuth();
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (preview) {
      setNotice("Preview only. No message was sent.");
      return;
    }
    if (!supabase || !auth.user) return;
    setBusy(true);
    const { error } = await supabase
      .from("support_tickets")
      .insert({ user_id: auth.user.id, topic: subject, message });
    setNotice(
      error
        ? "Unable to submit your request. Please retry."
        : "Your request was saved for the support team.",
    );
    if (!error) {
      setSubject("");
      setMessage("");
    }
    setBusy(false);
  }
  return (
    <>
      <PageHeading
        title="A little clarity goes a long way."
        detail="Get familiar with your workspace, or ask the support team."
      />
      <div className="help-topics">
        {[
          [
            "Getting started",
            "Email access, passcodes and your first verification.",
          ],
          [
            "Verification & review",
            "What happens before an administrator approves your account.",
          ],
          [
            "Markets & portfolio",
            "Understanding connected data and honest empty states.",
          ],
        ].map(([title, detail]) => (
          <details className="panel" key={title}>
            <summary>
              <BookOpen size={20} />
              {title}
            </summary>
            <p>
              {detail} Live services depend on provider configuration. Trade
              execution and payments remain disabled.
            </p>
          </details>
        ))}
      </div>
      <form className="panel settings-form support-form" onSubmit={submit}>
        <h3>Send a support request</h3>
        <label htmlFor="support-subject">Subject</label>
        <input
          id="support-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          minLength={4}
          maxLength={120}
        />
        <label htmlFor="support-message">How can we help?</label>
        <textarea
          id="support-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          minLength={10}
          maxLength={4000}
          rows={5}
        />
        <button className="button" disabled={busy}>
          {preview ? "Try the preview form" : "Submit request"}
          <ArrowRight size={16} />
        </button>
        {notice && <p role="status">{notice}</p>}
      </form>
    </>
  );
}
export function PublicInfo({ kind }: { kind: "privacy" | "security" }) {
  return (
    <div className="public-info">
      <header className="site-container">
        <Brand />
        <Link className="text-link" to="/">
          Back to the website <ArrowUpRight size={16} />
        </Link>
      </header>
      <main className="site-container">
        <PageHeading
          label="YOUR TRUST MATTERS"
          title={
            kind === "privacy"
              ? "Your information, carefully considered."
              : "Security from the first step."
          }
        />
        <div className="panel prose">
          {kind === "privacy" ? (
            <>
              <h2>What the platform processes</h2>
              <p>
                Tradexa uses your account email, profile details and
                verification references to provide account access. Identity
                documents and live facial captures are processed by the
                configured verification provider. Administrators can inspect
                verification evidence to make a review decision.
              </p>
              <h2>Your browser</h2>
              <p>
                The web app stores its session in this tab?s session storage and
                a salted passcode derivative in local storage. These protect the
                experience on this browser; they do not replace backend
                authentication. Market requests may be sent to a public
                market-data provider.
              </p>
              <h2>Verification and retention</h2>
              <p>
                Review the provider?s privacy notice before consenting. Document
                retention, deletion procedures and the final business privacy
                policy must be configured before production onboarding.
              </p>
              <a
                className="text-link"
                href="https://didit.me/terms/privacy-policy/"
                target="_blank"
                rel="noreferrer"
              >
                Didit provider privacy information ?
              </a>
              <h2>Questions or deletion requests</h2>
              <p>
                Use Help & support in your account. This page describes the
                current implementation and is not a substitute for the
                operator?s final legal privacy notice.
              </p>
            </>
          ) : (
            <>
              <h2>Verified access</h2>
              <p>
                Google or email sign-in is followed by an email verification
                code. The backend validates your session; a browser flag cannot
                approve your account.
              </p>
              <h2>Screening, then human review</h2>
              <p>
                A local model first checks that your upload really is an
                identity document. An authorized administrator then reviews it
                and makes the final decision. Until then you can use the demo.
              </p>
              <h2>Your personal workspace</h2>
              <p>
                A six-digit web passcode adds a browser-local privacy lock.
                Platform biometrics remain part of the mobile experience.
                Trading and payments are not enabled in this release.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
