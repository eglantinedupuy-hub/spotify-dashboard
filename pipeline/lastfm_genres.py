"""
Genres for my listening, using Last.fm artist tags (Spotify no longer returns genres).

Usage (from the project root, after process_export.py):
    python pipeline/lastfm_genres.py

1. Takes every artist I've played at least MIN_PLAYS times (so small artists count too, max MAX_ARTISTS).
2. Fetches each artist's top tags from Last.fm (artist.getTopTags), cached in data/raw/cache/lastfm_tags.json
   (re-runs only fetch new artists, and an interrupted run picks up where it stopped).
3. Maps the messy user tags (RULES below; edit freely) to one main genre per artist. Electronic artists also
   get a precise subgenre. "French" is an extra label on top of the main genre (French rap = Rap + French).
4. Re-reads my history and adds up minutes per genre per month.

Writes data/processed/genres.json. Needs LASTFM_API_KEY in .env. Last.fm data: non-commercial use, credit Last.fm.
Tip: `python pipeline/lastfm_genres.py --tags` prints my most common raw tags, to tune RULES.
"""

import json
import os
import sys
import time
from collections import defaultdict
from pathlib import Path

import requests
from dotenv import load_dotenv

from process_export import load_plays

ROOT = Path(__file__).resolve().parent.parent
PROCESSED = ROOT / "data" / "processed"
CACHE = ROOT / "data" / "raw" / "cache" / "lastfm_tags.json"
API = "https://ws.audioscrobbler.com/2.0/"
MIN_PLAYS, MAX_ARTISTS = 3, 8000

FAMILIES = ["Pop", "French", "Rap/hip-hop", "R&B/soul", "Electronic", "Indie", "Rock", "Jazz", "Latin", "Reggae", "Other"]
ELECTRONIC_OTHER = "Electronic (other)"

