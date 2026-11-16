# Community GPU Grant request — SpriteForge GPU

**Existing project:** https://alexerrove-dotcom.github.io/spriteforge/
**Open source:** https://github.com/alexerrove-dotcom/alexerrove-dotcom.github.io/tree/main/spriteforge/gpu-space
**Requested hardware:** Dedicated NVIDIA L4 24GB GPU or equivalent.

We are building a free, mobile-accessible character generation and sprite animation studio for hobbyist and educational 2D game development. Some creators have only a phone and cannot download multi-gigabyte local models or rent GPU servers.

The public app generates a full-body character from a text description, locks that character as a reference, then generates eight **independent** animation frames from the same image plus authored pose guides. It exports PNG, GIF, ZIP and atlas JSON for game engines. Visitors need no login or private API token.

The model is FLUX.2 Klein 4B (Apache-2.0) served via Diffusers. We plan to use lazy initialization, one queued GPU inference at a time, and no wasteful automatic loops. A dedicated GPU is requested because each animation needs eight full inference calls and the model benefits from loading once.

**Current status:** implementation and public source prepared, CPU-only tests for pose and export pass; dedicated GPU inference and character consistency are not yet validated. Grant is needed for testing and public deployment. The grant is neither already approved nor guaranteed.

We will operate as an open-source, noncommercial demonstration. Approval would remove visitors' dependency on third-party daily ZeroGPU time allowances, but a single GPU will still have finite capacity.

Thank you for considering a Community GPU Grant.