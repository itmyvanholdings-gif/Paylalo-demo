# Paylalo Tutorials

Short how-to videos for every Paylalo feature, with a YouTube-style player built for learning:

- **Courses by role**: employees, managers, owners & admins
- **Chapters**: every step in a video is listed with a clickable timestamp
- **Progress**: watched and completed lessons are remembered in your browser
- **Up next**: autoplay into the next lesson, with a 5-second countdown
- **Search** across titles and steps

Open `index.html` in a browser, or serve the folder with GitHub Pages
(Settings → Pages → Deploy from branch → `main` / root).

## Videos

15 lessons, 1920×1080 MP4 with voiceover, about 14½ minutes in total. See `README.txt` for the list.

## Rebuilding

The videos are built with [HyperFrames](https://hyperframes.heygen.com) from `_source/features.json`:

```bash
cd _source
node build.mjs --render                 # all videos
node build.mjs --render --only=payslip  # one video
node site-data.mjs                      # refresh site/data.js and thumbs/
```

Needs Node 22+, FFmpeg, the `hyperframes` CLI, and the Piper voice in `_source/tts/`
(not committed; see the download commands in the project notes).
