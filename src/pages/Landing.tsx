import {
  ArrowDown,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  Fingerprint,
  Layers3,
  LockKeyhole,
  Menu,
  MoveUpRight,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import type { PointerEvent } from "react";

function tilt(event: PointerEvent<HTMLElement>) {
  if (
    event.pointerType !== "mouse" ||
    matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return;
  const bounds = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty(
    "--tilt-x",
    `${((event.clientY - bounds.top) / bounds.height - 0.5) * -6}deg`,
  );
  event.currentTarget.style.setProperty(
    "--tilt-y",
    `${((event.clientX - bounds.left) / bounds.width - 0.5) * 8}deg`,
  );
}
function resetTilt(event: PointerEvent<HTMLElement>) {
  event.currentTarget.style.removeProperty("--tilt-x");
  event.currentTarget.style.removeProperty("--tilt-y");
}

import { AssetIcon, Badge, Brand, Chart, SectionTitle } from "../components/ui";
export const previewCurve = [
  22, 26, 23, 30, 28, 32, 27, 35, 32, 36, 33, 48, 45, 52, 48, 54, 45, 50, 56,
  53, 60, 58, 72, 67, 75, 71, 80, 78, 90, 86, 95,
];
const faqs = [
  [
    "Is Tradexa available on the web and mobile?",
    "This web workspace extends the Tradexa mobile experience, with the same account and verification backend. The desktop layout gives your markets and portfolio more room.",
  ],
  [
    "How is my identity verified?",
    "A local model checks whether your upload looks like a supported identity document. An administrator reviews the document and makes the final decision. This does not provide automated authenticity or ownership verification.",
  ],
  [
    "Can I deposit money or place trades?",
    "Deposits, withdrawals and live order execution are not enabled in this release. You can explore the workspace and complete account onboarding when live services are configured.",
  ],
  [
    "What does the workspace preview show?",
    "The public preview uses clearly marked sample data to demonstrate the interface. It is separate from your account and cannot create transactions or approve verification.",
  ],
];
export function Landing() {
  const [menu, setMenu] = useState(false),
    [open, setOpen] = useState<number | null>(0);
  return (
    <div className="landing">
      <header className="site-header">
        <div className="site-container header-inner">
          <Brand />
          <nav
            className={menu ? "site-nav open" : "site-nav"}
            aria-label="Main navigation"
          >
            <a href="#workspace" onClick={() => setMenu(false)}>
              Platform
            </a>
            <a href="#markets" onClick={() => setMenu(false)}>
              Markets
            </a>
            <a href="#security" onClick={() => setMenu(false)}>
              Security
            </a>
            <a href="#questions" onClick={() => setMenu(false)}>
              FAQs
            </a>
          </nav>
          <div className="header-actions">
            <Link className="login-link" to="/login">
              Log in
            </Link>
            <Link className="button button-small" to="/login">
              Get started <ArrowUpRight size={16} />
            </Link>
            <button
              className="icon-button mobile-toggle"
              aria-label={menu ? "Close menu" : "Open menu"}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main>
        <section className="hero site-container">
          <div className="hero-copy">
            <span className="launch-label">
              <span /> A new perspective on trading <ChevronRight size={13} />
            </span>
            <h1>
              See the bigger
              <br />
              picture.
              <br />
              <span>Make your move.</span>
            </h1>
            <p>
              Your markets, your portfolio, your perspective.
              <br className="desktop-break" /> One considered workspace.
              Wherever you are.
            </p>
            <div className="hero-actions">
              <Link className="button" to="/login">
                Open your workspace <ArrowUpRight size={18} />
              </Link>
              <Link className="button button-ghost" to="/preview">
                Explore the platform <ChevronRight size={16} />
              </Link>
            </div>
            <div className="hero-assurances">
              <span>
                <Check size={14} /> One account. Web & mobile.
              </span>
              <span>
                <Check size={14} /> Security comes first.
              </span>
            </div>
          </div>
          <div
            className="hero-visual"
            onPointerMove={tilt}
            onPointerLeave={resetTilt}
            aria-label="Illustrative Tradexa workspace preview"
          >
            <div className="orb orb-one" />
            <div className="hero-floor" aria-hidden="true" />
            <div className="hero-coin" aria-hidden="true">
              <img src="/tradexa-logo.png" alt="" />
              <span>YOUR PERSPECTIVE</span>
            </div>
            <div className="preview-terminal">
              <div className="terminal-top">
                <span className="terminal-brand">&#10035; TRADEXA</span>
                <span className="terminal-dots">&#183;&#183;&#183;</span>
              </div>
              <div className="terminal-layout">
                <div className="terminal-rail">
                  <span className="selected">&#9707;</span>
                  <span>&#8769;</span>
                  <span>&#8644;</span>
                  <span>&#9635;</span>
                  <span>&#9678;</span>
                </div>
                <div className="terminal-main">
                  <div className="terminal-heading">
                    <div>
                      <span className="micro">YOUR WORKSPACE</span>
                      <h3>A little more clarity.</h3>
                    </div>
                    <Badge tone="blue">Preview</Badge>
                  </div>
                  <div className="terminal-balance">
                    <span>Portfolio value · Sample</span>
                    <strong>
                      $24,680<span>.50</span>
                    </strong>
                    <span className="positive terminal-gain">
                      ↗ Illustrative interface
                    </span>
                  </div>
                  <div className="terminal-tabs">
                    <span>Performance</span>
                    <div>
                      <b>1D</b>
                      <b className="selected">1M</b>
                      <b>1Y</b>
                      <b>ALL</b>
                    </div>
                  </div>
                  <Chart values={previewCurve} preview labels={false} />
                  <div className="terminal-assets">
                    {[
                      ["BTC", "Bitcoin"],
                      ["ETH", "Ethereum"],
                      ["XAU", "Gold"],
                    ].map(([symbol, name]) => (
                      <div key={symbol}>
                        <AssetIcon symbol={symbol} />
                        <span>
                          {name}
                          <small>{symbol}</small>
                        </span>
                        <ArrowUpRight size={14} />
                      </div>
                    ))}
                  </div>
                  <div className="micro preview-disclaimer">
                    ILLUSTRATIVE PREVIEW · NOT LIVE ACCOUNT DATA
                  </div>
                </div>
              </div>
            </div>
            <div className="floating-security">
              <span className="security-icon">
                <ShieldCheck size={22} />
              </span>
              <div>
                <strong>Confidence starts with security.</strong>
                <span>Protected access. Verified identities.</span>
              </div>
              <Check size={18} />
            </div>
            <div className="orb orb-two" />
          </div>
        </section>
        <section className="market-ribbon" id="markets">
          <div className="site-container ribbon-inner">
            <span className="ribbon-label">
              A wider world
              <br />
              <strong>of opportunity.</strong>
            </span>
            {[
              ["BTC", "Bitcoin", "Crypto"],
              ["ETH", "Ethereum", "Crypto"],
              ["XAU", "Gold", "Commodities"],
              ["XAG", "Silver", "Commodities"],
              ["WTI", "Crude oil", "Energy"],
            ].map(([symbol, name, category]) => (
              <div className="ribbon-asset" key={symbol}>
                <AssetIcon symbol={symbol} />
                <div>
                  <strong>{name}</strong>
                  <span>{category}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="site-container ribbon-note">
            Market availability depends on connected data sources. Trading is
            not enabled in this release.
          </div>
        </section>
        <section className="site-container workspace-section" id="workspace">
          <div className="section-top">
            <SectionTitle
              eyebrow="BUILT AROUND YOUR PERSPECTIVE"
              title="Less noise. More room to think."
              detail="A connected experience that puts what matters in focus."
            />
            <Link className="text-link" to="/preview">
              Take a look inside <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="feature-grid">
            <article
              className="feature-card feature-large depth-card"
              onPointerMove={tilt}
              onPointerLeave={resetTilt}
            >
              <div className="feature-icon">
                <Layers3 />
              </div>
              <h3>
                Your entire picture.
                <br />
                In one place.
              </h3>
              <p>
                Follow your portfolio, keep an eye on the markets, and move
                between the details without losing the context.
              </p>
              <div className="mini-portfolio">
                <span>PORTFOLIO OVERVIEW</span>
                <div>
                  <i className="allocation one" />
                  <i className="allocation two" />
                  <i className="allocation three" />
                  <i className="allocation four" />
                </div>
                <footer>
                  <span>
                    <i />
                    Crypto
                  </span>
                  <span>
                    <i />
                    Commodities
                  </span>
                  <span>
                    <i />
                    Other
                  </span>
                </footer>
                <small>Illustrative allocation visualization</small>
              </div>
            </article>
            <article
              className="feature-card depth-card"
              onPointerMove={tilt}
              onPointerLeave={resetTilt}
            >
              <div className="feature-icon">
                <MoveUpRight />
              </div>
              <h3>
                From a glance
                <br />
                to the details.
              </h3>
              <p>
                Clear market lists, useful time filters, and a watchlist that
                stays within reach.
              </p>
              <div className="feature-lines">
                <div>
                  <AssetIcon symbol="BTC" />
                  <span>Bitcoin</span>
                  <span className="micro">BTC</span>
                </div>
                <div>
                  <AssetIcon symbol="ETH" />
                  <span>Ethereum</span>
                  <span className="micro">ETH</span>
                </div>
              </div>
            </article>
            <article
              className="feature-card depth-card"
              onPointerMove={tilt}
              onPointerLeave={resetTilt}
            >
              <div className="feature-icon">
                <Fingerprint />
              </div>
              <h3>
                Familiar, wherever
                <br />
                you open it.
              </h3>
              <p>
                The Tradexa experience, adapted for your desktop. A sidebar for
                your workspace, and the same account on mobile.
              </p>
              <div className="devices">
                <div className="device-desktop">
                  <span />
                  <i />
                  <i />
                  <i />
                </div>
                <div className="device-phone">
                  <span />
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            </article>
          </div>
        </section>
        <section className="security-section" id="security">
          <div className="site-container security-grid">
            <div className="security-art">
              <div className="security-orbit orbit-a" />
              <div className="security-orbit orbit-b" />
              <div className="security-center">
                <ShieldCheck size={64} strokeWidth={1.2} />
              </div>
              <span className="orbit-chip chip-a">
                <LockKeyhole size={17} /> Protected access
              </span>
              <span className="orbit-chip chip-b">
                <Fingerprint size={17} /> Identity checks
              </span>
              <span className="orbit-chip chip-c">
                <Check size={16} /> Human review
              </span>
            </div>
            <div>
              <SectionTitle
                eyebrow="A STRONGER FOUNDATION"
                title="Your next move starts with trust."
                detail="Security is part of the journey from your first sign-in, not an afterthought."
              />
              <div className="security-points">
                {[
                  [
                    "01",
                    "Sign in with confidence",
                    "Google or email access, followed by an email verification code.",
                  ],
                  [
                    "02",
                    "An identity, properly verified",
                    "Document screening, then an administrator’s review.",
                  ],
                  [
                    "03",
                    "You stay in control",
                    "A personal passcode, clear account status and transparent verification steps.",
                  ],
                ].map(([n, title, detail]) => (
                  <div key={n}>
                    <span>{n}</span>
                    <div>
                      <h4>{title}</h4>
                      <p>{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link className="text-link" to="/security">
                Explore account security <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
        </section>
        <section className="site-container start-section">
          <SectionTitle
            eyebrow="A CLEAR PATH FORWARD"
            title="Your workspace is a few steps away."
          />
          <div className="steps-grid">
            {[
              [
                "1",
                "Make it yours",
                "Create your account with Google or your email address.",
              ],
              [
                "2",
                "Secure your access",
                "Verify your email and set a personal passcode.",
              ],
              [
                "3",
                "Complete verification",
                "Finish provider screening and wait for admin review.",
              ],
            ].map(([n, title, text]) => (
              <article key={n}>
                <span>{n}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="site-container faq-section" id="questions">
          <SectionTitle
            eyebrow="GOOD QUESTIONS"
            title="A little more clarity."
          />
          <div className="faq-list">
            {faqs.map(([question, answer], i) => (
              <article
                key={question}
                className={open === i ? "faq-item expanded" : "faq-item"}
              >
                <button
                  aria-expanded={open === i}
                  onClick={() => setOpen(open === i ? null : i)}
                >
                  {question}
                  <span aria-hidden="true">{open === i ? "\u2212" : "+"}</span>
                </button>
                {open === i && <p>{answer}</p>}
              </article>
            ))}
          </div>
        </section>
        <section className="site-container final-cta">
          <div className="cta-orb" />
          <span className="eyebrow">
            <Sparkles size={15} /> A CLEARER VIEW STARTS HERE
          </span>
          <h2>
            Your perspective.
            <br />A world of possibilities.
          </h2>
          <Link className="button" to="/login">
            Get started with Tradexa <ArrowUpRight size={17} />
          </Link>
          <p>Explore the interface before creating an account.</p>
          <Link className="text-link" to="/preview">
            Open the workspace preview <ArrowDownLeft size={15} />
          </Link>
        </section>
      </main>
      <footer className="site-footer site-container">
        <div className="footer-main">
          <div>
            <Brand />
            <p>A clearer view of your markets.</p>
          </div>
          <div>
            <strong>Platform</strong>
            <Link to="/preview">Web workspace</Link>
            <Link to="/login">Create an account</Link>
            <a href="#markets">Markets</a>
          </div>
          <div>
            <strong>Resources</strong>
            <Link to="/security">Security</Link>
            <a href="#questions">Help & FAQs</a>
            <Link to="/privacy">Privacy</Link>
          </div>
          <div className="footer-note">
            <span className="status-dot" /> Built with care.
            <p>
              Live trading and payment services are not enabled. Preview data is
              illustrative.
            </p>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} Tradexa. All rights reserved.
          </span>
          <span>Markets involve risk. No returns are guaranteed.</span>
          <a href="#" aria-label="Back to top">
            Back to top{" "}
            <ArrowDown size={13} style={{ transform: "rotate(180deg)" }} />
          </a>
        </div>
      </footer>
    </div>
  );
}
