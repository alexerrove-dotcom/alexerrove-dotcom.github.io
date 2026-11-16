# Deploy using only an Android phone

1. Sign into https://huggingface.co on your phone (owner account needed).
2. Go to https://huggingface.co/new-space and create a Space named `spriteforge-gpu`. If creating a Gradio/Docker CPU Space asks for a paid plan, create a **free static Space** first, use it as the public project for a GPU Grant request, and change its SDK after approval.
3. Add the files from this folder to the Space's Files tab: `README.md`, `app.py`, `core.py`, and `requirements.txt`. Hugging Face supports file uploads directly in the mobile browser; no computer/terminal is required. On a free Static Space use `README_STATIC.md` instead of `README.md` until GPU allocation.
4. Open the Space's **Settings → Hardware** section and use **Community GPU Grant**. Paste `GPU_GRANT_REQUEST.md` as the application. A GPU allocation is a decision by Hugging Face, not an automatic site setting.
5. After approval, replace the static README with the Gradio README and ensure GPU hardware is selected. Only then will AI generation work. Share the resulting Space URL so the existing SpriteForge site can point to the approved GPU backend.

**Do not paste Hugging Face passwords, tokens, or payment details into ChatGPT.** No visitors to SpriteForge will need their own login.

Original website: https://alexerrove-dotcom.github.io/spriteforge/
