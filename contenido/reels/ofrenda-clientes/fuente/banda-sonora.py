import numpy as np, wave, sys
SR=44100; DUR=30.0; N=int(SR*DUR)
L=np.zeros(N); R=np.zeros(N)
rs=np.random.default_rng(7)
def T(n): return np.arange(n)/SR
def add(sig,t0,gain=1.0,pan=0.0):
    i=int(t0*SR); j=min(N,i+len(sig))
    if j<=i: return
    s=sig[:j-i]*gain
    L[i:j]+=s*np.sqrt(0.5*(1-pan)); R[i:j]+=s*np.sqrt(0.5*(1+pan))
def env(n,a,d):  # attack/exp decay
    t=T(n); e=np.minimum(1,t/max(a,1e-4))*np.exp(-t/d); return e
def lp(x,a):  # one-pole lowpass via cumulative filter (vectorised approx using ewm)
    y=np.empty_like(x); acc=0.0
    # fast enough for short sounds
    for k in range(len(x)): acc+= a*(x[k]-acc); y[k]=acc
    return y
def noise(n): return rs.standard_normal(n)
def hz(m): return 440*2**((m-69)/12)

# ---------- instruments ----------
def musicbox(f,d=1.6):
    n=int(SR*d); t=T(n)
    s=np.sin(2*np.pi*f*t)+0.35*np.sin(2*np.pi*f*2*t)*np.exp(-t*6)+0.18*np.sin(2*np.pi*f*3.01*t)*np.exp(-t*9)
    return s*env(n,0.003,0.55)
def bell(f,d=3.5):
    n=int(SR*d); t=T(n); s=np.zeros(n)
    for r,a,dd in [(1,1,1.6),(2.0,.5,1.0),(2.76,.4,.7),(5.4,.25,.35),(8.9,.12,.2)]:
        s+=a*np.sin(2*np.pi*f*r*t)*np.exp(-t/dd)
    return s*np.minimum(1,t/0.002)
def boom(d=2.2,f0=90,f1=32,dist=1.0):
    n=int(SR*d); t=T(n); f=f1+(f0-f1)*np.exp(-t*7); ph=2*np.pi*np.cumsum(f)/SR
    s=np.sin(ph)*np.exp(-t/0.7); s=np.tanh(s*1.8*dist)
    nz=noise(n)*np.exp(-t/0.05)*0.5
    return s+nz
def kick():
    n=int(SR*0.4); t=T(n); f=45+120*np.exp(-t*30); ph=2*np.pi*np.cumsum(f)/SR
    return np.tanh(2*np.sin(ph)*np.exp(-t/0.16))
def clap():
    n=int(SR*0.25); t=T(n); e=np.exp(-t/0.06)*(1+0.6*(np.sin(t*2*np.pi*90)>0)*(t<0.03))
    x=noise(n)*e; return x-np.concatenate([[0],x[:-1]])*0.6
def shaker():
    n=int(SR*0.08); t=T(n); x=noise(n)*np.exp(-t/0.02); return x-np.concatenate([[0],x[:-1]])
def ks(f,d=1.4,bright=0.5,dec=0.996):
    n=int(SR*d); P=max(2,int(SR/f)); y=np.zeros(n+P+2)
    y[:P+1]=rs.uniform(-1,1,P+1)*1.0
    y[:P+1]=lp(y[:P+1],bright) if bright<1 else y[:P+1]
    i=P+1
    while i<n:
        j=min(n,i+P); y[i:j]=dec*0.5*(y[i-P:j-P]+y[i-P-1:j-P-1]); i=j
    return y[:n]*np.minimum(1,T(n)/0.002)
def strum(chord,t0,g=0.25,down=True):
    notes=chord if down else chord[::-1]
    for k,m in enumerate(notes): add(ks(hz(m),1.2,0.6),t0+k*0.012,g*(0.9 if k else 1),pan=(k-2)*0.15)
