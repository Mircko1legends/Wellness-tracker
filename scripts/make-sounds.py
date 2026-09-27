"""Synthesizes the notification sounds (one per kind of activity) into assets/sounds/*.wav.

Each sound is short, soft and clearly different from the others, so after a few weeks the sound alone
says what to do. Pure Python: run `python3 scripts/make-sounds.py` to regenerate.
"""
import math
import os
import struct
import wave

RATE = 44100
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "sounds")


def silence(seconds):
    return [0.0] * int(RATE * seconds)


def note(freq, dur, partials=((1.0, 1.0, 0.4),), attack=0.005, glide_to=None, glide_time=0.0, vibrato=0.0):
    """Additive tone: partials are (frequency ratio, amplitude, decay seconds)."""
    n = int(RATE * dur)
    out = [0.0] * n
    phase = [0.0] * len(partials)
    for i in range(n):
        t = i / RATE
        f = freq
        if glide_to and glide_time > 0:
            k = min(1.0, t / glide_time)
            f = freq + (glide_to - freq) * (1 - (1 - k) ** 2)
        if vibrato:
            f *= 1 + vibrato * math.sin(2 * math.pi * 5.5 * t)
        env_a = min(1.0, t / attack) if attack > 0 else 1.0
        s = 0.0
        for j, (ratio, amp, decay) in enumerate(partials):
            phase[j] += 2 * math.pi * f * ratio / RATE
            s += amp * math.exp(-t / decay) * math.sin(phase[j])
        out[i] = s * env_a
    return out


def mix(length, *events):
    """events: (start seconds, samples, gain)."""
    buf = [0.0] * int(RATE * length)
    for start, samples, gain in events:
        o = int(RATE * start)
        for i, v in enumerate(samples):
            if o + i < len(buf):
                buf[o + i] += v * gain
    return buf


def reverb(buf, mix_amount=0.18):
    """Small room: a few feedback delays, just enough to sound less synthetic."""
    out = buf[:]
    for delay_ms, fb in ((29.7, 0.5), (37.1, 0.45), (41.1, 0.4), (43.7, 0.35)):
        d = int(RATE * delay_ms / 1000)
        line = [0.0] * len(buf)
        for i in range(len(buf)):
            line[i] = buf[i] + (line[i - d] * fb if i >= d else 0.0)
        for i in range(len(buf)):
            out[i] += line[i] * mix_amount / 4
    return out


def finish(buf, peak=0.7):
    fade = int(RATE * 0.05)
    for i in range(fade):
        buf[-1 - i] *= i / fade
    m = max(abs(v) for v in buf) or 1.0
    return [v / m * peak for v in buf]


def save(name, buf):
    path = os.path.join(OUT, name + ".wav")
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, v)) * 32767)) for v in buf))
    print(path, round(len(buf) / RATE, 2), "s")


BELL = ((1.0, 1.0, 0.6), (2.0, 0.35, 0.25), (3.0, 0.15, 0.12), (4.2, 0.08, 0.06))
MARIMBA = ((1.0, 1.0, 0.35), (4.0, 0.25, 0.06), (9.9, 0.06, 0.02))
KALIMBA = ((1.0, 1.0, 0.5), (5.4, 0.18, 0.05), (2.0, 0.1, 0.2))
GLASS = ((1.0, 1.0, 0.7), (2.76, 0.3, 0.25), (5.4, 0.1, 0.08))
BOWL = ((1.0, 1.0, 1.6), (2.71, 0.45, 0.9), (5.1, 0.2, 0.4))

# Water: two little droplets
drop = lambda f0, f1: note(f0, 0.3, ((1.0, 1.0, 0.07), (2.0, 0.15, 0.04)), attack=0.002, glide_to=f1, glide_time=0.05)
save("water", finish(reverb(mix(0.9, (0.0, drop(620, 1450), 1.0), (0.17, drop(760, 1700), 0.8)), 0.25)))

# Meal: warm marimba, "a tavola"
save("meal", finish(reverb(mix(1.1, (0.0, note(784, 0.8, MARIMBA), 1.0), (0.16, note(1047, 0.8, MARIMBA), 0.9)))))

# Training (weights, MMA): low punch + three rising bright hits
kick = note(120, 0.35, ((1.0, 1.0, 0.12),), attack=0.001, glide_to=55, glide_time=0.12)
hit = lambda f: note(f, 0.5, ((1.0, 1.0, 0.18), (2.0, 0.4, 0.08), (3.0, 0.2, 0.05)), attack=0.002)
save("training", finish(reverb(mix(1.0, (0.0, kick, 1.0), (0.0, hit(1047), 0.55), (0.1, hit(1319), 0.6), (0.2, hit(1568), 0.7)), 0.15)))

# Study: one calm singing bowl, slightly beating
bowl = [a + b for a, b in zip(note(432, 2.2, BOWL, attack=0.02), note(434.5, 2.2, BOWL, attack=0.02))]
save("study", finish(reverb(mix(2.2, (0.0, bowl, 1.0)), 0.2), peak=0.6))

# Hygiene and skincare: airy glass arpeggio
save("hygiene", finish(reverb(mix(1.4, *[(i * 0.07, note(f, 1.0, GLASS), 0.8) for i, f in enumerate((1047, 1319, 1568, 1976))]), 0.3)))

# Contact lenses: gentle two-tone "ding-dong"
save("lens", finish(reverb(mix(1.5, (0.0, note(988, 1.0, BELL), 1.0), (0.28, note(784, 1.1, BELL), 1.0)))))

# Medicines: soft major chord with a slow attack
chord = [sum(v) for v in zip(*(note(f, 1.4, ((1.0, 1.0, 0.8), (2.0, 0.2, 0.4)), attack=0.08) for f in (349, 440, 523)))]
save("meds", finish(reverb(mix(1.5, (0.0, chord, 1.0)), 0.25), peak=0.6))

# Evening and sleep: slow descending lullaby
lull = lambda f: note(f, 0.9, ((1.0, 1.0, 0.5), (2.0, 0.1, 0.3)), attack=0.03, vibrato=0.004)
save("sleep", finish(reverb(mix(1.6, (0.0, lull(880), 0.8), (0.28, lull(698), 0.8), (0.56, lull(587), 0.9)), 0.3), peak=0.55))

# Rest timer: three clear pings and a higher one: "go"
ping = lambda f: note(f, 0.5, BELL, attack=0.002)
save("rest", finish(reverb(mix(1.2, (0.0, ping(1319), 0.8), (0.22, ping(1319), 0.8), (0.44, ping(1319), 0.8), (0.66, ping(1760), 1.0)), 0.12)))

# Everything else in the routine: kalimba
save("routine", finish(reverb(mix(1.0, (0.0, note(1175, 0.8, KALIMBA), 1.0), (0.12, note(880, 0.8, KALIMBA), 0.9)))))
