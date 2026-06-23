#!/usr/bin/env python3
import json, pathlib, urllib.request, urllib.parse, urllib.error, time, sys
TOKEN_PATH = pathlib.Path('/Users/01chungee10/.hermes/profiles/work/google_token.json')
t = json.loads(TOKEN_PATH.read_text())
client_id=t.get('client_id')
client_secret=t.get('client_secret')
refresh=t.get('refresh_token')
if not (client_id and client_secret and refresh):
    print('missing refresh/client data')
    sys.exit(2)
body=urllib.parse.urlencode({
    'client_id': client_id,
    'client_secret': client_secret,
    'refresh_token': refresh,
    'grant_type': 'refresh_token',
}).encode()
try:
    resp=urllib.request.urlopen('https://oauth2.googleapis.com/token', body, timeout=20)
    tok=json.loads(resp.read().decode())
    access=tok['access_token']
    print('REFRESH_OK scopes=', tok.get('scope',''))
except urllib.error.HTTPError as e:
    print('REFRESH_FAIL', e.code, e.read().decode()[:1000])
    sys.exit(1)

def req(method, url, data=None):
    headers={'Authorization':'Bearer '+access}
    if data is not None:
        data=json.dumps(data).encode(); headers['Content-Type']='application/json'
    r=urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        out=urllib.request.urlopen(r, timeout=20).read().decode()
        print(method, url, 'OK', out[:500])
        return True
    except urllib.error.HTTPError as e:
        print(method, url, 'FAIL', e.code, e.read().decode()[:1000])
        return False

sid='1bdcRVCFmTrgMUi-CFj28E-AknJjqb8HxHghfyU_XuB8'
req('GET', f'https://sheets.googleapis.com/v4/spreadsheets/{sid}?fields=spreadsheetId,properties.title,sheets.properties.title')
req('POST','https://script.googleapis.com/v1/projects', {'title':'Yonggang Maker Backend API capability test'})
