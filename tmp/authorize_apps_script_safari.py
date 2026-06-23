#!/usr/bin/env python3
import json, urllib.parse, urllib.request, urllib.error, http.server, socketserver, threading, secrets, pathlib, time, sys, subprocess
TOKEN_PATH=pathlib.Path('/Users/01chungee10/.hermes/profiles/work/google_token.json')
t=json.loads(TOKEN_PATH.read_text())
client_id=t['client_id']; client_secret=t['client_secret']
PORT=8765
state=secrets.token_urlsafe(24)
code_holder={}
class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *args): pass
    def do_GET(self):
        qs=urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        if self.path.startswith('/oauth2callback'):
            if qs.get('state',[''])[0] != state:
                body='state mismatch'.encode(); self.send_response(400); self.end_headers(); self.wfile.write(body); return
            if 'code' in qs:
                code_holder['code']=qs['code'][0]
                body='승인 완료. 이 창은 닫아도 됩니다.'.encode('utf-8')
                self.send_response(200); self.send_header('Content-Type','text/plain; charset=utf-8'); self.end_headers(); self.wfile.write(body); return
            body=str(qs).encode(); self.send_response(400); self.end_headers(); self.wfile.write(body)
with socketserver.TCPServer(('127.0.0.1', PORT), Handler) as httpd:
    redirect=f'http://127.0.0.1:{PORT}/oauth2callback'
    scopes=[
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/script.projects',
      'https://www.googleapis.com/auth/script.deployments',
    ]
    url='https://accounts.google.com/o/oauth2/v2/auth?'+urllib.parse.urlencode({
      'client_id':client_id,
      'redirect_uri':redirect,
      'response_type':'code',
      'scope':' '.join(scopes),
      'access_type':'offline',
      'include_granted_scopes':'true',
      'prompt':'consent',
      'state':state,
    })
    print('AUTH_URL', url, flush=True)
    subprocess.run(['open','-a','Safari',url], check=False)
    end=time.time()+360
    while time.time()<end and 'code' not in code_holder:
      httpd.handle_request()
    if 'code' not in code_holder:
      print('ERROR timeout_no_code', flush=True); sys.exit(3)
    body=urllib.parse.urlencode({
      'code':code_holder['code'], 'client_id':client_id, 'client_secret':client_secret,
      'redirect_uri':redirect, 'grant_type':'authorization_code'
    }).encode()
    try:
      resp=urllib.request.urlopen('https://oauth2.googleapis.com/token', body, timeout=30)
      new=json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
      print('ERROR token_exchange', e.code, e.read().decode()[:1000]); sys.exit(4)
    merged=t.copy();
    if 'refresh_token' not in new and 'refresh_token' in t: new['refresh_token']=t['refresh_token']
    # google auth style stores access_token as token in this file
    if 'access_token' in new: new['token']=new['access_token']
    merged.update(new); merged['scopes']=scopes
    TOKEN_PATH.write_text(json.dumps(merged, ensure_ascii=False, indent=2))
    print('TOKEN_UPDATED', TOKEN_PATH, flush=True)
