from flask import Flask, request, jsonify, redirect, render_template, session
from flask_cors import CORS
from functools import wraps
from authlib.integrations.flask_client import OAuth
import requests as http_requests
import hashlib, time, os, sqlite3
from datetime import datetime

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "change-me")
CORS(app, supports_credentials=True)

BASE_URL = os.environ.get("BASE_URL", "http://localhost:5000")
RUNPOD_API_KEY = os.environ.get("RUNPOD_API_KEY", "")
RUNPOD_ENDPOINT_ID = os.environ.get("RUNPOD_ENDPOINT_ID", "")
RUNPOD_BASE = f"https://api.runpod.ai/v2/{RUNPOD_ENDPOINT_ID}"

PLANS = {
    "free":       {"daily_limit": 15,    "monthly_limit": 450,    "name": "Explorer"},
    "builder":    {"daily_limit": 500,   "monthly_limit": 10000,  "name": "Builder"},
    "enterprise": {"daily_limit": 99999, "monthly_limit": 999999, "name": "Enterprise"},
}

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
    c.execute("CREATE INDEX IF NOT EXISTS idx_usage_ud ON usage(user_id, created_at)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_users_key ON users(api_key)")
    c.commit(); c.close()

init_db()

def db():
    c = sqlite3.connect(DB); c.row_factory = sqlite3.Row; return c

def gen_key(email):
    return "agnoslogic_" + hashlib.sha256(f"{email}:{app.secret_key}:{time.time()}".encode()).hexdigest()[:32]

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
        request.user = u; return f(*a, **k)
    return w

def need_key(f):
    @wraps(f)
    def w(*a, **k):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"error": "Missing API key. Use header: Authorization: Bearer YOUR_KEY"}), 401
        key = auth[7:].strip()
        c = db(); u = c.execute("SELECT * FROM users WHERE api_key=?", (key,)).fetchone()
        if not u: c.close(); return jsonify({"error": "Invalid API key"}), 401
        plan = PLANS.get(u["plan"], PLANS["free"])
        today = datetime.now().strftime("%Y-%m-%d")
        used = c.execute("SELECT COUNT(*) as n FROM usage WHERE user_id=? AND date(created_at)=?",
                         (u["id"], today)).fetchone()["n"]
        c.close()
        if used >= plan["daily_limit"]:
            return jsonify({"error": "Daily limit exceeded", "used": used,
                          "limit": plan["daily_limit"], "plan": u["plan"]}), 429
        request.user = dict(u); return f(*a, **k)
    return w

def log_use(uid, ep, lat=0, eps=0):
    c = db(); c.execute("INSERT INTO usage(user_id,endpoint,latency_ms,epsilon) VALUES(?,?,?,?)",
                        (uid, ep, lat, eps)); c.commit(); c.close()

# ── Auth routes ──
@app.route("/auth/login")
def login():
    return google.authorize_redirect(f"{BASE_URL}/auth/callback")

@app.route("/auth/callback")
def callback():
    try:
        tok = google.authorize_access_token()
        info = tok.get("userinfo")
        if not info: return redirect("/?error=auth")
    except Exception as e:
        print(f"OAuth error: {e}"); return redirect("/?error=auth")
    email, name = info["email"], info.get("name", "")
    pic, gid = info.get("picture", ""), info.get("sub", "")
    c = db(); ex = c.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    if ex:
        session["user_id"] = ex["id"]
        c.execute("UPDATE users SET name=?,picture=?,google_id=? WHERE id=?", (name, pic, gid, ex["id"]))
    else:
        cur = c.execute("INSERT INTO users(email,name,picture,google_id,api_key) VALUES(?,?,?,?,?)",
                        (email, name, pic, gid, gen_key(email)))
        session["user_id"] = cur.lastrowid
    c.commit(); c.close()
    return redirect("/dashboard")

@app.route("/auth/logout")
def logout():
    session.clear(); return redirect("/")

# ── Pages ──
@app.route("/")
def index():
    return render_template("index.html", user=current_user(), base_url=BASE_URL)