# (family, electronic subgenre or None, words). A tag goes to the FIRST rule with a word found in it, so the
# specific rules come first: "french rap" -> Rap, "garage rock" -> Rock before "garage" -> UK garage, etc.
RULES = [
    ("Rock", None, ["garage rock", "post-punk", "post punk", "new wave", "psychedelic"]),
    ("Indie", None, ["britpop"]),
    ("Latin", None, ["reggaeton", "latin trap", "dembow"]),  # before "reggae" and "trap"
    ("Reggae", None, ["dancehall"]),  # before "dance"
    ("Jazz", None, ["acid jazz", "nu jazz", "nu-jazz"]),
    ("Pop", None, ["country pop", "dance pop", "dance-pop", "k-pop", "kpop", "j-pop", "jpop", "teen pop"]),
    ("Rap/hip-hop", None, ["hip hop", "hip-hop", "hiphop", "rap", "trap", "grime", "drill", "boom bap"]),
    # --- electronic, most specific first ---
    ("Electronic", "French touch", ["french touch", "french house", "filter house", "french electro", "ed banger"]),
    ("Electronic", "Afro house", ["afro house", "afro-house", "amapiano"]),
    ("Electronic", "Tech house", ["tech house", "tech-house"]),
    ("Electronic", "Deep house", ["deep house", "deep-house", "soulful house"]),
    ("Electronic", "Melodic house & techno", ["melodic techno", "melodic house", "progressive house", "organic house"]),
    ("Electronic", "Nu disco", ["nu disco", "nu-disco", "disco house", "italo", "french disco", "indie disco"]),
    ("Electronic", "UK garage", ["uk garage", "garage", "2-step", "2 step", "2step", "speed garage", "bassline", "future garage"]),
    ("Electronic", "Drum & bass", ["drum and bass", "drum n bass", "drum & bass", "drum'n'bass", "dnb", "d&b", "jungle", "liquid funk"]),
    ("Electronic", "Future bass", ["future bass", "melodic bass", "kawaii"]),
    ("Electronic", "Dubstep & bass", ["dubstep", "bass music", "riddim", "brostep", "wonky"]),
    ("Electronic", "Hard dance", ["hardstyle", "hardcore techno", "gabber", "hard dance"]),
    ("Electronic", "House", ["acid house", "lo-fi house", "outsider house", "chicago house"]),
    ("Electronic", "Techno", ["techno", "minimal", "acid", "ebm", "ghettotech", "rave"]),
    ("Electronic", "Trance", ["trance", "psytrance"]),
    ("Electronic", "EDM", ["edm", "eurodance", "big room", "electro house", "complextro", "tropical house", "moombahton", "festival"]),
    ("Electronic", "Synthwave", ["synthwave", "retrowave", "outrun", "darksynth", "vaporwave"]),
    ("Electronic", "Electropop & indie dance", ["electropop", "electro-pop", "indie dance", "indietronica", "nu rave", "dance-punk", "dance punk", "electroclash", "synthpop", "synth-pop", "synth pop"]),
    ("Electronic", "Ambient", ["ambient", "drone", "new age"]),
    ("Electronic", "Downtempo & chill", ["downtempo", "chillout", "chill out", "chill-out", "trip-hop", "trip hop", "triphop", "chillwave", "chillhop", "lounge"]),
    ("Electronic", "IDM & experimental", ["idm", "glitch", "breakbeat", "breaks", "experimental electronic", "leftfield"]),
    ("Electronic", "House", ["house"]),  # generic house, only if nothing more precise
    ("Electronic", ELECTRONIC_OTHER, ["electronic", "electronica", "electro", "dance", "club", "disco"]),
    # --- the rest, grouped ---
    ("R&B/soul", None, ["rnb", "r&b", "r and b", "soul", "funk", "motown", "new jack swing"]),
    ("Reggae", None, ["reggae", "dancehall", "ska", "dub", "roots"]),
    ("Latin", None, ["latin", "reggaeton", "salsa", "bachata", "cumbia", "spanish", "brazilian", "mpb", "bossa nova", "flamenco"]),
    ("Jazz", None, ["jazz", "blues", "swing", "bebop"]),
    ("Indie", None, ["indie", "alternative", "alt-", "dream pop", "shoegaze", "bedroom pop", "lo-fi", "lofi", "folk", "singer-songwriter", "singer songwriter", "acoustic"]),
    ("Rock", None, ["rock", "metal", "punk", "grunge", "emo", "hardcore"]),
    ("French", None, ["chanson", "variete", "variété", "francophone"]),
    ("Other", None, ["classical", "soundtrack", "score", "orchestral", "opera", "musical", "broadway", "country", "americana",
                     "afrobeat", "afropop", "world", "piano", "instrumental", "gospel", "disney"]),
    ("Pop", None, ["pop"]),
]
# Tags that make an artist "French" (on top of their main genre). The bare "french" tag (often just nationality)
# only counts when the artist isn't electronic, so Daft Punk stays French touch, not French.
FRENCH_WORDS = ["french", "france", "francais", "français", "chanson", "variete", "variété", "quebec", "québec", "québécois", "francophone", "rap fr"]
NOT_FRENCH = ["french house", "french touch", "french electro", "french disco"]
OTHER_WEIGHT = 0.5
FRENCH_MIN_WEIGHT = 15  # Last.fm tag weights go 0–100 (100 = the artist's strongest tag)
# Tags that say nothing about genre
IGNORE = {"seen live", "female vocalists", "male vocalists", "female vocalist", "male vocalist", "favorites", "favourite", "favorite",
          "british", "american", "usa", "uk", "canadian", "australian", "belgian", "spotify", "beautiful", "love", "awesome",
          "00s", "10s", "90s", "80s", "2000s", "2010s", "2020s", "all", "under 2000 listeners", "female", "male"}


def rule_for(tag):
    for family, sub, words in RULES:
        if any(w in tag for w in words):
            return family, sub
    return None, None


