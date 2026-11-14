# data/raw — private, never committed

Unzip your Spotify exports here, e.g.:

```
data/raw/Spotify Extended Streaming History/Streaming_History_Audio_2019-2021_0.json
data/raw/Spotify Account Data/YourLibrary.json
```

The pipeline searches this folder recursively for `Streaming_History_Audio_*.json`.
Everything in this folder except this README is ignored by git.
