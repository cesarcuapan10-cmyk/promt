import soundfile as sf, numpy as np, json
from scipy.signal import resample_poly
L={k:t for k,t,_ in json.load(open('lines.json'))}
ANIM={'A':None,'B':3.35,'C':6.7,'D':9.55,'E':11.8,'F':13.33,'G':15.65,'H':19.25,'I':22.3,'J':25.45}
def v_of(t): return t+0.4
START={k:(0.2 if k=='A' else v_of(a)) for k,a in ANIM.items()}
SR=44100; DUR=30.4; vo=np.zeros(int(SR*DUR))
words=[]
for k,txt in L.items():
    s,sr=sf.read(f'{k}.wav'); s=resample_poly(s,147,80)  # 24k->44.1k
    i=int(START[k]*SR); vo[i:i+len(s)]+=s[:len(vo)-i]
    # active intervals
    fr=int(0.02*SR); e=np.array([np.sqrt(np.mean(s[j:j+fr]**2)) for j in range(0,len(s)-fr,fr)])
    act=e>0.02*e.max()*1.0
    # close tiny gaps (<120ms)
    a=act.copy(); n=len(a); j=0
    while j<n:
        if not a[j]:
            q=j
            while q<n and not a[q]: q+=1
            if q-j<6 and j>0 and q<n: a[j:q]=True
            j=q
        else: j+=1
    times=np.arange(n)*0.02
    cum=np.cumsum(a)*0.02; tot=cum[-1]
    ws=txt.replace('...',' ').replace('«','').replace('»','').split()
    wts=np.array([len(w.strip('.,:'))+1.5 for w in ws],float); edges=np.concatenate([[0],np.cumsum(wts)/wts.sum()*tot])
    def real(x): j=np.searchsorted(cum,x); j=min(j,n-1); return times[j]
    for w,(a0,a1) in zip(ws,zip(edges[:-1],edges[1:])):
        words.append({'brk':w.endswith((':',',','.')) or (txt.replace('«','').replace('»','').split(w,1)[1][:3]=='...' if w in txt else False),'w':w.strip(',.'),'s':round(START[k]+real(a0+0.001),3),'e':round(START[k]+real(a1)+0.02,3),'line':k})
# chunks: max 3 words, break at line end or punctuation
chunks=[];cur=[]
raw={k:t.replace('...',' ... ').replace(':',' : ') for k,t in L.items()}
for i,w in enumerate(words):
    cur.append(i)
    nxt=words[i+1] if i+1<len(words) else None
    endp=w['brk']
    if len(cur)>=3 or nxt is None or nxt['line']!=w['line'] or endp or (nxt['s']-w['e']>0.25):
        chunks.append(cur);cur=[]
for c in chunks:
    pass
CS=[{'w':[i for i in c],'s':words[c[0]]['s']-0.05,'e':(words[c[-1]]['e']+0.15)} for c in chunks]
for a,b in zip(CS,CS[1:]): a['e']=min(a['e'],b['s'])
key={'comenta':[w for w in words if w['w'].lower().startswith('comenta')][0]['s']-0.4,'sistema':[w for w in words if w['w'].upper().startswith('SISTEMA')][0]['s']-0.4}
open('../reel/subs.js','w').write('window.WORDS='+json.dumps(words,ensure_ascii=False)+';window.CHUNKS='+json.dumps(CS)+';window.KEY='+json.dumps(key)+';')
vo=vo/np.max(np.abs(vo))*0.95
sf.write('../vo.wav',vo,SR)
for c in CS: print(round(c['s'],2),' '.join(words[i]['w'] for i in c['w']))
print(key)