def classify(tags):
    """tags: [(name, weight)] -> {"g": main family, "sub": electronic subgenre (or None), "fr": bool} or None."""
    fam_score, sub_score, french = defaultdict(float), defaultdict(float), 0.0
    bare_french = 0.0
    for name, weight in tags[:15]:
        t = name.lower().strip()
        w = weight or 1
        if t in IGNORE:
            continue
        if any(x in t for x in FRENCH_WORDS) and not any(x in t for x in NOT_FRENCH):
            if t in ("french", "france"):
                bare_french += w
            else:
                french += w
        family, sub = rule_for(t)
        if family == "Other":
            w *= OTHER_WEIGHT  # catch-all: only wins when nothing else fits (Taylor Swift = Pop, not country)
        if family:
            fam_score[family] += w
            if sub:
                sub_score[sub] += w
    if not fam_score:
        if french + bare_french >= FRENCH_MIN_WEIGHT:
            return {"g": "French", "sub": None, "fr": True}
        return None
    main = max(fam_score, key=fam_score.get)
    sub = None
    if main == "Electronic":
        precise = {k: v for k, v in sub_score.items() if k not in ("House", ELECTRONIC_OTHER)}
        best = max(precise, key=precise.get) if precise else None
        house = sub_score.get("House", 0)
        if best and precise[best] * 2 >= house:
            sub = best  # a precise style wins unless plain "house" is much stronger
        else:
            sub = "House" if house else ELECTRONIC_OTHER
        # French electronic artists tagged only "house"/"electro" are French touch (Daft Punk, Justice)
        if sub in ("House", ELECTRONIC_OTHER, "Techno") and (bare_french + french >= FRENCH_MIN_WEIGHT or sub_score.get("French touch")):
            if sub != "Techno" or sub_score.get("French touch"):
                sub = "French touch"
    else:
        french += bare_french  # the bare "french" tag counts for non-electronic artists
    is_french = main == "French" or french >= FRENCH_MIN_WEIGHT
    return {"g": main, "sub": sub, "fr": is_french}


def fetch_tags(session, key, artist):
    for attempt in range(4):
        try:
            r = session.get(API, params={"method": "artist.gettoptags", "artist": artist, "api_key": key,
                                         "format": "json", "autocorrect": 1}, timeout=15)
        except requests.RequestException:  # timeout / dropped connection: wait a bit and try again
            time.sleep(2 * (attempt + 1))
            continue
        if r.status_code == 429 or (r.ok and r.json().get("error") == 29):  # rate limit
            time.sleep(3 * (attempt + 1))
            continue
        if r.status_code in (401, 403) or (r.ok and r.json().get("error") in (10, 26)):
            sys.exit("Last.fm rejected the API key. Check LASTFM_API_KEY in .env.")
        if not r.ok or "error" in r.json():  # artist not found etc.
            return []
        tags = r.json().get("toptags", {}).get("tag", [])
        return [(t["name"], int(t.get("count") or 0)) for t in tags]
    return None  # Last.fm didn't answer: not cached, so the next run tries this artist again


def print_common_tags(cache, top=150):
    """--tags: my most common raw Last.fm tags (weighted), and which rule each one hits."""
    score = defaultdict(float)
    for tags in cache.values():
        for name, w in tags[:15]:
            score[name.lower().strip()] += w or 1
    for t, v in sorted(score.items(), key=lambda kv: -kv[1])[:top]:
        fam, sub = rule_for(t)
        label = "ignored" if t in IGNORE else (f"{fam}{' / ' + sub if sub else ''}" if fam else "— no rule")
        print(f"{v:>9.0f}  {t:<32} {label}")


