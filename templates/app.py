"""
AgnosLogic Flask backend.

Runtime deps: see requirements.txt
Environment variables: see .env.example
"""

from flask import Flask, request, jsonify, redirect, render_template, session, abort
from flask_cors import CORS
from functools import wraps
from authlib.integrations.flask_client import OAuth
import requests as http_requests
import hashlib, time, os, sqlite3, statistics
from datetime import datetime, timedelta

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "change-me-in-production")
CORS(app, supports_credentials=True)

# Behind Railway/Cloudflare proxy - trust X-Forwarded-For
app.config['SESSION_COOKIE_SECURE'] = os.environ.get("FLASK_DEBUG") != "1"
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

BASE_URL = os.environ.get("BASE_URL", "http://localhost:5000")
RUNPOD_API_KEY = os.environ.get("RUNPOD_API_KEY", "")
RUNPOD_ENDPOINT_ID = os.environ.get("RUNPOD_ENDPOINT_ID", "")
RUNPOD_BASE = f"https://api.runpod.ai/v2/{RUNPOD_ENDPOINT_ID}"

# Comma-separated emails granted admin access
ADMIN_EMAILS = set(
    e.strip().lower() for e in os.environ.get("ADMIN_EMAILS", "agnosresearch@gmail.com").split(",") if e.strip()
)

PLANS = {
    "free":       {"daily_limit": 15,    "monthly_limit": 450,    "name": "Explorer"},
    "builder":    {"daily_limit": 500,   "monthly_limit": 10000,  "name": "Builder"},
    "enterprise": {"daily_limit": 99999, "monthly_limit": 999999, "name": "Enterprise"},
}

PUBLIC_DEMO_DAILY_LIMIT = 10

# ── Google OAuth ──
oauth = OAuth(app)
google = oauth.register(
    name='google',
    client_id=os.environ.get("GOOGLE_CLIENT_ID", ""),
    client_secret=os.environ.get("GOOGLE_CLIENT_SECRET", ""),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'},
)

# ── Database ──
DB = os.environ.get("DB_PATH", "agnoslogic.db")


def _column_exists(conn, table, col):
    return any(row[1] == col for row in conn.execute(f"PRAGMA table_info({table})").fetchall())


