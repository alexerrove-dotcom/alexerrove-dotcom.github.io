---
title: SpriteForge RU GPU
emoji: 🎮
colorFrom: yellow
colorTo: purple
sdk: gradio
sdk_version: 5.49.1
app_file: app.py
pinned: false
short_description: Russian character sprite and animation generator
preload_from_hub:
  - frankjoshua/toonyou_beta6
  - guoyww/animatediff-motion-adapter-v1-5-2
  - Helsinki-NLP/opus-mt-ru-en
---

# SpriteForge RU · independent AI sprite server

Source: https://github.com/alexerrove-dotcom/alexerrove-dotcom.github.io/tree/main/spriteforge

This app uses AnimateDiff, ToonYou / Stable Diffusion and rembg for independent sprite generation.

Select ZeroGPU hardware in the Space settings (zero-a10g). Creating ZeroGPU Spaces is subject to Hugging Face eligibility and daily quotas.

The first inference downloads model weights. Generation quality and temporal consistency are experimental.
