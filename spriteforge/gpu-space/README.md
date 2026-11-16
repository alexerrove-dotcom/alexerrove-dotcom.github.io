---
title: SpriteForge GPU
emoji: 🦊
colorFrom: yellow
colorTo: gray
sdk: gradio
app_file: app.py
license: apache-2.0
short_description: AI game characters and independently generated sprite animation frames
suggested_hardware: l4x1
---

# SpriteForge GPU

Mobile-first, open-source Gradio demo for [SpriteForge RU](https://alexerrove-dotcom.github.io/spriteforge/).

The user enters one description, receives one **full-body** character generated from text, selects an animation, and the backend makes **eight separate AI inference calls** conditioned on the original character and eight different pose sketches. It exports a 4x2 spritesheet PNG and ZIP containing frames, GIF and Godot-friendly JSON. It does not pretend that slicing or distorting one image is genuine animation.

**Model:** `black-forest-labs/FLUX.2-klein-4B`, Apache 2.0. Diffusers implementation. Requests are processed on the Space GPU, not on visitors' phones.

**Status:** GPU source and mobile UI have been prepared. A donated GPU is **not yet granted**. Without one, generation reports a clear hardware error. Full-body image quality and cross-frame identity consistency are *not yet GPU-tested*, and cannot be guaranteed.

**GPU:** Please consider a dedicated NVIDIA L4 24GB or better. The FLUX2 pipeline uses CPU offloading and serial inference. No charge/registration/token is required of site visitors, but one GPU still has finite throughput. Community GPU Grants depend on Hugging Face approval.

See `GPU_GRANT_REQUEST.md` and `PHONE_DEPLOY.md` for a prepared application and phone-only deployment steps.

**Data/privacy:** Public hosted service; users should not submit sensitive personal images. Render output is temporary; Gradio manages per-session identity state.