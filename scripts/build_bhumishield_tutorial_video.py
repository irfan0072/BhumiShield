#!/usr/bin/env python3
"""
BhumiShield (ভূমি সুরক্ষা) — Bangla Tutorial Video Production Pipeline
Synthesizes professional Bangla voiceover with macOS TTS,
composites 1080p framed slides with custom titles and captions,
and produces a high-definition MP4 tutorial video.
"""

import os
import sys
import subprocess
import json
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EVIDENCE_DIR = os.path.join(BASE_DIR, 'docs', 'challenger-evidence')
OUTPUT_DIR = os.path.join(BASE_DIR, 'output')
TEMP_DIR = os.path.join(OUTPUT_DIR, 'tmp_video_build')

FONT_BOLD = '/System/Library/Fonts/KohinoorBangla.ttc'
FONT_REGULAR = '/System/Library/Fonts/Supplemental/Bangla Sangam MN.ttc'
if not os.path.exists(FONT_REGULAR):
    FONT_REGULAR = FONT_BOLD

SCENES = [
    {
        "id": "scene_01_intro",
        "image": "01_landingpage.png",
        "tag": "🛡️ ভূমিকা · ল্যান্ডটেক ২০২৬",
        "narration": "ভূমি সুরক্ষা প্ল্যাটফর্মে আপনাকে স্বাগতম। বাংলাদেশে জমি কেনাবেচায় জাল দলিল, দ্বৈত বিক্রি এবং নামজারির দীর্ঘসূত্রিতা দূর করতে এটি একটি নির্ভরযোগ্য ডিজিটাল সমাধান।",
        "caption": "ভূমি সুরক্ষা: জমি কেনার আগে ঝুঁকি বুঝুন, হস্তান্তরের প্রতিটি ধাপ রাখুন অনুসরণযোগ্য।"
    },
    {
        "id": "scene_02_check",
        "image": "02_checkbeforebuypage.png",
        "tag": "🔍 ধাপ ১ · প্রি-পারচেজ রিস্ক ইঞ্জিন",
        "narration": "বায়না করার আগেই জেনে নিন জমির সব ঝুঁকি। চেক বিফোর বাই ফিচারে খতিয়ান ও দাগ নম্বর দিলেই সিস্টেম মালিকানার অবশিষ্ট হিস্যা, অনিষ্পন্ন বিক্রি এবং কোনো ব্যাংক ঋণ বা মামলা আছে কিনা তা সুস্পষ্টভাবে ব্যাখ্যা করে।",
        "caption": "ব্যাখ্যাযোগ্য রিস্ক স্কোর: অনিষ্পন্ন নামজারি ও অবশিষ্ট হিস্যার অমিল তাৎক্ষণিক শনাক্তকরণ।"
    },
    {
        "id": "scene_03_map",
        "image": "04_cadastralmappage.png",
        "tag": "🗺️ ধাপ ২ · ক্যাডাস্ট্রাল ম্যাপ ও জিও-পজিশনিং",
        "narration": "ইন্টারেক্টিভ ক্যাডাস্ট্রাল ম্যাপের মাধ্যমে দাগের সঠিক অবস্থান, সীমানা এবং পার্শ্ববর্তী প্লট সরাসরি ডিজিটাল নকশায় এবং জিপিএস কোঅর্ডিনেটে যাচাই করা যায়।",
        "caption": "ডিজিটাল নকশা: দাগের জ্যামিতিক সীমানা, আয়তন এবং স্যাটেলাইট লোকেশন।"
    },
    {
        "id": "scene_04_verify",
        "image": "03_verifydeedqrpage.png",
        "tag": "🔐 ধাপ ৩ · ক্রিপ্টোগ্রাফিক দলিল অখণ্ডতা",
        "narration": "কাগজের দলিল বিকৃত হলেও গণিতকে বদলানো যায় না। প্রতিটি দলিলে রয়েছে এসএইচএ ২৫৬ হ্যাশ ও এড২৫৫১৯ ডিজিটাল স্বাক্ষর। কিউআর কোড স্ক্যান করে যে কেউ মুহূর্তেই দলিলের শতভাগ নির্ভুলতা যাচাই করতে পারেন।",
        "caption": "ডিজিটাল নিরাপত্তা: SHA-256 হ্যাশ এবং Ed25519 স্বাক্ষরযুক্ত কিউআর ভেরিফিকেশন।"
    },
    {
        "id": "scene_05_roles",
        "image": "10_authpage_1clickpersonas.png",
        "tag": "👥 ধাপ ৪ · সমন্বিত ভূমিকা ও ওয়ার্কস্পেস",
        "narration": "ভূমি সুরক্ষায় নাগরিক, সাব-রেজিস্ট্রার, সহকারী কমিশনার ভূমি এবং ব্যাংক কর্মকর্তাদের জন্য রয়েছে ডেডিকেটেড একক ক্লিকের নিরাপদ পোর্টাল।",
        "caption": "রোল-বেসড পোর্টাল: নাগরিক, সাব-রেজিস্ট্রার, এসি ল্যান্ড, ব্যাংক এবং সুপার অ্যাডমিন।"
    },
    {
        "id": "scene_06_subregistrar",
        "image": "13_subregistrarpage.png",
        "tag": "⚖️ ধাপ ৫ · সাব-রেজিস্ট্রার নিবন্ধন প্যানেল",
        "narration": "সাব-রেজিস্ট্রার তার প্যানেল থেকে হস্তান্তরের খসড়া, কর পরিশোধ এবং উভয় পক্ষের সম্মতি নিরীক্ষা করে নির্ভরযোগ্যভাবে দলিল নিবন্ধন সম্পন্ন করেন।",
        "caption": "সাব-রেজিস্ট্রার পর্যালোচনা: কর ও ফি যাচাই, সম্মতি গ্রহণ এবং দলিল চূড়ান্তকরণ।"
    },
    {
        "id": "scene_07_acland",
        "image": "14_aclandpage.png",
        "tag": "🏛️ ধাপ ৬ · এসি ল্যান্ড নামজারি পাইপলাইন",
        "narration": "দলিল নিবন্ধিত হওয়ামাত্র তা স্বয়ংক্রিয়ভাবে এসি ল্যান্ডের নামজারি পাইপলাইনে চলে আসে। আলাদা আবেদনের ঝামেলা ছাড়াই ডিসিআর ও জরিপ যাচাই করে সরাসরি নামজারি অনুমোদন দেওয়া হয়।",
        "caption": "সমন্বিত পাইপলাইন: দলিল সম্পাদন থেকে এসি ল্যান্ড নামজারি ও খতিয়ান হালনাগাদ।"
    },
    {
        "id": "scene_08_bank",
        "image": "15_bankofficerpage.png",
        "tag": "🏦 ধাপ ৭ · ব্যাংক ঋণ ও ডিজিটাল ই-এনওসি",
        "narration": "ব্যাংক কর্মকর্তারা বন্ধকী জমি সিস্টেমে রেকর্ড করতে পারেন এবং ঋণ পরিশোধের পর সরাসরি ডিজিটাল ই-এনওসি ইস্যু করেন, যা ভুয়া মর্টগেজ চিরতরে রোধ করে।",
        "caption": "ব্যাংকিং ইন্টিগ্রেশন: বন্ধক পর্যবেক্ষণ ও কিউআর যাচাইযোগ্য ইলেকট্রনিক এনওসি।"
    },
    {
        "id": "scene_09_admin",
        "image": "17_admindashboardpage.png",
        "tag": "⚙️ ধাপ ৮ · সুপার অ্যাডমিন ও অডিট ট্রেইল",
        "narration": "সুপার অ্যাডমিন ড্যাশবোর্ডে রয়েছে সম্পূর্ণ অডিট ট্রেইল ও কেন্দ্রীয় নিয়ন্ত্রণ। সরকারি নীতিমালা শতভাগ অনুসরণ করতে রয়েছে ডেটা কালেকশন মাস্টার সুইচ।",
        "caption": "প্রশাসনিক স্বচ্ছতা: অপরিবর্তনীয় অডিট লগ ও সরকারি ডাটা পলিসি নিয়ন্ত্রণ।"
    },
    {
        "id": "scene_10_conclusion",
        "image": "11_citizenhome_and_modals.png",
        "tag": "🎯 সমাপনী · ল্যান্ডটেক উদ্ভাবন ২০২৬",
        "narration": "নাগরিক তার পার্সোনাল ল্যান্ড ভল্ট থেকে যেকোনো সময় অনুমোদিত খতিয়ান, পর্চা এবং কিউআর কোড ডাউনলোড করতে পারেন। ভূমি সুরক্ষা—প্রতিটি শতক থাকুক নিরাপদে।",
        "caption": "ভূমি সুরক্ষা: স্মার্ট, স্বচ্ছ ও দুর্নীতিমুক্ত ডিজিটাল ভূমি সেবা।"
    }
]