@app.route("/dashboard")
@need_login
def dashboard():
    u = request.user; c = db()
    today = datetime.now().strftime("%Y-%m-%d")
    mstart = datetime.now().replace(day=1).strftime("%Y-%m-%d")
    daily = c.execute("SELECT COUNT(*) as n FROM usage WHERE user_id=? AND date(created_at)=?",
                      (u["id"], today)).fetchone()["n"]
    monthly = c.execute("SELECT COUNT(*) as n FROM usage WHERE user_id=? AND date(created_at)>=?",
                        (u["id"], mstart)).fetchone()["n"]
    total = c.execute("SELECT COUNT(*) as n FROM usage WHERE user_id=?", (u["id"],)).fetchone()["n"]
    recent = c.execute("SELECT endpoint,latency_ms,epsilon,created_at FROM usage WHERE user_id=? ORDER BY created_at DESC LIMIT 15",
                       (u["id"],)).fetchall()
    avg = c.execute("SELECT AVG(epsilon) as a FROM usage WHERE user_id=? AND epsilon>0", (u["id"],)).fetchone()["a"]
    c.close()
    plan = PLANS.get(u["plan"], PLANS["free"])
    return render_template("dashboard.html", user=u, plan=plan, daily_used=daily,
                         monthly_used=monthly, total_used=total,
                         recent=[dict(r) for r in recent], avg_eps=avg or 0, base_url=BASE_URL)

# ── RunPod proxy ──
def call_runpod(payload):
    if not RUNPOD_API_KEY: return None, "RunPod not configured"
    hdr = {"Authorization": f"Bearer {RUNPOD_API_KEY}"}
    try:
        r = http_requests.post(f"{RUNPOD_BASE}/runsync", headers=hdr,
                               json={"input": payload}, timeout=120)
    except Exception as e: return None, str(e)
    if r.status_code != 200: return None, f"HTTP {r.status_code}"
    d = r.json()
    if d.get("status") == "COMPLETED": return d.get("output"), None
    if d.get("status") == "FAILED": return None, "Failed"
    jid = d.get("id")
    if not jid: return None, "No job ID"
    for _ in range(90):
        time.sleep(2)
        try:
            s = http_requests.get(f"{RUNPOD_BASE}/status/{jid}", headers=hdr, timeout=30).json()
            if s.get("status") == "COMPLETED": return s.get("output"), None
            if s.get("status") == "FAILED": return None, "Failed"
        except: continue
    return None, "Timeout"

# ── API endpoints ──
@app.route("/v1/score", methods=["POST"])
@need_key
def api_score():
    d = request.get_json(silent=True)
    if not d or not d.get("text"): return jsonify({"error": "Missing 'text'"}), 400
    t0 = time.time()
    res, err = call_runpod({"action": "score", "text": d["text"]})
    lat = (time.time()-t0)*1000
    if err: return jsonify({"error": err}), 502
    log_use(request.user["id"], "/v1/score", lat, res.get("epsilon", 0))
    res["latency_ms"] = round(lat, 1); return jsonify(res)

@app.route("/v1/ask", methods=["POST"])
@need_key
def api_ask():
    d = request.get_json(silent=True)
    if not d or not d.get("question"): return jsonify({"error": "Missing 'question'"}), 400
    t0 = time.time()
    res, err = call_runpod({"action": "ask", "question": d["question"],
                            "max_tokens": d.get("max_tokens", 200)})
    lat = (time.time()-t0)*1000
    if err: return jsonify({"error": err}), 502
    log_use(request.user["id"], "/v1/ask", lat, res.get("epsilon", 0))
    res["latency_ms"] = round(lat, 1); return jsonify(res)

@app.route("/v1/compare", methods=["POST"])
@need_key
def api_compare():
    d = request.get_json(silent=True)
    if not d or not d.get("text_a") or not d.get("text_b"):
        return jsonify({"error": "Missing 'text_a' or 'text_b'"}), 400
    t0 = time.time()
    res, err = call_runpod({"action": "compare", "text_a": d["text_a"], "text_b": d["text_b"]})
    lat = (time.time()-t0)*1000
    if err: return jsonify({"error": err}), 502
    log_use(request.user["id"], "/v1/compare", lat, res.get("gap", 0))
    res["latency_ms"] = round(lat, 1); return jsonify(res)

@app.route("/v1/health")
def api_health():
    return jsonify({"status": "ok", "version": "agnoslogic-v1", "runpod": bool(RUNPOD_API_KEY)})

@app.route("/v1/usage")
@need_key
def api_usage():
    c = db(); uid = request.user["id"]
    today = datetime.now().strftime("%Y-%m-%d")
    mstart = datetime.now().replace(day=1).strftime("%Y-%m-%d")
    daily = c.execute("SELECT COUNT(*) as n FROM usage WHERE user_id=? AND date(created_at)=?",
                      (uid, today)).fetchone()["n"]
    monthly = c.execute("SELECT COUNT(*) as n FROM usage WHERE user_id=? AND date(created_at)>=?",
                        (uid, mstart)).fetchone()["n"]
    c.close()
    p = PLANS.get(request.user["plan"], PLANS["free"])
    return jsonify({"plan": request.user["plan"],
                    "daily": {"used": daily, "limit": p["daily_limit"]},
                    "monthly": {"used": monthly, "limit": p["monthly_limit"]}})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"AgnosLogic running on :{port}")
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_DEBUG") == "1")
