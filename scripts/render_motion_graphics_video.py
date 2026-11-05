#!/usr/bin/env python3
"""
BhumiShield (ভূমি সুরক্ষা) — Motion Graphics Video Production Pipeline
- Synthesizes human-friendly conversational voiceover with studio audio mastering
- Generates a custom lush ambient synthesizer soundtrack
- Composites 1080p motion-graphics frames with glassmorphism, glowing badges, and UI cards
- Applies smooth cinematic camera motion (zoompan) at 30fps
- Mixes voiceover with ducked background music into a broadcast-quality MP4
"""

import os
import sys
import subprocess
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EVIDENCE_DIR = os.path.join(BASE_DIR, 'docs', 'challenger-evidence')
ASSETS_DIR = os.path.join(BASE_DIR, 'frontend', 'public', 'assets')
OUTPUT_DIR = os.path.join(BASE_DIR, 'output')
BUILD_DIR = os.path.join(OUTPUT_DIR, 'motion_build')

FONT_BOLD = '/System/Library/Fonts/KohinoorBangla.ttc'
FONT_REGULAR = '/System/Library/Fonts/Supplemental/Bangla Sangam MN.ttc'
if not os.path.exists(FONT_REGULAR):
    FONT_REGULAR = FONT_BOLD

# 6 Storyboard Scenes with Conversational Narration
SCENES = [
    {
        "id": "scene_01_crisis",
        "image": "01_landingpage.png",
        "badge": "🛡️ CRISIS & SOLUTION · LANDTECH 2026",
        "title": "BhumiShield · The Trust Layer for Bangladesh Land Records",
        "narration": "Buying land in Bangladesh should be a proud lifetime milestone, not a lifetime legal battle. Every year, millions of citizens fall victim to double-selling and forged deeds because registration and mutation have operated in silos for generations. Welcome to BhumiShield: an intelligent, explainable land fraud detection platform engineered for Bangladesh LandTech 2026.",
        "lower_third": "Explainable Fraud Checks Across Registration & Mutation",
        "zoom_dir": "in"
    },
    {
        "id": "scene_02_radar",
        "image": "02_checkbeforebuypage.png",
        "badge": "🔍 STEP 1 · PRE-PURCHASE RISK RADAR",
        "title": "Check Before You Buy · Instant Explainable Due Diligence",
        "narration": "Before paying a single taka in token money, a buyer opens 'Check Before You Buy'. In seconds, our deterministic risk engine cross-references registered land shares, unrecorded pending sales, and active bank mortgages. It immediately alerts you that the seller's recorded share is only six decimals—saving you from an irreversible fraud.",
        "lower_third": "Instant Detection of Depleted Shares, Pending Sales & Liens",
        "zoom_dir": "in"
    },
    {
        "id": "scene_03_crypto",
        "image": "03_verifydeedqrpage.png",
        "badge": "🔐 STEP 2 · CRYPTOGRAPHIC INTEGRITY",
        "title": "Ed25519 Signatures & SHA-256 Tamper-Evident QR Deeds",
        "narration": "Paper stamps can be forged, but mathematics cannot. Every deed and No-Objection Certificate in BhumiShield is sealed with an Ed25519 digital signature and an immutable SHA-256 fingerprint. Anyone can scan the QR code—if even a single word has been altered, the system immediately warns of tampering.",
        "lower_third": "Zero Trust Cryptography: SHA-256 Hashes & Public QR Verification",
        "zoom_dir": "in"
    },
    {
        "id": "scene_04_pipeline",
        "image": "13_subregistrarpage.png",
        "badge": "⚡ STEP 3 · CONNECTED WORKFLOW",
        "title": "Sub-Registry to AC Land · Seamless Auto-Mutation",
        "narration": "Our core breakthrough is connecting the workflow. Historically, after deed registration, citizens spent months running between offices for mutation. In BhumiShield, the moment the Sub-Registrar approves the digital deed, it automatically flows into the AC Land mutation queue. Zero paperwork lost. Zero delay.",
        "lower_third": "Automatic Mutation Handoff & Digital Porcha Generation",
        "zoom_dir": "in"
    },
    {
        "id": "scene_05_bank",
        "image": "15_bankofficerpage.png",
        "badge": "🏦 STEP 4 · INSTITUTIONAL TRUST",
        "title": "Bank Collateral Registry & Verified e-NOC Issuance",
        "narration": "Banks can record collateral in real time and issue verified digital e-NOCs, eliminating ghost mortgages. Simultaneously, our Super Admin console maintains an immutable audit trail and fine-grained data governance compliant with national standards.",
        "lower_third": "Electronic Discharge Certificates & Immutable Audit Logging",
        "zoom_dir": "in"
    },
    {
        "id": "scene_06_impact",
        "image": "11_citizenhome_and_modals.png",
        "badge": "🎯 IMPACT · DIGITAL BANGLADESH 2026",
        "title": "BhumiShield · Protecting Every Decimal, Verifying Every Step",
        "narration": "From pre-purchase risk analysis to cryptographic deeds, and from registration to mutation—BhumiShield transforms land administration into a secure, transparent, and explainable reality. BhumiShield: Protecting every decimal, verifying every step. Thank you.",
        "lower_third": "100% Traceable · Zero Double-Selling · Instant Verification",
        "zoom_dir": "in"
    }
]

