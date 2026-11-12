"""Vídeo «Ver cómo funciona» de Claqueta (≈30 s, 1920×1080).

Pasos (cada uno se puede repetir por separado):
  python make_video.py --tools DIR voice    # locución (voz neuronal gratuita de Edge) + tiempos
  python make_video.py --tools DIR assets   # carteles de TMDB para las escenas
  node   render.mjs                         # fotogramas de la animación (video.html)
  python make_video.py --tools DIR audio    # música original + efectos + voz, mezclados
  python make_video.py --tools DIR mux      # MP4 final + subtítulos en public/guide

DIR es una carpeta con edge-tts, imageio-ffmpeg y numpy instalados (pip install --target DIR ...).
El guion está en src/lib/guide-video.json (lo usa también el reproductor para la transcripción).
Todo lo intermedio va a scripts/guide/work (ignorado por git).
"""
import argparse, asyncio, json, math, re, subprocess, sys, urllib.request, wave
from pathlib import Path

ap = argparse.ArgumentParser()
ap.add_argument("--tools")
ap.add_argument("steps", nargs="+")
args = ap.parse_args()
if args.tools:
    sys.path.insert(0, args.tools)

ROOT = Path(__file__).resolve().parents[2]
HERE = ROOT / "scripts/guide"
WORK = HERE / "work"
OUT = ROOT / "public/guide"
WORK.mkdir(exist_ok=True)
SCENES = json.loads((ROOT / "src/lib/guide-video.json").read_text(encoding="utf-8"))
VOICE = "es-ES-XimenaNeural"
BPM = 120
BEAT = 60 / BPM
SR = 44100
LEAD = 0.25  # silencio antes de que hable en cada escena


def ffmpeg():
    import imageio_ffmpeg

    return imageio_ffmpeg.get_ffmpeg_exe()


def run(cmd):
    p = subprocess.run([str(c) for c in cmd], capture_output=True, text=True, encoding="utf-8", errors="replace")
    if p.returncode:
        raise RuntimeError(p.stderr[-3000:])
    return p


def duration(path):
    p = subprocess.run([ffmpeg(), "-i", str(path)], capture_output=True, text=True, encoding="utf-8", errors="replace")
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", p.stderr)
    return int(m[1]) * 3600 + int(m[2]) * 60 + float(m[3])


# ---------------- Voz ----------------
async def voice():
    import edge_tts

    timeline, t = [], 0.0
    for i, s in enumerate(SCENES):
        mp3 = WORK / f"voice-{i}.mp3"
        words = []
        com = edge_tts.Communicate(s["es"], VOICE, rate="+10%", pitch="+0Hz", boundary="WordBoundary")
        with mp3.open("wb") as f:
            async for ev in com.stream():
                if ev["type"] == "audio":
                    f.write(ev["data"])
                elif ev["type"] == "WordBoundary":
                    words.append({"t": ev["offset"] / 1e7, "d": ev["duration"] / 1e7, "w": ev["text"]})
        d = words[-1]["t"] + words[-1]["d"]  # fin real de la voz (el mp3 trae silencio al final)
        # Cada escena dura lo que la voz + un respiro, redondeado a medio compás: los cortes caen en la música
        dur = max(2.5, math.ceil((LEAD + d + 0.35) / BEAT) * BEAT)
        if s["id"] == "cta":
            dur += 1.0  # el cierre respira
        timeline.append({**s, "start": round(t, 3), "dur": round(dur, 3), "voice": round(d, 3), "words": words})
        t += dur
        print(f"{s['id']:9} voz {d:5.2f}s escena {dur:4.1f}s")
    (WORK / "timeline.json").write_text(json.dumps({"total": round(t, 3), "lead": LEAD, "scenes": timeline}, ensure_ascii=False, indent=1), encoding="utf-8")
    print("total", round(t, 2), "s")


