# Promo video narration script (43 s)

Read at a calm pace. Each line must fit inside its time window.
The same text, with timings, is in `SER-Justice-Portal-Promo-Narration.srt`.

| Time | Scene | Narration |
|---|---|---|
| 0:00.8 – 0:04.3 | Title | Justice for everyone, close to home. |
| 0:05 – 0:10.3 | Public portal | A public portal for every citizen: services, laws and legal aid, in English and Amharic. |
| 0:11 – 0:16.3 | Complaints | Submit a complaint, track it with a private code, and see it through to resolution. |
| 0:17 – 0:21.3 | Region / zone / woreda | Region, zones and woredas: everyone sees exactly what they are responsible for. |
| 0:22 – 0:27.3 | Case management | Every case has an automatic deadline, and every delay has a reason on record. |
| 0:28 – 0:33.3 | Analytics | Leaders see which zone is behind, and why, with reports ready in one click. |
| 0:34 – 0:38.3 | Library & mobile | Laws, research and training, available on any device. |
| 0:39 – 0:42.8 | End card | Southern Ethiopia Regional Justice Portal. Justice, dignity and public service. |

## Add the voice

1. Record or generate one audio file (`voice.mp3` or `voice.wav`) that follows the table above.
2. Run (needs ffmpeg), using the version without captions if the voice is on:

```bash
ffmpeg -i SER-Justice-Portal-Promo-Video.mp4 -i voice.mp3 -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest SER-Justice-Portal-Promo-Video-Voice.mp4
```

To keep the captions as well, use `SER-Justice-Portal-Promo-Video-Captioned.mp4` as the first input.