def synthesize_ambient_soundtrack(total_duration, output_wav):
    """Generates a warm, inspiring ambient tech chord progression using numpy/scipy."""
    print(f"🎵 Synthesizing {total_duration:.1f}s ambient tech soundtrack...")
    sr = 44100
    t = np.linspace(0, total_duration, int(sr * total_duration), endpoint=False)
    
    # Chord cycle: Cmaj7 -> Am9 -> Fmaj7 -> G6/9
    chords = [
        [130.81, 164.81, 196.00, 246.94], # C3, E3, G3, B3
        [110.00, 130.81, 164.81, 196.00, 220.00], # A2, C3, E3, G3, B3
        [87.31, 130.81, 164.81, 174.61, 220.00],  # F2, C3, E3, F3, A3
        [98.00, 146.83, 196.00, 220.00, 246.94]   # G2, D3, G3, A3, B3
    ]
    
    sec_per_chord = 6.0
    num_cycles = int(np.ceil(total_duration / (sec_per_chord * len(chords)))) + 1
    extended_chords = chords * num_cycles
    
    sig = np.zeros_like(t)
    for i in range(int(total_duration / sec_per_chord) + 1):
        t_start = i * sec_per_chord
        t_end = min((i + 1) * sec_per_chord, total_duration)
        if t_start >= total_duration:
            break
        mask = (t >= t_start) & (t < t_end)
        t_sub = t[mask] - t_start
        chord = extended_chords[i % len(extended_chords)]
        
        # Smooth attack & release envelope
        env = np.sin(np.pi * (t_sub / (t_end - t_start))) ** 0.6
        for f in chord:
            # Multi-oscillator detuning for rich warm synth pad
            w1 = np.sin(2 * np.pi * f * t_sub)
            w2 = np.sin(2 * np.pi * (f * 1.002) * t_sub)
            w3 = np.sin(2 * np.pi * (f * 0.998) * t_sub)
            sig[mask] += env * (w1 * 0.4 + w2 * 0.3 + w3 * 0.3)
            
    # Warm lowpass filter at 900 Hz
    b, a = butter(4, 900 / (sr / 2), btype='low')
    sig = lfilter(b, a, sig)
    
    # Soft mastering level (-18dB relative to max)
    sig = sig / (np.max(np.abs(sig)) + 1e-6) * 0.16
    wavfile.write(output_wav, sr, (sig * 32767).astype(np.int16))
    print(f"Ambient soundtrack generated: {output_wav}")