def make_slide(scene, output_png_path):
    src_img_path = os.path.join(EVIDENCE_DIR, scene['image'])
    target_w, target_h = 1920, 1080

    # 1. Canvas with rich gradient-like dark slate
    canvas = Image.new('RGB', (target_w, target_h), color='#0b0f19')
    draw = ImageDraw.Draw(canvas)

    # 2. Header Bar
    draw.rectangle([0, 0, target_w, 80], fill='#111827')
    draw.line([0, 80, target_w, 80], fill='#059669', width=3)

    # Brand Title (Left)
    font_brand = ImageFont.truetype(FONT_BOLD, 30)
    draw.text((40, 20), "🛡️ BhumiShield · ভূমি সুরক্ষা", font=font_brand, fill='#ffffff')

    # Scene Tag (Right)
    font_tag = ImageFont.truetype(FONT_BOLD, 26)
    tag_text = scene['tag']
    # Calculate text width
    bbox = draw.textbbox((0, 0), tag_text, font=font_tag)
    tag_w = bbox[2] - bbox[0]
    draw.rounded_rectangle([target_w - tag_w - 70, 15, target_w - 30, 65], radius=8, fill='#064e3b', outline='#10b981', width=1)
    draw.text((target_w - tag_w - 50, 22), tag_text, font=font_tag, fill='#a7f3d0')

    # 3. Main Screenshot Placement (Scaled with subtle shadow/border)
    if os.path.exists(src_img_path):
        screen = Image.open(src_img_path).convert('RGB')
        max_ui_w, max_ui_h = 1760, 840
        screen.thumbnail((max_ui_w, max_ui_h), Image.Resampling.LANCZOS)
        sw, sh = screen.size
        sx = (target_w - sw) // 2
        sy = 100 + (max_ui_h - sh) // 2

        # Draw frame border
        draw.rounded_rectangle([sx - 4, sy - 4, sx + sw + 4, sy + sh + 4], radius=10, fill='#1e293b', outline='#334155', width=2)
        canvas.paste(screen, (sx, sy))

    # 4. Footer Caption Bar
    draw.rectangle([0, target_h - 110, target_w, target_h], fill='#0f172a')
    draw.line([0, target_h - 110, target_w, target_h - 110], fill='#1e293b', width=2)

    font_caption = ImageFont.truetype(FONT_BOLD, 28)
    caption_text = scene['caption']
    c_bbox = draw.textbbox((0, 0), caption_text, font=font_caption)
    cw = c_bbox[2] - c_bbox[0]
    draw.text(((target_w - cw) // 2, target_h - 75), caption_text, font=font_caption, fill='#38bdf8')

    canvas.save(output_png_path, quality=95)
    print(f"Generated slide: {output_png_path}")

def build_scene_video(scene, index):
    scene_id = scene['id']
    slide_png = os.path.join(TEMP_DIR, f"{scene_id}_slide.png")
    audio_aiff = os.path.join(TEMP_DIR, f"{scene_id}.aiff")
    audio_wav = os.path.join(TEMP_DIR, f"{scene_id}.wav")
    clip_mp4 = os.path.join(TEMP_DIR, f"{index:02d}_{scene_id}.mp4")

    # A. Generate Slide Image
    make_slide(scene, slide_png)

    # B. Generate Voiceover Audio with macOS `say` (Bengali voice 'Piya')
    print(f"Synthesizing voiceover for {scene_id}...")
    subprocess.run(['say', '-v', 'Piya', '-o', audio_aiff, scene['narration']], check=True)

    # Convert to WAV with 0.6s trailing silence for natural breathing room
    subprocess.run([
        'ffmpeg', '-y', '-i', audio_aiff,
        '-af', 'apad=pad_dur=0.6',
        '-c:a', 'pcm_s16le', audio_wav
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

    # C. Encode Video Clip matching audio duration exactly
    print(f"Rendering video clip for {scene_id}...")
    subprocess.run([
        'ffmpeg', '-y',
        '-loop', '1', '-i', slide_png,
        '-i', audio_wav,
        '-c:v', 'libx264', '-tune', 'stillimage',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '192k',
        '-shortest',
        clip_mp4
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

    return clip_mp4

def main():
    os.makedirs(TEMP_DIR, exist_ok=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("==================================================")
    print("🎬 Starting BhumiShield Bangla Tutorial Video Build")
    print("==================================================")

    clip_paths = []
    for i, scene in enumerate(SCENES):
        print(f"\n[Scene {i+1}/{len(SCENES)}] Processing {scene['id']}...")
        clip = build_scene_video(scene, i+1)
        clip_paths.append(clip)

    # Create concat list for ffmpeg
    concat_list_path = os.path.join(TEMP_DIR, 'concat_list.txt')
    with open(concat_list_path, 'w', encoding='utf-8') as f:
        for p in clip_paths:
            f.write(f"file '{p}'\n")

    output_video_path = os.path.join(OUTPUT_DIR, 'bhumishield_bangla_tutorial.mp4')
    print(f"\nStitching all {len(clip_paths)} scenes into final master video...")
    subprocess.run([
        'ffmpeg', '-y',
        '-f', 'concat', '-safe', '0',
        '-i', concat_list_path,
        '-c', 'copy',
        output_video_path
    ], check=True)

    print("\n==================================================")
    print(f"🎉 MASTER TUTORIAL VIDEO READY: {output_video_path}")
    print("==================================================")

if __name__ == '__main__':
    main()