def pad(ms,t0,d,g=0.1,a=0.8):
    n=int(SR*d); t=T(n); s=np.zeros(n)
    for m in ms:
        for det in (-0.12,0.12):
            s+=np.sin(2*np.pi*hz(m+det)*t)+0.3*np.sin(2*np.pi*hz(m+det)*2*t)
    e=np.minimum(1,t/a)*np.minimum(1,(d-t)/0.6)
    add(s*e/len(ms),t0,g)
def whoosh(d=0.6,g=0.4,t0=0,rise=True):
    n=int(SR*d); t=T(n); x=noise(n)
    a=0.02+0.25*(t/d if rise else 1-t/d); y=np.empty(n); acc=0
    for k in range(n): acc+=a[k]*(x[k]-acc); y[k]=acc
    e=np.sin(np.pi*t/d)**2; add(y*e*3,t0,g)
def ding(f,t0,g=0.25,d=0.6): add(bell(f,d),t0,g)
def click(t0,g=0.15):
    n=int(SR*0.03); t=T(n); add(noise(n)*np.exp(-t/0.004),t0,g)
def thump(t0,g=0.8):
    n=int(SR*0.35); t=T(n); f=50+40*np.exp(-t*25); add(np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/0.09),t0,g)
def shimmer(t0,d,g=0.15,base=72):
    for k in range(14):
        ding(hz(base+[0,4,7,11,12,16,19,23,24,28,31,35,36,40][k]),t0+k*d/14,g*(1-k/20),d=1.2)

# ---------- SCORE ----------
# 0-0.5 match strike + flame
n=int(SR*0.22); t=T(n); add(noise(n)*np.exp(-t/0.06)*(0.6+0.4*np.sin(t*400)),0.08,0.35)
whoosh(0.5,0.35,0.12)
# drone + pad (D minor) 0.3 - 12.95
n=int(SR*12.6); t=T(n)
dr=(np.sin(2*np.pi*hz(38)*t)+0.6*np.sin(2*np.pi*hz(45)*t*1.001))*(0.8+0.2*np.sin(2*np.pi*0.25*t))
add(dr*np.minimum(1,t/1.5)*np.minimum(1,(12.6-t)/0.3),0.35,0.22)
pad([50,53,57],0.6,6.2,0.10,1.5); pad([46,50,53],6.6,6.3,0.10,1.0)
# music box melody (D minor, nostalgic)
mel=[(0.9,74),(1.4,77),(1.9,81),(2.4,79),(3.3,77),(3.8,76),(4.3,74),(4.8,72),(5.6,74),(6.6,70),(7.1,74),(7.6,77),(8.1,76),(8.6,74),(9.85,69),(10.35,72),(10.85,74),(11.35,73)]
for tt,m in mel: add(musicbox(hz(m)),tt,0.16,pan=0.2)
for tt,m in [(0.9,62),(3.3,58),(5.6,62),(6.6,58),(8.6,57),(9.85,57)]: add(musicbox(hz(m),2.4),tt,0.09,pan=-0.2)
ding(hz(62),2.55,0.28,3.5)  # campana "dejaste ir"
# hits on cards
for tt in (3.6,6.65,9.85): add(boom(1.4,70,35,0.6),tt,0.45)
ding(hz(88),4.3,0.18,0.5); ding(hz(93),4.38,0.14,0.5)   # notif
thump(4.75,0.7)                                          # stamp
for tt,dd in [(5.95,0.4),(6.3,0.6),(8.85,0.35),(9.35,0.5),(11.2,0.45)]: whoosh(dd,0.35,tt)
for k in range(5): ding(hz(96+(k%2)*3),9.62+k*0.07,0.12,0.4)   # door bell
for k in range(6): click(10.5+k*0.135,0.25)                   # calendar flips
thump(10.9,0.35)                                             # door close
# riser
n=int(SR*1.3); t=T(n); f=200+1400*(t/1.3)**2; ph=2*np.pi*np.cumsum(f)/SR
add((0.5*np.sin(ph)+0.3*noise(n))*(t/1.3)**2,11.3,0.18)
# blow out
n=int(SR*0.3); t=T(n); add(noise(n)*np.sin(np.pi*t/0.3)*0.5,12.5,0.35)
# hard silence 12.95-13.3 handled at end
# BOOMS
add(boom(2.0,100,30,1.4),13.3,0.95); add(boom(2.4,110,28,1.6),13.62,1.0)
n=int(SR*1.5); t=T(n); add(noise(n)*np.exp(-t/0.4)*0.25,13.62,0.4)
# heartbeat
for b in (14.55,15.05): thump(b,0.9); thump(b+0.18,0.6)
# into day
shimmer(15.3,0.35,0.12,79); whoosh(0.4,0.3,15.25)
# ---------- upbeat section D major 15.5 - 30 ----------
BPM=120; beat=0.5
prog=[[50,57,62,66,69],[45,52,57,61,64],[47,54,59,62,66],[43,50,55,59,62]]  # D A Bm G
def groove(t0,t1,kickon=True,claps=True,strumg=0.12):
    tt=t0; k=0
    while tt<t1-0.01:
        bar=int((tt-15.5)/2)%4; ch=prog[bar]
        if kickon and k%2==0: add(kick(),tt,0.55)
        if claps and k%4==2: add(clap(),tt,0.22)
        add(shaker(),tt,0.05); add(shaker(),tt+0.25,0.035)
        # guitar strum pattern (down, down-up)
        strum(ch,tt,strumg,True)
        if k%2==1: strum(ch[1:],tt+0.25,strumg*0.7,False)
        # bass
        if k%2==0: add(ks(hz(ch[0]-12),0.9,0.3,0.997),tt,0.35)
        tt+=beat/2*2/2*2/2 if False else beat/2; k+=1
