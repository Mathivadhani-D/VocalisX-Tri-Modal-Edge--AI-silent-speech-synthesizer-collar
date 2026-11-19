import io, warnings, numpy as np, soundfile as sf
from fastapi.testclient import TestClient
import main
with TestClient(main.app) as c:
    g = lambda p, **k: c.get(p, **k)
    print('health', g('/api/health').json()['model_ready'], '| root ok', g('/').status_code)
    m = g('/api/metrics').json(); print('metrics', {k: m[k] for k in ('recognition_accuracy','macro_f1','response_time_ms','demo_data')})
    r = c.post('/api/recognize', json={'phrase': 'Help me'}); j = r.json(); print('recognize', r.status_code, j['phrase'], j['confidence'], 'correct:', j['correct'], [t['phrase'] for t in j['top3']], j['inference_ms'], 'ms')
    ok = sum(c.post('/api/recognize', json={'phrase': 'Thank you'}).json()['correct'] for _ in range(30)); print('Thank you recognised', ok, '/ 30')
    print('bad phrase ->', c.post('/api/recognize', json={'phrase': 'Open the door'}).status_code, '| short signal ->', c.post('/api/recognize', json={'signal': [0.1]*10}).status_code)
    sig = g('/api/signal/sample', params={'phrase': 'Call an ambulance'}).json()
    r = c.post('/api/recognize', json={'signal': sig['raw']}).json(); print('client signal ->', r['phrase'], r['confidence'], r['source'])
    print('emergency', c.post('/api/emergency', json={'phrase': 'Help me'}).json()['activated'], '| history', g('/api/history', params={'limit': 3}).json()['count'], '| bad limit', g('/api/history', params={'limit': 0}).status_code)
    c.post('/api/connection', json={'connected': False}); print('disconnected ->', c.post('/api/recognize', json={}).status_code, '| sensors', g('/api/sensors').json()['sensors']['semg']['value']); c.post('/api/connection', json={'connected': True})
    s = g('/api/eda/summary').json(); print('eda', s['class_distribution']['counts'], 'ratio', s['class_distribution']['imbalance_ratio'], 'imbalanced', s['class_distribution']['is_imbalanced'], '| amp overall', {k: round(v,4) for k,v in s['amplitude_statistics']['overall'].items()})
    st = g('/api/eda/statistics').json(); print('stats features', len(st), '| rms', {k: round(v,4) for k,v in st['rms'].items() if v is not None})
    co = g('/api/eda/correlations').json(); print('corr pairs >=0.9:', len(co['highly_correlated_pairs']), co['highly_correlated_pairs'][:2])
    ou = g('/api/eda/outliers').json(); print('outlier windows:', ou['windows_with_extreme_outlier'], ou['percent_of_windows'], '%')
    ev = g('/api/model/evaluation').json(); print('eval', ev['best_model'], round(ev['test_accuracy'],3), '| top feature', ev['importance'][0]['feature'])
    print('class-means ok', len(g('/api/eda/class-means').json()), '| dataset info', g('/api/dataset/info').json()['n_windows'])
    for n in g('/api/plots').json()['plots']:
        r = g(f'/api/plots/{n}'); assert r.status_code == 200 and r.content[:4] == b'\x89PNG', n
    print('all', len(g('/api/plots').json()['plots']), 'plots are valid PNGs |', g('/api/plots/nope').status_code, 'for unknown')
    buf = io.BytesIO(); t = np.arange(16000)/16000; sf.write(buf, 0.3*np.sin(2*np.pi*440*t)+0.02*np.random.randn(16000), 16000, format='WAV')
    a = c.post('/api/audio/features', files={'file': ('t.wav', buf.getvalue(), 'audio/wav')}); print('audio', a.status_code, a.json()['original']['spectral_centroid_hz'] if a.status_code==200 else a.text[:80], a.json().get('libraries') if a.status_code==200 else '')
    print('retrain', c.post('/api/model/train', json={'samples_scale': 0.5, 'seed': 7}).json())
    print('plot after retrain', g('/api/plots/confusion-matrix').status_code)
    fd = g('/api/eda/feature/rms').json(); print('feature detail', fd['feature'], len(fd['bin_edges']) - 1, 'bins |', g('/api/eda/feature/nope').status_code, 'for unknown feature')
