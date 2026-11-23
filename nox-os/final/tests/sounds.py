"""Create the bundled ring, notification, and cassette. Python standard library."""
import math
import random
import struct
import wave
from pathlib import Path
from array import array

ROOT = Path(__file__).resolve().parents[1] / 'assets'
RATE = 22050

def render(name, seconds, notes, noise=0):
    rng = random.Random(206)
    out = array('h')
    for i in range(int(RATE*seconds)):
        t = i/RATE
        sound = noise*rng.uniform(-1,1) + noise*math.sin(2*math.pi*53*t)
        for start, duration, freq, volume in notes:
            phase = t-start
            if 0 <= phase < duration:
                envelope = min(1,phase/.015,(duration-phase)/.035)
                sound += volume*envelope*(math.sin(2*math.pi*freq*phase)+.18*math.sin(4*math.pi*freq*phase))
        sound *= max(0,min(1,t/.04,(seconds-t)/.1))
        out.append(int(max(-1,min(1,sound))*32760))
    with wave.open(str(ROOT/f'{name}.wav'),'wb') as w:
        w.setparams((1,2,RATE,0,'NONE','not compressed'))
        w.writeframes(struct.pack('<'+'h'*len(out),*out))

render('notification',.58,[(0,.23,523,.19),(.11,.33,784,.14)])
render('ring',2.8,[(t,.28,f,.19) for t,f in [(0,355),(.19,428),(.65,355),(.84,428),(1.3,355),(1.49,428)]],.017)
render('cassette',5.2,[(1,1.05,328,.32),(2.82,.22,328,.32),(3.22,.22,328,.32)],.043)
render('interference',1.4,[(0,.38,87,.23),(.32,.56,111,.19),(.81,.29,122,.11)],.045)