def make_motion_slide(scene, index, output_png):
    """Draws a stunning 1080p motion graphics frame with modern glassmorphism."""
    w, h = 1920, 1080
    canvas = Image.new('RGB', (w, h), color='#030712')
    draw = ImageDraw.Draw(canvas)

    # 1. Subtle Radial Ambient Lighting
    for r in range(400, 0, -50):
        alpha = int(12 * (1 - r / 400))
        # Center glow
        draw.ellipse([w//2 - r*2, h//2 - r, w//2 + r*2, h//2 + r], fill=(15, 23, 42))

    # 2. Header Bar
    draw.rectangle([0, 0, w, 85], fill='#0b0f19')
    draw.line([0, 85, w, 85], fill='#10b981', width=3)

    font_brand = ImageFont.truetype(FONT_BOLD, 28)
    draw.text((45, 24), "🛡️ BhumiShield · ভূমি সুরক্ষা", font=font_brand, fill='#ffffff')

    # Scene Tag Badge (Right)
    font_badge = ImageFont.truetype(FONT_BOLD, 22)
    b_text = scene['badge']
    bbox = draw.textbbox((0, 0), b_text, font=font_badge)
    bw = bbox[2] - bbox[0]
    draw.rounded_rectangle([w - bw - 70, 18, w - 35, 68], radius=8, fill='#064e3b', outline='#10b981', width=1)
    draw.text((w - bw - 52, 26), b_text, font=font_badge, fill='#a7f3d0')

    # 3. Main Center Showcase (Screenshot with 3D Border & Glow)
    src_img = os.path.join(EVIDENCE_DIR, scene['image'])
    if os.path.exists(src_img):
        ui = Image.open(src_img).convert('RGB')
        max_uw, max_uh = 1720, 810
        ui.thumbnail((max_uw, max_uh), Image.Resampling.LANCZOS)
        uw, uh = ui.size
        ux = (w - uw) // 2
        uy = 105 + (max_uh - uh) // 2

        # Outer Shadow & Border Frame
        draw.rounded_rectangle([ux - 6, uy - 6, ux + uw + 6, uy + uh + 6], radius=14, fill='#1e293b', outline='#10b981', width=2)
        canvas.paste(ui, (ux, uy))

    # 4. Lower-Third Kinetic Banner
    draw.rectangle([0, h - 120, w, h], fill='#030712')
    draw.line([0, h - 120, w, h - 120], fill='#1e293b', width=2)

    # Accent Emerald Bar
    draw.rectangle([45, h - 100, 52, h - 35], fill='#10b981')

    # Title & Subtitle in Lower-Third
    font_t = ImageFont.truetype(FONT_BOLD, 28)
    font_sub = ImageFont.truetype(FONT_BOLD, 20)

    draw.text((70, h - 105), scene['title'], font=font_t, fill='#f8fafc')
    draw.text((70, h - 65), scene['lower_third'], font=font_sub, fill='#38bdf8')

    # Counter on bottom right
    font_count = ImageFont.truetype(FONT_BOLD, 22)
    step_str = f"SCENE {index+1} / {len(SCENES)}"
    draw.text((w - 220, h - 85), step_str, font=font_count, fill='#94a3b8')

    canvas.save(output_png, quality=95)
    print(f"Generated frame: {output_png}")

def build_motion_scene_clip(scene, index):
    scene_id = scene['id']
    slide_png = os.path.join(BUILD_DIR, f"{scene_id}_frame.png")
    raw_audio = os.path.join(BUILD_DIR, f"{scene_id}_raw.aiff")
    mastered_audio = os.path.join(BUILD_DIR, f"{scene_id}_master.wav")
    clip_mp4 = os.path.join(BUILD_DIR, f"{index:02d}_{scene_id}.mp4")

    # A. Render Motion Graphics Frame
    make_motion_slide(scene, index, slide_png)

    # B. Synthesize Human-Friendly Voiceover (Samantha with conversational pacing)
    print(f"🎙️ Synthesizing voiceover for {scene_id}...")
    subprocess.run(['say', '-v', 'Samantha', '-r', '168', '-o', raw_audio, scene['narration']], check=True)

    # Audio Mastering: Highpass, Studio EQ, Warm Low-End, and Dynamic Range Compression
    subprocess.run([
        'ffmpeg', '-y', '-i', raw_audio,
        '-af', 'highpass=f=80,lowpass=f=12000,equalizer=f=220:t=q:w=1:g=3.5,equalizer=f=3200:t=q:w=1:g=2,compand=attacks=0.02:decays=0.15:points=-80/-80|-25/-12|-10/-2|0/0,apad=pad_dur=0.7',
        '-c:a', 'pcm_s16le', mastered_audio
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

    # Get audio duration
    probe = subprocess.run([
        'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1', mastered_audio
    ], capture_output=True, text=True, check=True)
    duration = float(probe.stdout.strip())
    fps = 30
    total_frames = int(duration * fps)

    # C. Render Smooth Camera Push-in (Zoompan) Motion Graphics Video
    print(f"🎬 Rendering smooth 30fps camera motion clip ({duration:.1f}s)...")
    zoom_expr = "min(zoom+0.0006,1.06)"
    
    subprocess.run([
        'ffmpeg', '-y',
        '-loop', '1', '-i', slide_png,
        '-i', mastered_audio,
        '-filter_complex',
        f"[0:v]scale=2112:1188,zoompan=z='{zoom_expr}':d={total_frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=30[v]",
        '-map', '[v]', '-map', '1:a',
        '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '192k',
        '-shortest',
        clip_mp4
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

    return clip_mp4, duration

def main():
    os.makedirs(BUILD_DIR, exist_ok=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("==========================================================")
    print("🚀 BHUMISHIELD MOTION GRAPHICS VIDEO GENERATION PIPELINE")
    print("==========================================================")

    clip_paths = []
    total_video_duration = 0.0

    for i, scene in enumerate(SCENES):
        print(f"\n[Scene {i+1}/{len(SCENES)}] Processing {scene['id']}...")
        clip, dur = build_motion_scene_clip(scene, i)
        clip_paths.append(clip)
        total_video_duration += dur

    # Synthesize Ambient Soundtrack matching total duration
    bg_music_wav = os.path.join(BUILD_DIR, 'ambient_soundtrack.wav')
    synthesize_ambient_soundtrack(total_video_duration + 2.0, bg_music_wav)

    # Concat all video clips
    concat_list = os.path.join(BUILD_DIR, 'concat_list.txt')
    with open(concat_list, 'w', encoding='utf-8') as f:
        for p in clip_paths:
            f.write(f"file '{p}'\n")

    unmixed_video = os.path.join(BUILD_DIR, 'unmixed_video.mp4')
    print("\nConcatenating scene clips...")
    subprocess.run([
        'ffmpeg', '-y',
        '-f', 'concat', '-safe', '0',
        '-i', concat_list,
        '-c', 'copy',
        unmixed_video
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

    # Master Mixing: Duck ambient soundtrack under voiceover (-16dB)
    final_output = os.path.join(OUTPUT_DIR, 'bhumishield_motion_graphics_demo.mp4')
    print("\n🎛️ Master Audio Mixing (Voiceover + Ambient Music Ducking)...")
    subprocess.run([
        'ffmpeg', '-y',
        '-i', unmixed_video,
        '-i', bg_music_wav,
        '-filter_complex',
        '[1:a]volume=0.18,afade=t=out:st=' + str(total_video_duration - 2.0) + ':d=2.0[bg];' +
        '[0:a][bg]amix=inputs=2:duration=first:dropout_transition=2[aout]',
        '-map', '0:v', '-map', '[aout]',
        '-c:v', 'copy',
        '-c:a', 'aac', '-b:a', '256k',
        final_output
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

    print("\n==========================================================")
    print(f"🎉 MASTER MOTION GRAPHICS VIDEO READY!")
    print(f"📁 Path: {final_output}")
    print(f"⏱️ Duration: {total_video_duration:.1f} seconds")
    print("==========================================================")

if __name__ == '__main__':
    main()