def init_db():
    c = sqlite3.connect(DB)
    c.execute("""CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL, name TEXT, picture TEXT,
        google_id TEXT UNIQUE, api_key TEXT UNIQUE NOT NULL,
        plan TEXT DEFAULT 'free', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")

    c.execute("""CREATE TABLE IF NOT EXISTS usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER, endpoint TEXT, latency_ms REAL, epsilon REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")

    c.execute("""CREATE TABLE IF NOT EXISTS public_demo_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")

    # --- Schema migrations: add new columns to existing usage table ---
    for col_name, col_def in [
        ("verdict", "TEXT"),
        ("category", "TEXT"),
        ("text_sample", "TEXT"),
        ("success", "INTEGER DEFAULT 1"),
        ("error_msg", "TEXT"),
    ]:
        if not _column_exists(c, "usage", col_name):
            c.execute(f"ALTER TABLE usage ADD COLUMN {col_name} {col_def}")

    # Indexes
    c.execute("CREATE INDEX IF NOT EXISTS idx_usage_ud ON usage(user_id, created_at)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_usage_date ON usage(created_at)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_usage_verdict ON usage(verdict)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_users_key ON users(api_key)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_demo_ip ON public_demo_usage(ip_hash, created_at)")
    c.commit(); c.close()


init_db()


def db():
    c = sqlite3.connect(DB); c.row_factory = sqlite3.Row; return c


def gen_key(email):
    return "agnoslogic_" + hashlib.sha256(f"{email}:{app.secret_key}:{time.time()}".encode()).hexdigest()[:32]


def hash_ip(ip):
    return hashlib.sha256(f"{ip}:{app.secret_key}".encode()).hexdigest()[:32]


def get_client_ip():
    fwd = request.headers.get("X-Forwarded-For", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.remote_addr or "unknown"


def category_to_verdict(cat):
    """Map internal category (LOW/MED/HIGH) to user-facing verdict."""
    if cat == "LOW": return "verified"
    if cat == "HIGH": return "flagged"
    return "uncertain"


def truncate_text(s, n=200):
    if not s: return ""
    s = str(s).strip().replace("\n", " ")
    return s[:n] + ("…" if len(s) > n else "")


# ── Auth helpers ──
def current_user():
    uid = session.get("user_id")
    if not uid: return None
    c = db(); u = c.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone(); c.close()
    return dict(u) if u else None


def need_login(f):
    @wraps(f)
    def w(*a, **k):
        u = current_user()
        if not u: return redirect("/auth/login")
        request.user = u
        return f(*a, **k)
    return w


def need_admin(f):
    @wraps(f)
    def w(*a, **k):
        u = current_user()
        if not u: return redirect("/auth/login")
        if u["email"].lower() not in ADMIN_EMAILS:
            abort(403)
        request.user = u
        return f(*a, **k)
    return w


def need_key(f):
    @wraps(f)
    def w(*a, **k):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"error": "Missing API key. Use header: Authorization: Bearer YOUR_KEY"}), 401
        key = auth[7:].strip()
        c = db(); u = c.execute("SELECT * FROM users WHERE api_key=?", (key,)).fetchone()
        if not u:
            c.close()
            return jsonify({"error": "Invalid API key"}), 401
        plan = PLANS.get(u["plan"], PLANS["free"])
        today = datetime.now().strftime("%Y-%m-%d")
        used = c.execute(
            "SELECT COUNT(*) as n FROM usage WHERE user_id=? AND date(created_at)=? AND success=1",
            (u["id"], today)
        ).fetchone()["n"]
        c.close()
        if used >= plan["daily_limit"]:
            return jsonify({
                "error": "Daily limit exceeded",
                "used": used,
                "limit": plan["daily_limit"],
                "plan": u["plan"]
            }), 429
        request.user = dict(u)
        return f(*a, **k)
    return w


def log_use(uid, endpoint, latency_ms=0, epsilon=0, verdict=None, category=None,
            text_sample=None, success=1, error_msg=None):
    c = db()
    c.execute("""INSERT INTO usage(user_id, endpoint, latency_ms, epsilon,
                                    verdict, category, text_sample, success, error_msg)
                 VALUES(?,?,?,?,?,?,?,?,?)""",
              (uid, endpoint, latency_ms, epsilon, verdict, category, text_sample, success, error_msg))
    c.commit(); c.close()


# ── Auth routes ──
@app.route("/auth/login")
def login():
    return google.authorize_redirect(f"{BASE_URL}/auth/callback")


@app.route("/auth/callback")
def callback():
    try:
        tok = google.authorize_access_token()
        info = tok.get("userinfo")
        if not info:
            return redirect("/?error=auth")
    except Exception as e:
        print(f"OAuth error: {e}")
        return redirect("/?error=auth")
    email, name = info["email"], info.get("name", "")
    pic, gid = info.get("picture", ""), info.get("sub", "")
    c = db()
    ex = c.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    if ex:
        session["user_id"] = ex["id"]
        c.execute("UPDATE users SET name=?, picture=?, google_id=? WHERE id=?",
                  (name, pic, gid, ex["id"]))
    else:
        cur = c.execute("INSERT INTO users(email, name, picture, google_id, api_key) VALUES(?,?,?,?,?)",
                        (email, name, pic, gid, gen_key(email)))
        session["user_id"] = cur.lastrowid
    c.commit(); c.close()
    return redirect("/dashboard")


@app.route("/auth/logout")
def logout():
    session.clear()
    return redirect("/")


# ── Public pages ──
@app.route("/")
def index():
    return render_template("index.html", user=current_user(), base_url=BASE_URL)


@app.route("/test")
def test_page():
    return render_template("test.html", user=current_user(), base_url=BASE_URL)


@app.route("/benchmarks")
def benchmarks_page():
    return render_template("benchmarks.html", user=current_user(), base_url=BASE_URL)


@app.route("/docs")
def docs_page():
    return render_template("docs.html", user=current_user(), base_url=BASE_URL)


@app.route("/compare")
def compare_page():
    return render_template("compare.html", user=current_user(), base_url=BASE_URL)


@app.route("/use-cases")
def use_cases_page():
    return render_template("use_cases.html", user=current_user(), base_url=BASE_URL)


@app.route("/changelog")
def changelog_page():
    return render_template("changelog.html", user=current_user(), base_url=BASE_URL)


@app.route("/privacy")
def privacy_page():
    return render_template("privacy.html", user=current_user(), base_url=BASE_URL)


@app.route("/terms")
def terms_page():
    return render_template("terms.html", user=current_user(), base_url=BASE_URL)


# ── Dashboard (authenticated user) ──
@app.route("/dashboard")
@need_login
def dashboard():
    u = request.user
    c = db()
    today = datetime.now().strftime("%Y-%m-%d")
    mstart = datetime.now().replace(day=1).strftime("%Y-%m-%d")
    thirty_days_ago = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d %H:%M:%S")

    daily_used = c.execute(
        "SELECT COUNT(*) as n FROM usage WHERE user_id=? AND date(created_at)=? AND success=1",
        (u["id"], today)
    ).fetchone()["n"]

    monthly_used = c.execute(
        "SELECT COUNT(*) as n FROM usage WHERE user_id=? AND date(created_at)>=? AND success=1",
        (u["id"], mstart)
    ).fetchone()["n"]

    total_used = c.execute(
        "SELECT COUNT(*) as n FROM usage WHERE user_id=? AND success=1",
        (u["id"],)
    ).fetchone()["n"]

    # Recent queries with verdicts and text samples
    recent = c.execute(
        """SELECT endpoint, latency_ms, epsilon, verdict, text_sample, created_at
           FROM usage WHERE user_id=? AND success=1
           ORDER BY created_at DESC LIMIT 20""",
        (u["id"],)
    ).fetchall()

    # Verdict distribution
    verdicts = c.execute(
        """SELECT verdict, COUNT(*) as n FROM usage
           WHERE user_id=? AND success=1 AND verdict IS NOT NULL
           GROUP BY verdict""",
        (u["id"],)
    ).fetchall()
    vcounts = {row["verdict"]: row["n"] for row in verdicts}
    v_verified = vcounts.get("verified", 0)
    v_uncertain = vcounts.get("uncertain", 0)
    v_flagged = vcounts.get("flagged", 0)
    v_total = v_verified + v_uncertain + v_flagged

    # Latency percentiles (last 30 days)
    latencies = [row["latency_ms"] for row in c.execute(
        "SELECT latency_ms FROM usage WHERE user_id=? AND success=1 AND created_at>=? AND latency_ms>0",
        (u["id"], thirty_days_ago)
    ).fetchall()]

    avg_latency = statistics.mean(latencies) if latencies else 0
    lat_p50 = statistics.median(latencies) if latencies else 0
    lat_p95 = percentile(latencies, 95)
    lat_p99 = percentile(latencies, 99)

    c.close()
    plan = PLANS.get(u["plan"], PLANS["free"])

    return render_template(
        "dashboard.html",
        user=u, plan=plan,
        daily_used=daily_used, monthly_used=monthly_used, total_used=total_used,
        recent=[dict(r) for r in recent],
        verdict_verified=v_verified, verdict_uncertain=v_uncertain, verdict_flagged=v_flagged,
        verdict_total=v_total,
        avg_latency=avg_latency, lat_p50=lat_p50, lat_p95=lat_p95, lat_p99=lat_p99,
        base_url=BASE_URL,
    )


def percentile(data, p):
    if not data: return 0
    sorted_data = sorted(data)
    k = (len(sorted_data) - 1) * (p / 100)
    f, ceil_k = int(k), -(-int(k) // 1)
    if f == ceil_k: return sorted_data[f]
    return sorted_data[f] + (sorted_data[f + 1] - sorted_data[f]) * (k - f) if f + 1 < len(sorted_data) else sorted_data[f]


# ── Admin ──
@app.route("/admin")
@need_admin
def admin_dashboard():
    c = db()
    today = datetime.now().strftime("%Y-%m-%d")
    yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S")
    thirty_days_ago = datetime.now() - timedelta(days=30)

    # KPIs
    total_users = c.execute("SELECT COUNT(*) as n FROM users").fetchone()["n"]
    dau_today = c.execute(
        "SELECT COUNT(DISTINCT user_id) as n FROM usage WHERE date(created_at)=?", (today,)
    ).fetchone()["n"]
    queries_today = c.execute(
        "SELECT COUNT(*) as n FROM usage WHERE date(created_at)=? AND success=1", (today,)
    ).fetchone()["n"]

    latency_row = c.execute(
        "SELECT AVG(latency_ms) as avg FROM usage WHERE success=1 AND latency_ms>0 AND created_at>=?",
        (yesterday,)
    ).fetchone()
    platform_avg_latency = latency_row["avg"] if latency_row["avg"] else 0

    errors_24h = c.execute(
        "SELECT COUNT(*) as n FROM usage WHERE success=0 AND created_at>=?", (yesterday,)
    ).fetchone()["n"]
    total_24h = c.execute(
        "SELECT COUNT(*) as n FROM usage WHERE created_at>=?", (yesterday,)
    ).fetchone()["n"]
    error_rate_24h = (errors_24h / total_24h * 100) if total_24h else 0

    # Daily activity chart (last 30 days)
    daily_rows = c.execute(
        """SELECT date(created_at) as date, COUNT(*) as count
           FROM usage WHERE success=1 AND created_at>=?
           GROUP BY date(created_at)
           ORDER BY date(created_at) ASC""",
        (thirty_days_ago.strftime("%Y-%m-%d %H:%M:%S"),)
    ).fetchall()
    daily_counts = [dict(r) for r in daily_rows]

    # Latency percentiles platform-wide (last 24h)
    platform_latencies = [r["latency_ms"] for r in c.execute(
        "SELECT latency_ms FROM usage WHERE success=1 AND created_at>=? AND latency_ms>0", (yesterday,)
    ).fetchall()]
    platform_p50 = statistics.median(platform_latencies) if platform_latencies else 0
    platform_p95 = percentile(platform_latencies, 95)
    platform_p99 = percentile(platform_latencies, 99)

    # Platform-wide verdict distribution
    platform_verdicts = c.execute(
        "SELECT verdict, COUNT(*) as n FROM usage WHERE success=1 AND verdict IS NOT NULL GROUP BY verdict"
    ).fetchall()
    pv = {row["verdict"]: row["n"] for row in platform_verdicts}
    platform_verified = pv.get("verified", 0)
    platform_uncertain = pv.get("uncertain", 0)
    platform_flagged = pv.get("flagged", 0)
    platform_total = platform_verified + platform_uncertain + platform_flagged

    # All users with usage stats
    users = c.execute(
        """SELECT u.id, u.email, u.plan, u.api_key, u.created_at,
                  (SELECT COUNT(*) FROM usage WHERE user_id=u.id AND date(created_at)=? AND success=1) as queries_today,
                  (SELECT COUNT(*) FROM usage WHERE user_id=u.id AND success=1) as queries_total
           FROM users u
           ORDER BY queries_total DESC""",
        (today,)
    ).fetchall()

    # Recent errors
    recent_errors = c.execute(
        """SELECT u.endpoint, u.error_msg, u.created_at, usr.email
           FROM usage u
           LEFT JOIN users usr ON u.user_id = usr.id
           WHERE u.success=0
           ORDER BY u.created_at DESC LIMIT 10"""
    ).fetchall()

    c.close()

    return render_template(
        "admin.html",
        total_users=total_users,
        dau_today=dau_today,
        queries_today=queries_today,
        platform_avg_latency=platform_avg_latency,
        errors_24h=errors_24h, total_24h=total_24h, error_rate_24h=error_rate_24h,
        daily_counts=daily_counts,
        platform_p50=platform_p50, platform_p95=platform_p95, platform_p99=platform_p99,
        platform_verified=platform_verified, platform_uncertain=platform_uncertain,
        platform_flagged=platform_flagged, platform_total=platform_total,
        users=[dict(u) for u in users],
        recent_errors=[dict(e) for e in recent_errors],
        user=request.user,
        base_url=BASE_URL,
    )


@app.route("/admin/users/<int:user_id>/plan", methods=["POST"])
@need_admin
def admin_update_plan(user_id):
    new_plan = request.form.get("plan", "free")
    if new_plan not in PLANS:
        abort(400)
    c = db()
    c.execute("UPDATE users SET plan=? WHERE id=?", (new_plan, user_id))
    c.commit(); c.close()
    return redirect("/admin")


# ── RunPod proxy ──
def call_runpod(payload):
    if not RUNPOD_API_KEY:
        return None, "RunPod not configured"
    hdr = {"Authorization": f"Bearer {RUNPOD_API_KEY}"}
    try:
        r = http_requests.post(f"{RUNPOD_BASE}/runsync", headers=hdr,
                               json={"input": payload}, timeout=120)
    except Exception as e:
        return None, str(e)
    if r.status_code != 200:
        return None, f"HTTP {r.status_code}"
    d = r.json()
    if d.get("status") == "COMPLETED":
        return d.get("output"), None
    if d.get("status") == "FAILED":
        return None, "Job failed"
    jid = d.get("id")
    if not jid:
        return None, "No job ID"
    for _ in range(90):
        time.sleep(2)
        try:
            s = http_requests.get(f"{RUNPOD_BASE}/status/{jid}", headers=hdr, timeout=30).json()
            if s.get("status") == "COMPLETED":
                return s.get("output"), None
            if s.get("status") == "FAILED":
                return None, "Job failed"
        except Exception:
            continue
    return None, "Timeout"


# ── Public demo endpoint (no auth, IP rate-limited) ──
@app.route("/public/analyze", methods=["POST"])
def public_analyze():
    d = request.get_json(silent=True) or {}
    mode = d.get("mode", "score")
    text = (d.get("text") or "").strip()

    if not text:
        return jsonify({"error": "Please provide some text to analyze"}), 400
    if len(text) > 2000:
        return jsonify({"error": "Text is too long (max 2000 characters). For longer content, sign up for an API key."}), 400
    if mode not in ("score", "ask"):
        return jsonify({"error": "Invalid mode"}), 400

    ip_h = hash_ip(get_client_ip())
    today = datetime.now().strftime("%Y-%m-%d")

    c = db()
    used = c.execute(
        "SELECT COUNT(*) as n FROM public_demo_usage WHERE ip_hash=? AND date(created_at)=?",
        (ip_h, today)
    ).fetchone()["n"]

    if used >= PUBLIC_DEMO_DAILY_LIMIT:
        c.close()
        return jsonify({
            "error": f"Daily demo limit reached ({PUBLIC_DEMO_DAILY_LIMIT}/day). Sign up free for 15 queries per day."
        }), 429

    c.execute("INSERT INTO public_demo_usage(ip_hash) VALUES(?)", (ip_h,))
    c.commit(); c.close()

    if mode == "score":
        payload = {"action": "score", "text": text}
    else:
        payload = {"action": "generate_and_score", "question": text, "max_tokens": 200}

    t0 = time.time()
    res, err = call_runpod(payload)
    lat = (time.time() - t0) * 1000

    if err:
        return jsonify({"error": "Analysis temporarily unavailable. Please try again."}), 502

    public_res = {
        "category": res.get("category", "MED"),
        "latency_ms": round(lat, 0),
    }
    if mode == "ask":
        public_res["response"] = res.get("response") or res.get("generated") or ""
    return jsonify(public_res)


# ── API endpoints ──
@app.route("/v1/score", methods=["POST"])
@need_key
def api_score():
    d = request.get_json(silent=True)
    if not d or not d.get("text"):
        return jsonify({"error": "Missing 'text'"}), 400
    text = str(d["text"])[:2000]
    t0 = time.time()
    res, err = call_runpod({"action": "score", "text": text})
    lat = (time.time() - t0) * 1000

    if err:
        log_use(request.user["id"], "/v1/score", lat, 0, None, None,
                truncate_text(text), success=0, error_msg=err)
        return jsonify({"error": err}), 502

    category = res.get("category", "MED")
    verdict = category_to_verdict(category)
    log_use(request.user["id"], "/v1/score", lat, res.get("epsilon", 0),
            verdict, category, truncate_text(text))

    return jsonify({
        "verdict": verdict,
        "category": category,
        "latency_ms": round(lat, 1),
    })


@app.route("/v1/ask", methods=["POST"])
@need_key
def api_ask():
    d = request.get_json(silent=True)
    if not d or not d.get("question"):
        return jsonify({"error": "Missing 'question'"}), 400
    question = str(d["question"])[:2000]
    max_tokens = min(int(d.get("max_tokens", 200)), 512)
    t0 = time.time()
    # Handler expects action "generate_and_score"
    res, err = call_runpod({
        "action": "generate_and_score",
        "question": question,
        "max_tokens": max_tokens
    })
    lat = (time.time() - t0) * 1000

    if err:
        log_use(request.user["id"], "/v1/ask", lat, 0, None, None,
                truncate_text(question), success=0, error_msg=err)
        return jsonify({"error": err}), 502

    category = res.get("category", "MED")
    verdict = category_to_verdict(category)
    response_text = res.get("response") or res.get("generated") or ""
    log_use(request.user["id"], "/v1/ask", lat, res.get("epsilon", 0),
            verdict, category, truncate_text(question))

    return jsonify({
        "response": response_text,
        "verdict": verdict,
        "category": category,
        "latency_ms": round(lat, 1),
    })


@app.route("/v1/compare", methods=["POST"])
@need_key
def api_compare():
    d = request.get_json(silent=True)
    if not d or not d.get("text_a") or not d.get("text_b"):
        return jsonify({"error": "Missing 'text_a' or 'text_b'"}), 400
    text_a = str(d["text_a"])[:2000]
    text_b = str(d["text_b"])[:2000]
    t0 = time.time()
    res, err = call_runpod({"action": "compare", "text_a": text_a, "text_b": text_b})
    lat = (time.time() - t0) * 1000

    if err:
        log_use(request.user["id"], "/v1/compare", lat, 0, None, None,
                truncate_text(f"{text_a} | {text_b}"), success=0, error_msg=err)
        return jsonify({"error": err}), 502

    # Backend returns category for each; map to verdict
    a_cat = res.get("text_a", {}).get("category") if isinstance(res.get("text_a"), dict) else res.get("category_a", "MED")
    b_cat = res.get("text_b", {}).get("category") if isinstance(res.get("text_b"), dict) else res.get("category_b", "MED")

    log_use(request.user["id"], "/v1/compare", lat, res.get("gap", 0),
            None, None, truncate_text(f"{text_a[:80]} || {text_b[:80]}"))

    return jsonify({
        "text_a": {"verdict": category_to_verdict(a_cat), "category": a_cat},
        "text_b": {"verdict": category_to_verdict(b_cat), "category": b_cat},
        "more_risky": res.get("more_risky", "A" if a_cat == "HIGH" else "B"),
        "latency_ms": round(lat, 1),
    })


@app.route("/v1/health")
def api_health():
    return jsonify({"status": "ok", "version": "agnoslogic-v51h", "runpod": bool(RUNPOD_API_KEY)})


@app.route("/v1/usage")
@need_key
def api_usage():
    c = db(); uid = request.user["id"]
    today = datetime.now().strftime("%Y-%m-%d")
    mstart = datetime.now().replace(day=1).strftime("%Y-%m-%d")
    daily = c.execute(
        "SELECT COUNT(*) as n FROM usage WHERE user_id=? AND date(created_at)=? AND success=1",
        (uid, today)
    ).fetchone()["n"]
    monthly = c.execute(
        "SELECT COUNT(*) as n FROM usage WHERE user_id=? AND date(created_at)>=? AND success=1",
        (uid, mstart)
    ).fetchone()["n"]
    c.close()
    p = PLANS.get(request.user["plan"], PLANS["free"])
    return jsonify({
        "plan": request.user["plan"],
        "daily": {"used": daily, "limit": p["daily_limit"]},
        "monthly": {"used": monthly, "limit": p["monthly_limit"]}
    })


# ── SEO: robots.txt and sitemap.xml ──
@app.route("/robots.txt")
def robots():
    lines = [
        "User-agent: *",
        "Allow: /",
        "Disallow: /dashboard",
        "Disallow: /admin",
        "Disallow: /auth/",
        "Disallow: /v1/",
        "Disallow: /public/",
        f"Sitemap: {BASE_URL}/sitemap.xml",
    ]
    return "\n".join(lines), 200, {"Content-Type": "text/plain"}


@app.route("/sitemap.xml")
def sitemap():
    pages = ["/", "/test", "/benchmarks", "/docs", "/compare", "/use-cases", "/changelog", "/privacy", "/terms"]
    urls = "".join(f"<url><loc>{BASE_URL}{p}</loc></url>" for p in pages)
    xml = f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>'
    return xml, 200, {"Content-Type": "application/xml"}


# ── 404 ──
@app.errorhandler(404)
def page_not_found(e):
    return """<!DOCTYPE html><html><head><title>Page not found — AgnosLogic</title>
    <style>body{font-family:Georgia,serif;background:#fff;color:#18181b;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center}
    h1{font-size:72px;font-weight:400;margin:0}p{color:#71717a;margin:16px 0 32px}
    a{color:#18181b;padding:10px 22px;border:1px solid #18181b;border-radius:6px;text-decoration:none;font-family:-apple-system,sans-serif;font-size:14px}
    a:hover{background:#18181b;color:#fff}</style></head>
    <body><div><h1>404</h1><p>This page doesn't exist.</p><a href="/">Back to home</a></div></body></html>""", 404


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"AgnosLogic running on :{port}")
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_DEBUG") == "1")
