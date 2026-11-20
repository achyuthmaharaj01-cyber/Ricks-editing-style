#!/bin/bash
# loudness to -14 LUFS + limiter, encode, QA
set -e
cd "$(dirname "$0")"
I=$(ffmpeg -hide_banner -nostats -i work/mix.wav -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" | tail -1 | awk '{print $2}')
G=$(python3 -c "print(round(-14 - ($I), 2))")
echo "integrated $I LUFS -> gain $G dB"
ffmpeg -v error -y -i work/mix.wav -af "volume=${G}dB,alimiter=limit=0.891:level=false" -ar 48000 work/master.wav
ffmpeg -hide_banner -nostats -i work/master.wav -af ebur128 -f null - 2>&1 | grep -E "^\s+(I|LRA):" | tail -2
ffmpeg -v error -y -framerate 30 -i frames/f%04d.jpg -i work/master.wav -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart out/sleep_paralysis_short.mp4
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate,nb_frames -of compact out/sleep_paralysis_short.mp4
echo "--- freezedetect"; ffmpeg -hide_banner -nostats -i out/sleep_paralysis_short.mp4 -vf freezedetect=n=0.0005:d=0.4 -an -f null - 2>&1 | grep freeze || echo none
echo "--- blackdetect"; ffmpeg -hide_banner -nostats -i out/sleep_paralysis_short.mp4 -vf blackdetect=d=0.1 -an -f null - 2>&1 | grep black_start || echo none
ffmpeg -v error -y -i out/sleep_paralysis_short.mp4 -vf "fps=2,scale=135:240,tile=16x10" -frames:v 1 out/qa_sheet.jpg
echo done