groove(15.5,19.0,True,True,0.11)
groove(19.0,22.2,False,False,0.07)
pad([50,54,57],19.0,3.3,0.06,0.4)
# clock tick feel during "nadie les dio seguimiento"
for k in range(6): click(19.2+k*0.5,0.18)
groove(22.2,24.3,True,False,0.09)
# coins
for c in range(9): ding(hz(100+(c%3)*2),16.8+c*0.22+0.6,0.10,0.35)
# typing
r2=np.random.default_rng(3)
for k in range(22): click(22.55+k*0.041+r2.uniform(0,0.01),0.12)
add(clap()*0.4,23.55,0.2)                 # tap send
whoosh(0.35,0.3,23.6); ding(hz(84),23.66,0.2,0.5)
shimmer(23.78,0.6,0.1,76)
# relight swell
whoosh(0.8,0.4,23.9)
add(boom(1.8,80,40,0.8),24.32,0.6); ding(hz(74),24.32,0.25,3.0); ding(hz(78),24.36,0.2,3.0); ding(hz(81),24.4,0.2,3.0)
n=int(SR*1.6); t=T(n); add(noise(n)*np.exp(-t/0.5)*0.12,24.32,0.6)
for k in range(15): ding(hz(86+(k%5)*2),24.35+k*0.06,0.05,0.3)
groove(24.5,29.0,True,True,0.12)
pad([62,66,69,74],25.5,4.5,0.07,0.6)
# final hits
add(boom(2.0,90,35,1.0),25.98,0.75); ding(hz(86),26.0,0.25,2.5); ding(hz(90),26.0,0.2,2.5)
strum([50,57,62,66,69,74],29.0,0.18)
ding(hz(74),29.0,0.25,1.0)

# ---------- master ----------
mix=np.stack([L,R],1)
i0,i1=int(12.95*SR),int(13.3*SR); mix[i0:i1]*=0.0   # dramatic silence
# fades
mix[:int(0.02*SR)]*=np.linspace(0,1,int(0.02*SR))[:,None]
f=int(0.5*SR); mix[-f:]*=np.linspace(1,0,f)[:,None]
mix=np.tanh(mix*1.2)/np.tanh(1.2)
mix=mix/np.max(np.abs(mix))*0.89
out=sys.argv[1]
with wave.open(out,'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix*32767).astype('<i2').tobytes())
print('ok',out)
