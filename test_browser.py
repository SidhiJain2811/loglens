import subprocess
import time
import json
import urllib.request
import asyncio
import websockets

chrome_path = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
proc = subprocess.Popen([chrome_path, '--headless=new', '--remote-debugging-port=9222', 'http://127.0.0.1:8000/'])
time.sleep(2)

async def check():
    try:
        targets_raw = urllib.request.urlopen('http://127.0.0.1:9222/json').read()
        targets = json.loads(targets_raw)
        print('Available targets:', [(t.get('type'), t.get('url')) for t in targets])
        page_target = next(t for t in targets if '127.0.0.1:8000' in t.get('url', ''))
        ws_url = page_target['webSocketDebuggerUrl']
        print('Connecting to Page Target:', ws_url)
        
        async with websockets.connect(ws_url) as ws:
            await ws.send(json.dumps({'id': 1, 'method': 'Runtime.enable'}))
            await ws.send(json.dumps({'id': 2, 'method': 'Log.enable'}))
            await ws.send(json.dumps({'id': 3, 'method': 'Page.enable'}))

            # Wait a moment for Babel to compile
            await asyncio.sleep(2)

            # Evaluate document.getElementById('root').innerHTML
            await ws.send(json.dumps({
                'id': 10,
                'method': 'Runtime.evaluate',
                'params': {'expression': 'document.getElementById("root").innerHTML'}
            }))
            
            # Evaluate window errors or Babel errors
            await ws.send(json.dumps({
                'id': 11,
                'method': 'Runtime.evaluate',
                'params': {'expression': 'window.__babel_error__ || (window.Babel ? "Babel loaded" : "No Babel")'}
            }))

            # Let's inspect console errors or window errors
            await ws.send(json.dumps({
                'id': 12,
                'method': 'Runtime.evaluate',
                'params': {'expression': 'window.React ? "React loaded" : "No React"'}
            }))

            while True:
                msg = await ws.recv()
                data = json.loads(msg)
                msg_id = data.get('id')
                if msg_id == 10:
                    val = data.get('result', {}).get('result', {}).get('value')
                    print("--> ROOT INNER HTML LENGTH:", len(val) if val else 0)
                    print("--> ROOT INNER HTML PREVIEW:", (val[:200] + '...') if val else "EMPTY (None or blank)")
                elif msg_id == 11:
                    print("--> BABEL:", data.get('result', {}).get('result', {}).get('value'))
                elif msg_id == 12:
                    print("--> REACT:", data.get('result', {}).get('result', {}).get('value'))
                    break
                elif data.get('method') == 'Runtime.exceptionThrown':
                    print("--> EXCEPTION THROWN IN BROWSER:", json.dumps(data['params'], indent=2))
                elif data.get('method') == 'Runtime.consoleAPICalled':
                    print("--> CONSOLE LOG:", [arg.get('value', arg.get('description')) for arg in data['params']['args']])
    except Exception as e:
        print('Exception:', e)
    finally:
        proc.kill()

asyncio.run(check())