def main():
    load_dotenv(ROOT / ".env")
    cache = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}
    if "--tags" in sys.argv:
        return print_common_tags(cache)
    key = os.environ.get("LASTFM_API_KEY", "").strip()
    if not key:
        sys.exit("LASTFM_API_KEY is missing from .env")

    # 1. which artists to look up: everyone I've played at least MIN_PLAYS times
    artists = json.loads((PROCESSED / "artists_index.json").read_text(encoding="utf-8"))
    total = sum(a["minutes"] for a in artists) or 1
    chosen = [a["name"] for a in artists if a.get("plays", 0) >= MIN_PLAYS][:MAX_ARTISTS]
    covered = sum(a["minutes"] for a in artists if a["name"] in set(chosen))

    # 2. tags (cached)
    todo = [a for a in chosen if a not in cache]
    print(f"{len(chosen)} artists with {MIN_PLAYS}+ plays ({covered / total:.0%} of my listening); "
          f"{len(todo)} to fetch from Last.fm (~{len(todo) // 4 // 60 + 1} min, safe to stop and re-run)")
    s = requests.Session()
    s.headers["User-Agent"] = "personal-listening-dashboard"
    failed = []
    for i, name in enumerate(todo, 1):
        tags = fetch_tags(s, key, name)
        if tags is None:
            failed.append(name)
        else:
            cache[name] = tags
        time.sleep(0.22)  # stay under ~5 requests/second
        if i % 50 == 0 or i == len(todo):
            print(f"  {i}/{len(todo)}")
            CACHE.parent.mkdir(parents=True, exist_ok=True)
            CACHE.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")

    if failed:
        print(f"  Last.fm didn't answer for {len(failed)} artists (e.g. {', '.join(failed[:3])}); "
              "they count as Unclassified for now — run again later to retry them.")

    # artists Last.fm has no usable tags for stay "Unclassified" (left out of the percentages)
    info = {a: c for a in chosen if (c := classify(cache.get(a, [])))}

    # 3. minutes per genre per month, from the full history.
    # Each play counts once in its main genre; French artists ALSO count in "French" (overlap on purpose).
    by_month = defaultdict(lambda: defaultdict(float))
    by_month_sub = defaultdict(lambda: defaultdict(float))  # electronic subgenres
    total_by_month = defaultdict(float)
    # top artists / tracks inside each genre or subgenre, all-time and per year
    tops = defaultdict(lambda: defaultdict(lambda: {"artists": defaultdict(float), "tracks": defaultdict(float)}))
    track_ids = {}
    for p in load_plays(ROOT / "data" / "raw"):
        a = info.get(p["artist"])
        m = p["ms"] / 60_000
        month = p["local"].strftime("%Y-%m")
        total_by_month[month] += m
        if not a:
            by_month[month]["Unclassified"] += m
            continue
        labels = [a["g"]] + (["French"] if a["fr"] and a["g"] != "French" else [])
        for g in labels:
            by_month[month][g] += m
        if a["sub"]:
            by_month_sub[month][a["sub"]] += m
            labels.append(a["sub"])
        tkey = (p["track"], p["artist"])
        track_ids.setdefault(tkey, p["track_id"])
        for g in labels:
            for period in ("all", str(p["local"].year)):
                tops[g][period]["artists"][p["artist"]] += m
                tops[g][period]["tracks"][tkey] += m

    def top_n(d, n=8):
        return sorted(d.items(), key=lambda kv: -kv[1])[:n]

    top_by_genre = {
        g: {period: {
            "artists": [{"name": a, "minutes": round(v, 1)} for a, v in top_n(lists["artists"])],
            "tracks": [{"name": t, "artist": a, "minutes": round(v, 1), "track_id": track_ids.get((t, a))} for (t, a), v in top_n(lists["tracks"])],
        } for period, lists in periods.items()}
        for g, periods in tops.items()
    }

    subs = []
    for _, sub, _ in RULES:
        if sub and sub not in subs:
            subs.append(sub)
    rnd = lambda d: {k: round(v, 1) for k, v in sorted(d.items())}
    out = {
        "source": "Last.fm artist tags",
        "genres": FAMILIES,
        "electronic_subgenres": subs,
        "by_month": {m: rnd(gs) for m, gs in sorted(by_month.items())},
        "by_month_electronic": {m: rnd(gs) for m, gs in sorted(by_month_sub.items())},
        "total_by_month": rnd(total_by_month),
        # genre of my top 1,000 artists: {"g": family, "sub": electronic subgenre, "fr": French}
        "artists": {a: {k: v for k, v in info[a].items() if v} for a in chosen[:1000] if a in info},
        "top_by_genre": top_by_genre,
        "coverage": round(covered / total, 3),
        "min_plays": MIN_PLAYS,
    }
    (PROCESSED / "genres.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    counts = defaultdict(int)
    for a in info.values():
        counts[a["sub"] or a["g"]] += 1
    print("Done. Artists per genre:", ", ".join(f"{g} {n}" for g, n in sorted(counts.items(), key=lambda x: -x[1])))
    print(f"French artists: {sum(1 for a in info.values() if a['fr'])}; no usable tags: {len(chosen) - len(info)}")


if __name__ == "__main__":
    main()
