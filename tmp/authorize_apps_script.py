#!/usr/bin/env python3
import json, urllib.parse, urllib.request, urllib.error, http.server, socketserver, threading, secrets, webbrowser, pathlib, time, sys
TOKEN_PATH = pathlib.Path('/Users/01chungee10/.hermes/profiles/work/google_token.json')
OUT_PATH = pathlib.Path('/Users/01chungee10/Projects/sujak-maker-game/tmp/google_token_apps_script.json')
PORT = 8765
REDIRECT_URI = f'http://127.0.0.1:{PORT}/oauth2callback'
base = json.loads(TOKEN_PATH.read_text())
client_id = base['client_id']
client_secret = base['client_secret']
scopes = sorted(set((base.get('scopes') or []) + [
    'https://www.googleapis.com/auth/script.projects',
    'https://www.googleapis.com/auth/script.deployments',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
]))
state = secrets.token_urlsafe(24)
result = {}
class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        qs = urllib.parse.parse_qs(parsed.query)
        if parsed.path != '/oauth2callback':
            self.send_response(404); self.end_headers(); return
        if qs.get('state', [''])[0] != state:
            result['error'] = 'state_mismatch'
        elif 'error' in qs:
            result['error'] = qs.get('error', ['unknown'])[0]
        else:
            result['code'] = qs.get('code', [''])[0]
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.end_headers()
        self.wfile.write('승인 완료. 이 창은 닫아도 됩니다.'.encode('utf-8'))
    def log_message(self, *args):
        pass
params = {
    'client_id': client_id,
    'redirect_uri': REDIRECT_URI,
    'response_type': 'code',
    'scope': ' '.join(scopes),
    'access_type': 'offline',
    'include_granted_scopes': 'true',
    'prompt': 'consent',
    'state': state,
}
url = 'https://accounts.google.com/o/oauth2/v2/auth?' + urllib.parse.urlencode(params)
print('AUTH_URL', url, flush=True)
with socketserver.TCPServer(('127.0.0.1', PORT), Handler) as httpd:
    def serve():
        deadline = time.time() + 240
        while time.time() < deadline and 'code' not in result and 'error' not in result:
            httpd.handle_request()
    th = threading.Thread(target=serve, daemon=True)
    th.start()
    # Open Chrome directly with normal profile.
    import subprocess
    subprocess.Popen(['/usr/bin/open', '-a', 'Google Chrome', url])
    th.join(timeout=245)
if 'error' in result:
    print('ERROR', result['error'], flush=True); sys.exit(2)
if 'code' not in result or not result['code']:
    print('ERROR timeout_no_code', flush=True); sys.exit(3)
body = urllib.parse.urlencode({
    'code': result['code'],
    'client_id': client_id,
    'client_secret': client_secret,
    'redirect_uri': REDIRECT_URI,
    'grant_type': 'authorization_code',
}).encode()
try:
    tok = json.loads(urllib.request.urlopen(urllib.request.Request('https://oauth2.googleapis.com/token', data=body), timeout=30).read())
except urllib.error.HTTPError as e:
    print('TOKEN_EXCHANGE_HTTP', e.code, e.read().decode()[:1000], flush=True); sys.exit(4)
merged = dict(base)
merged.update(tok)
merged['scopes'] = scopes
OUT_PATH.write_text(json.dumps(merged, ensure_ascii=False, indent=2))
print('TOKEN_OK', OUT_PATH, 'scope_count', len(scopes), flush=True)
