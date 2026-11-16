"""
Listener personas: "when" I listen x "how" I listen, e.g. "Night-owl Loyalist".

Usage (from the project root, after process_export.py):
    python pipeline/personas.py

Computes a few habit stats from my full history, for all time and for the last 12 months, then picks
the persona that fits best on each axis. Thresholds are in WHEN / HOW below (edit freely).
Writes data/processed/personas.json (only aggregate numbers, no individual plays).
"""

import json
from collections import Counter, defaultdict
from datetime import timedelta
from pathlib import Path

from process_export import PLAY_THRESHOLD_MS, load_plays

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "processed" / "personas.json"
SESSION_GAP = timedelta(minutes=30)  # a pause longer than this starts a new listening session

# Each persona: (id, title, adjective used in the combined name, description, stat, threshold).
# A persona "fits" when stat >= threshold; the best fit is the one furthest above its threshold (stat / threshold).
WHEN = [
    ("night_owl", "Night owl", "Night-owl", "Most alive after 10 pm", "night_share", 0.25),
    ("early_bird", "Early bird", "Early-bird", "Music starts with the morning coffee", "morning_share", 0.25),
    ("nine_to_five", "9-to-5 soundtrack", "9-to-5", "Music to work and study to", "workday_share", 0.45),
    ("weekend", "Weekend binger", "Weekend", "Saves the big sessions for Saturday and Sunday", "weekend_share", 0.38),
    ("always_on", "Always on", "Always-on", "Music almost every day, at every hour", "days_share", 0.92),
]
HOW = [
    ("loyalist", "Loyalist", "Loyalist", "Keeps coming back to the same favourite artists", "top10_share", 0.30),
    ("explorer", "Explorer", "Explorer", "Always digging for new artists", "new_artist_rate", 0.04),
    ("repeater", "On repeat", "Repeater", "Finds a song and plays it into the ground", "repeat_share", 0.20),
    ("marathoner", "Marathoner", "Marathoner", "Long, uninterrupted listening sessions", "long_session_share", 0.45),
    ("skipper", "Skipper", "Skipper", "Quick to hit next", "skip_rate", 0.35),
    ("album", "Album listener", "Album listener", "Lets albums and playlists play in order", "in_order_share", 0.60),
    ("shuffler", "Shuffler", "Shuffler", "Lets shuffle decide", "shuffle_share", 0.60),
]
STAT_LABELS = {  # shown after the % on the Habits page
    "night_share": "between 10 pm and 5 am",
    "morning_share": "between 5 and 11 am",
    "workday_share": "on weekdays, 9 to 5",
    "weekend_share": "on weekends",
    "days_share": "of days with music",
    "top10_share": "on my top 10 artists",
    "new_artist_rate": "of plays are a new artist",
    "repeat_share": "of plays are a same-day repeat",
    "long_session_share": "in sessions of 2 h+",
    "skip_rate": "skipped under 30 s",
    "in_order_share": "with shuffle off",
    "shuffle_share": "with shuffle on",
}