# ---------------- Carteles (TMDB) ----------------
def tmdb(path):
    env = dict(re.findall(r"^([A-Z0-9_]+)=(.*)$", (ROOT / ".env.local").read_text(encoding="utf-8"), re.M))
    req = urllib.request.Request(f"https://api.themoviedb.org/3{path}", headers={"Authorization": f"Bearer {env['TMDB_READ_TOKEN'].strip()}"})
    return json.loads(urllib.request.urlopen(req, timeout=30).read())


def assets():
    pics = WORK / "img"
    pics.mkdir(exist_ok=True)
    out = {}

    def grab(key, poster, size="w500"):
        if not poster:
            return
        f = pics / f"{key}.jpg"
        if not f.exists():
            f.write_bytes(urllib.request.urlopen(f"https://image.tmdb.org/t/p/{size}{poster}", timeout=30).read())
        out[key] = f"img/{key}.jpg"

    named = {
        "dune": ("movie", 693134), "stranger": ("tv", 66732), "oppen": ("movie", 872585), "barbie": ("movie", 346698),
        "hp1": ("movie", 671), "hp2": ("movie", 672), "hp3": ("movie", 673), "lastofus": ("tv", 100088),
        "bear": ("tv", 136315), "wednesday": ("tv", 119051), "interstellar": ("movie", 157336), "spider": ("movie", 569094),
    }
    for k, (kind, i) in named.items():
        d = tmdb(f"/{kind}/{i}?language=es-ES")
        grab(k, d.get("poster_path"))
        if k == "stranger":
            grab("stranger_bg", d.get("backdrop_path"), "w1280")
        if k == "dune":
            grab("dune_bg", d.get("backdrop_path"), "w1280")
    wall = []
    for page in (1, 2):
        for r in tmdb(f"/trending/all/week?language=es-ES&page={page}")["results"]:
            if r.get("poster_path") and len(wall) < 36:
                grab(f"w{len(wall)}", r["poster_path"], "w342")
                wall.append(f"w{len(wall)}")
    out["wall"] = [out[k] for k in wall]
    (WORK / "posters.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
    print(len(out), "carteles")


# ---------------- Música original + efectos ----------------
def audio():
    import numpy as np

    tl = json.loads((WORK / "timeline.json").read_text(encoding="utf-8"))
    total = tl["total"]
    n = int((total + 0.6) * SR)
    t_all = np.arange(n) / SR
    rng = np.random.default_rng(7)

    def env(length, a=0.005, d=0.2):
        x = np.arange(int(length * SR)) / SR
        return np.minimum(1, x / a) * np.exp(-x / d)

    def add(buf, sig, at, gain=1.0):
        i = int(at * SR)
        if i >= len(buf):
            return
        j = min(len(buf), i + len(sig))
        buf[i:j] += sig[: j - i] * gain

    music = np.zeros(n)
    # Progresión luminosa (Re mayor): D – A – Bm – G, un acorde por compás
    chords = [[62, 66, 69, 74], [61, 64, 69, 73], [59, 62, 66, 71], [59, 62, 67, 74]]
    roots = [38, 33, 35, 31]
    hz = lambda m: 440 * 2 ** ((m - 69) / 12)
    bar = BEAT * 4
    end_music = total - 0.3

    def kick():
        x = np.arange(int(0.35 * SR)) / SR
        f = 45 + 110 * np.exp(-x * 30)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 9)

    def hat(open_=False):
        x = np.arange(int((0.12 if open_ else 0.04) * SR))
        s = rng.standard_normal(len(x))
        s = np.diff(np.concatenate([[0], s]))  # agudos
        return s * np.exp(-x / SR / (0.05 if open_ else 0.012))

    def clap():
        x = np.arange(int(0.18 * SR)) / SR
        s = rng.standard_normal(len(x))
        s = s - np.convolve(s, np.ones(8) / 8, "same")
        e = np.exp(-x * 25) + 0.5 * np.exp(-((x - 0.01) ** 2) / 1e-5)
        return s * e

    def pluck(m, length=0.32):
        x = np.arange(int(length * SR)) / SR
        f = hz(m)
        s = sum(np.sin(2 * np.pi * f * k * x) / k ** 1.4 for k in range(1, 6))
        return s * np.minimum(1, x / 0.004) * np.exp(-x * 9)

    def bass(m, length):
        x = np.arange(int(length * SR)) / SR
        f = hz(m)
        s = np.sin(2 * np.pi * f * x) + 0.3 * np.sin(2 * np.pi * 2 * f * x)
        return np.tanh(1.6 * s) * np.minimum(1, x / 0.01) * np.minimum(1, (length - x) / 0.03)

    def pad(ms, length):
        x = np.arange(int(length * SR)) / SR
        s = sum(np.sin(2 * np.pi * hz(m) * x * (1 + d)) for m in ms for d in (-0.003, 0.003))
        return s / (2 * len(ms)) * np.minimum(1, x / 0.4) * np.minimum(1, (length - x) / 0.4)

    K, CL, HH, HO = kick(), clap(), hat(), hat(True)
    intro_bars = 1  # el gancho empieza solo con pad y plucks: el golpe entra con la marca
    b, t0 = 0, 0.0
    while t0 < end_music:
        c = b % 4
        add(music, pad(chords[c], bar), t0, 0.16)
        for s16 in range(16):
            ts = t0 + s16 * BEAT / 4
            if ts >= end_music:
                break
            full = b >= intro_bars
            if full and s16 % 4 == 0:
                add(music, K, ts, 0.9)
            if full and s16 in (4, 12):
                add(music, CL, ts, 0.35)
            if full and s16 % 2 == 1:
                add(music, HO if s16 % 4 == 2 else HH, ts, 0.12)
            if full and s16 % 2 == 0:
                add(music, HH, ts, 0.07)
            # Arpegio de plucks en semicorcheas alternas
            if s16 % 2 == 0:
                note = chords[c][[0, 2, 1, 3, 2, 3, 1, 2][s16 // 2]] + 12
                add(music, pluck(note), ts, 0.18 if full else 0.13)
            if full and s16 % 2 == 0:
                add(music, bass(roots[c] + (12 if s16 % 8 == 6 else 0), BEAT / 2 * 0.9), ts, 0.3)
        b += 1
        t0 += bar
    # Final: acorde largo
    add(music, pad([62, 66, 69, 74, 78], 2.5), end_music - 0.5, 0.25)

    # Ducking suave cuando habla
    voice = np.zeros(n)
    for i, s in enumerate(tl["scenes"]):
        p = WORK / f"voice-{i}.wav"
        run([ffmpeg(), "-y", "-i", WORK / f"voice-{i}.mp3", "-ac", "1", "-ar", SR, p])
        with wave.open(str(p)) as w:
            v = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16) / 32768
        add(voice, v, s["start"] + tl["lead"], 1.0)
    level = np.convolve(np.abs(voice), np.ones(2205) / 2205, "same")
    duck = 1 - 0.5 * np.clip(level * 12, 0, 1)
    duck = np.convolve(duck, np.ones(4410) / 4410, "same")

    # Efectos: «whoosh» en cada cambio de escena, «pop» y «ding» en momentos clave
    sfx = np.zeros(n)

    def whoosh(length=0.45):
        x = np.arange(int(length * SR)) / SR
        s = rng.standard_normal(len(x))
        out, y, k = np.zeros(len(x)), 0.0, 0
        for i in range(len(x)):  # filtro paso bajo que se abre y se cierra
            a = 0.02 + 0.5 * math.sin(math.pi * x[i] / length) ** 2
            y += a * (s[i] - y)
            out[i] = y
        return out * np.sin(np.pi * x / length) ** 2 * 1.4

    def pop(f=880):
        x = np.arange(int(0.12 * SR)) / SR
        fr = f * (1 + 0.6 * np.exp(-x * 40))
        return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-x * 30)

    def ding():
        x = np.arange(int(0.9 * SR)) / SR
        return (np.sin(2 * np.pi * 1318.5 * x) + 0.5 * np.sin(2 * np.pi * 1975.5 * x)) * np.exp(-x * 5) * np.minimum(1, x / 0.003)

    def riser(length):
        x = np.arange(int(length * SR)) / SR
        f = 200 + 1600 * (x / length) ** 2
        s = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.3 + rng.standard_normal(len(x)) * 0.2
        return s * (x / length) ** 2

    W = whoosh()
    for s in tl["scenes"][1:]:
        add(sfx, W, s["start"] - 0.22, 0.35)
    for at, kind in json.loads((WORK / "cues.json").read_text(encoding="utf-8")):
        if kind == "pop":
            add(sfx, pop(), at, 0.22)
        elif kind == "pop2":
            add(sfx, pop(1320), at, 0.2)
        elif kind == "ding":
            add(sfx, ding(), at, 0.28)
        elif kind == "riser":
            add(sfx, riser(1.2), at - 1.2, 0.3)
        elif kind == "boom":
            add(sfx, kick() * 1.0, at, 1.0)

    # Niveles: la música queda ~13 dB por debajo de la voz; los efectos, a medio camino
    rms = lambda a: np.sqrt(np.mean(a[np.abs(a) > 1e-4] ** 2)) if np.any(np.abs(a) > 1e-4) else 1e-9
    v_rms = rms(voice)
    music *= v_rms / rms(music) * 10 ** (-13 / 20)
    sfx *= v_rms / rms(sfx) * 10 ** (-9 / 20)
    mix = music * duck + sfx + voice
    mix[-int(0.5 * SR):] *= np.linspace(1, 0, int(0.5 * SR))
    # Volumen final: voz a unos -16 dBFS y limitador suave para los picos
    mix *= 10 ** (-16 / 20) / v_rms
    mix = np.tanh(mix * 1.1) / np.tanh(1.1) * 0.97
    pcm = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(WORK / "mix.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print("mezcla", round(len(pcm) / SR, 2), "s")


# ---------------- Montaje final + subtítulos ----------------
def vtt_time(x):
    h, r = divmod(x, 3600)
    m, s = divmod(r, 60)
    return f"{int(h):02}:{int(m):02}:{s:06.3f}"


def mux():
    tl = json.loads((WORK / "timeline.json").read_text(encoding="utf-8"))
    out = OUT / "claqueta.mp4"
    run([ffmpeg(), "-y", "-framerate", 30, "-i", WORK / "frames/f%05d.jpg", "-i", WORK / "mix.wav",
         "-vf", "scale=1280:-2:flags=lanczos", "-c:v", "libx264", "-preset", "slow", "-crf", 26, "-tune", "animation", "-pix_fmt", "yuv420p", "-profile:v", "high",
         "-c:a", "aac", "-b:a", "128k", "-ar", 44100, "-movflags", "+faststart", "-shortest", out])
    run([ffmpeg(), "-y", "-ss", 5.6, "-i", out, "-frames:v", 1, "-vf", "scale=1280:-1", "-q:v", 4, OUT / "claqueta-poster.jpg"])
    for lang in ("es", "en"):
        lines = ["WEBVTT", ""]
        for s in tl["scenes"]:
            a = s["start"] + tl["lead"]
            b = min(s["start"] + s["dur"] - 0.05, a + s["voice"] + 0.3)
            lines += [f"{vtt_time(a)} --> {vtt_time(b)}", s[lang], ""]
        (OUT / f"claqueta-{lang}.vtt").write_text("\n".join(lines), encoding="utf-8")
    print("listo", out, round(out.stat().st_size / 1024 / 1024, 2), "MB", round(duration(out), 2), "s")


for step in args.steps:
    {"voice": lambda: asyncio.run(voice()), "assets": assets, "audio": audio, "mux": mux}[step]()
