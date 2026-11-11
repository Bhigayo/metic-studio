import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Session } from "@supabase/supabase-js";
import "./styles.css";
import type { StudioData } from "./model";
import { cloudStore, deviceStore, supabase, type Store } from "./store";
import { StudioProvider, useStudio } from "./studio";
import Inbox from "./Inbox";
import { DropPage, Drops } from "./Drops";
import ProductPage from "./ProductPage";
import BrandPage from "./BrandPage";
import Present from "./Present";
import { go, Wordmark } from "./ui";

// ---------- Routes (after the # so the site works on GitHub Pages) ----------
type Route =
  | { page: "inbox" }
  | { page: "drops" }
  | { page: "drop"; id: string }
  | { page: "product"; id: string }
  | { page: "brand" }
  | { page: "present"; id: string };

function readRoute(): Route {
  const [first, second] = location.hash.replace(/^#\/?/, "").split("/");
  if (first === "drops") return { page: "drops" };
  if (first === "drop" && second) return { page: "drop", id: second };
  if (first === "product" && second) return { page: "product", id: second };
  if (first === "brand") return { page: "brand" };
  if (first === "present" && second) return { page: "present", id: second };
  return { page: "inbox" };
}

function useRoute() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const onChange = () => {
      setRoute(readRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

// ---------- Shell ----------
const NAV = [
  { page: "inbox", href: "#/", label: "Inbox", icon: "✦" },
  { page: "drops", href: "#/drops", label: "Drops", icon: "▦" },
  { page: "brand", href: "#/brand", label: "Brand", icon: "◎" },
] as const;

function Shell({ onSignOut }: { onSignOut?: () => void }) {
  const route = useRoute();
  const studio = useStudio();
  const section = route.page === "drop" || route.page === "product" ? "drops" : route.page;

  if (route.page === "present") return <Present id={route.id} />;

  return (
    <div className="shell">
      <aside className="sidebar">
        <Wordmark />
        <nav>
          {NAV.map((item) => (
            <a key={item.page} href={item.href} className={section === item.page ? "on" : ""} aria-current={section === item.page ? "page" : undefined}>
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
              {item.page === "inbox" && studio.data.notes.length > 0 && <b className="count">{studio.data.notes.length}</b>}
            </a>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className={`save-state ${studio.saving ? "busy" : ""}`}>{studio.saving ? "Saving…" : "All saved"}</span>
          {studio.kind === "device" && <span className="device-note">Saved on this device only</span>}
          {onSignOut && (
            <button className="text-button muted" onClick={onSignOut}>
              Sign out
            </button>
          )}
        </div>
      </aside>

      <header className="topbar">
        <Wordmark />
        <span className={`save-state ${studio.saving ? "busy" : ""}`}>{studio.saving ? "Saving…" : "Saved"}</span>
      </header>

      <main className="content">
        {studio.kind === "device" && (
          <p className="device-banner">
            Saved on this device only. Connect Supabase to sync between your iPhone, iPad and laptop.
          </p>
        )}
        {route.page === "inbox" && <Inbox />}
        {route.page === "drops" && <Drops />}
        {route.page === "drop" && <DropPage id={route.id} />}
        {route.page === "product" && <ProductPage id={route.id} />}
        {route.page === "brand" && <BrandPage />}
      </main>

      {route.page !== "inbox" && (
        <button
          className="fab"
          onClick={() => {
            go("/");
            setTimeout(() => document.querySelector<HTMLTextAreaElement>("#capture textarea")?.focus(), 50);
          }}
          aria-label="Capture an idea"
        >
          +
        </button>
      )}

      <nav className="tabbar" aria-label="Sections">
        {NAV.map((item) => (
          <a key={item.page} href={item.href} className={section === item.page ? "on" : ""}>
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </a>
        ))}
      </nav>

      {studio.error && (
        <div className="toast" role="alert">
          {studio.error}
          <button onClick={studio.clearError} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- Loading, sign-in ----------
function Loader({ store, onSignOut }: { store: Store; onSignOut?: () => void }) {
  const [data, setData] = useState<StudioData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    store.load().then(setData).catch((e) => {
      console.error(e);
      setFailed(true);
    });
  }, [store]);

  if (failed) {
    return (
      <div className="center-screen">
        <Wordmark />
        <p>Couldn't load your studio. Check your connection, and that the Supabase setup script has been run.</p>
        <button className="button" onClick={() => location.reload()}>
          Try again
        </button>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="center-screen">
        <Wordmark />
        <p className="muted">Opening the studio…</p>
      </div>
    );
  }
  return (
    <StudioProvider store={store} initial={data}>
      <Shell onSignOut={onSignOut} />
    </StudioProvider>
  );
}

function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const auth = supabase!.auth;
    const { data, error } = creating
      ? await auth.signUp({ email, password })
      : await auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setMessage(error.message);
    else if (creating && !data.session) setMessage("Check your email to confirm your account, then sign in.");
  }

  return (
    <div className="center-screen">
      <form className="sign-in" onSubmit={submit}>
        <Wordmark />
        <h1>{creating ? "Create your studio" : "Welcome back"}</h1>
        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={creating ? "new-password" : "current-password"}
            minLength={8}
            required
          />
        </label>
        {message && <p className="form-message">{message}</p>}
        <button className="button" disabled={busy}>
          {busy ? "One moment…" : creating ? "Create account" : "Sign in"}
        </button>
        <button type="button" className="text-button" onClick={() => setCreating(!creating)}>
          {creating ? "I already have an account" : "First time? Create your account"}
        </button>
      </form>
    </div>
  );
}

function CloudApp() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [store, setStore] = useState<Store | null>(null);

  useEffect(() => {
    supabase!.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase!.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    setStore(userId ? cloudStore(supabase!, userId) : null);
  }, [userId]);

  if (session === undefined) return null;
  if (!session) return <SignIn />;
  if (!store) return null;
  return <Loader key={userId} store={store} onSignOut={() => supabase!.auth.signOut()} />;
}

const device = supabase ? null : deviceStore();

function App() {
  return supabase ? <CloudApp /> : <Loader store={device!} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Lets the studio be added to the home screen and open offline. Only in the built site.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