def stats_for(plays, first_artist_play):
    """Habit stats over a list of plays (all sorted by time)."""
    total_ms = sum(p["ms"] for p in plays) or 1
    by_hour = defaultdict(int)
    weekend = workday = 0
    days = set()
    artists = Counter()
    counted = skipped = shuffle_on = shuffle_known = new_artist = repeats = 0
    per_day_track = Counter()
    for p in plays:
        lt, ms = p["local"], p["ms"]
        by_hour[lt.hour] += ms
        if lt.weekday() >= 5:
            weekend += ms
        elif 9 <= lt.hour < 17:
            workday += ms
        days.add(lt.date())
        artists[p["artist"]] += ms
        if ms < PLAY_THRESHOLD_MS:
            skipped += 1
        else:
            counted += 1
            if first_artist_play.get(p["artist"]) is p:
                new_artist += 1
            k = (lt.date(), p["track"], p["artist"])
            if per_day_track[k]:
                repeats += 1
            per_day_track[k] += 1
        if p.get("shuffle") is not None:
            shuffle_known += 1
            shuffle_on += bool(p["shuffle"])

    # sessions: plays separated by less than SESSION_GAP (from end of one to start of the next)
    long_ms, session_ms, last_end, sessions = 0, 0, None, []
    for p in plays:
        start = p["ts"] - timedelta(milliseconds=p["ms"])  # export timestamps are when the play ended
        if last_end is not None and start - last_end > SESSION_GAP:
            sessions.append(session_ms)
            session_ms = 0
        session_ms += p["ms"]
        last_end = p["ts"]
    sessions.append(session_ms)
    long_ms = sum(s for s in sessions if s >= 2 * 3600_000)

    span_days = (plays[-1]["local"].date() - plays[0]["local"].date()).days + 1
    night = sum(by_hour[h] for h in (22, 23, 0, 1, 2, 3, 4))
    morning = sum(by_hour[h] for h in range(5, 11))
    all_rows = counted + skipped or 1
    sessions_sorted = sorted(sessions)
    return {
        "night_share": night / total_ms,
        "morning_share": morning / total_ms,
        "workday_share": workday / total_ms,
        "weekend_share": weekend / total_ms,
        "days_share": len(days) / span_days,
        "top10_share": sum(v for _, v in artists.most_common(10)) / total_ms,
        "new_artist_rate": new_artist / (counted or 1),
        "repeat_share": repeats / (counted or 1),
        "long_session_share": long_ms / total_ms,
        "skip_rate": skipped / all_rows,
        "shuffle_share": shuffle_on / shuffle_known if shuffle_known else None,
        "in_order_share": 1 - shuffle_on / shuffle_known if shuffle_known else None,
        # extra context for the page
        "median_session_min": round(sessions_sorted[len(sessions_sorted) // 2] / 60_000, 1),
        "minutes_per_day": round(total_ms / 60_000 / span_days, 1),
        "peak_hour": max(by_hour, key=by_hour.get),
    }


def pick(stats, personas):
    scored = []
    for pid, title, adj, desc, stat, threshold in personas:
        v = stats.get(stat)
        if v is None:
            continue
        scored.append({"id": pid, "title": title, "adj": adj, "description": desc, "stat": stat,
                       "value": round(v, 4), "threshold": threshold, "fit": round(v / threshold, 3)})
    scored.sort(key=lambda x: -x["fit"])
    return scored


def profile(plays, first_artist_play):
    stats = stats_for(plays, first_artist_play)
    when, how = pick(stats, WHEN), pick(stats, HOW)
    w, h = when[0], how[0]
    return {
        "name": f"{w['adj']} {h['adj']}",
        "when": when, "how": how,
        "fits": w["fit"] >= 1 and h["fit"] >= 1,  # False = only a closest match
        "stats": {k: (round(v, 4) if isinstance(v, float) else v) for k, v in stats.items()},
        "from": plays[0]["local"].date().isoformat(), "to": plays[-1]["local"].date().isoformat(),
    }


def main():
    plays = load_plays(ROOT / "data" / "raw")
    first_artist_play = {}
    for p in plays:
        if p["ms"] >= PLAY_THRESHOLD_MS and p["artist"] not in first_artist_play:
            first_artist_play[p["artist"]] = p
    cutoff = plays[-1]["ts"] - timedelta(days=365)
    recent = [p for p in plays if p["ts"] >= cutoff]
    yearly = defaultdict(list)
    for p in plays:
        yearly[p["local"].year].append(p)

    out = {
        "now": profile(recent, first_artist_play),  # last 12 months
        "all_time": profile(plays, first_artist_play),
        "by_year": {str(y): profile(ps, first_artist_play)["name"] for y, ps in sorted(yearly.items()) if len(ps) > 500},
        "personas": {
            "when": [{"id": i, "title": t, "description": d, "stat": s, "threshold": th} for i, t, _, d, s, th in WHEN],
            "how": [{"id": i, "title": t, "description": d, "stat": s, "threshold": th} for i, t, _, d, s, th in HOW],
        },
        "stat_labels": STAT_LABELS,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Now: {out['now']['name']} · all time: {out['all_time']['name']}")
    for period in ("now", "all_time"):
        print(f"\n{period}:")
        for k, v in out[period]["stats"].items():
            print(f"  {k:<20} {v}")
    print("\nBy year:", ", ".join(f"{y} {n}" for y, n in out["by_year"].items()))


if __name__ == "__main__":
    main()
