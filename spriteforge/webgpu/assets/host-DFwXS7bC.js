async function Z() {
  const a = typeof navigator < "u" && "gpu" in navigator && !!navigator.gpu;
  let e = !1;
  if (a)
    try {
      e = !!(await navigator.gpu.requestAdapter?.())?.features?.has?.("shader-f16");
    } catch {
      e = !1;
    }
  return { webgpu: a, shaderF16: e, wasm: !0 };
}
function ee() {
  return ["webgpu", "wasm"];
}
const $ = "web-txt2img-v1", C = /* @__PURE__ */ new Map();
function I(a, e) {
  C.has(a) || C.set(a, /* @__PURE__ */ new Set()), C.get(a).add(e);
}
async function te(a, e, t, r) {
  const s = new Request(a);
  if (typeof caches < "u") {
    const i = await caches.open($), n = await i.match(s);
    if (n) {
      const u = await n.arrayBuffer();
      return t?.(u.byteLength, u.byteLength), e && I(e, s.url), u;
    }
    const o = await fetch(s);
    if (!o.ok || !o.body) {
      const u = Number(o.headers.get("content-length") ?? r ?? 0) || void 0;
      let c, w = 0;
      if (u) {
        const P = performance.now(), M = Math.max(5e3, Math.min(2e4, u / (256 * 1024) * 1e3));
        c = setInterval(() => {
          const A = performance.now() - P, T = Math.min(u * 0.95, A / M * u);
          T > w && (w = T, t?.(w, u));
        }, 200);
      }
      const g = await o.arrayBuffer();
      return c && clearInterval(c), t?.(u ?? g.byteLength, u ?? g.byteLength), g;
    }
    const l = Number(o.headers.get("content-length") ?? "0") || void 0, f = o.body.getReader(), m = [];
    let h = 0;
    for (; ; ) {
      const { done: u, value: c } = await f.read();
      if (u)
        break;
      c && (m.push(c), h += c.byteLength, t?.(h, l));
    }
    const y = new Uint8Array(h);
    let p = 0;
    for (const u of m)
      y.set(u, p), p += u.byteLength;
    const b = new Response(y, { headers: o.headers });
    try {
      await i.put(s, b);
    } catch {
    }
    return e && I(e, s.url), y.buffer;
  } else {
    const i = await fetch(s), n = Number(i.headers.get("content-length") ?? r ?? 0) || void 0;
    let o;
    if (n) {
      const f = performance.now(), m = Math.max(5e3, Math.min(2e4, n / (256 * 1024) * 1e3));
      o = setInterval(() => {
        const h = performance.now() - f, y = Math.min(n * 0.95, h / m * n);
        t?.(y, n);
      }, 200);
    }
    const l = await i.arrayBuffer();
    return o && clearInterval(o), t?.(n ?? l.byteLength, n ?? l.byteLength), l;
  }
}
async function j(a) {
  if (typeof caches > "u")
    return;
  const e = await caches.open($), t = Array.from(C.get(a) ?? []);
  await Promise.all(t.map((r) => e.delete(r))), C.delete(a);
}
async function ae() {
  typeof caches > "u" || (await caches.delete($), C.clear());
}
class ne {
  constructor() {
    this.id = "sd-turbo", this.loaded = !1, this.backendUsed = null, this.ort = null, this.sessions = {}, this.tokenizerFn = null, this.tokenizerProvider = null, this.modelBase = "https://huggingface.co/schmuell/sd-turbo-ort-web/resolve/main";
  }
  checkSupport(e) {
    const t = [];
    return e.webgpu && t.push("webgpu"), t.push("wasm"), t;
  }
  async load(e) {
    const t = e.backendPreference, r = ["webgpu", "wasm"];
    let s = t.find((i) => r.includes(i));
    if (!s)
      return { ok: !1, reason: "backend_unavailable", message: "No viable backend for SD-Turbo" };
    e.modelBaseUrl && (this.modelBase = e.modelBaseUrl), e.tokenizerProvider && (this.tokenizerProvider = e.tokenizerProvider);
    try {
      let i = e.ort ?? null;
      if (!i) {
        let n = null;
        s === "webgpu" ? n = await import("./ort.webgpu.bundle.min-BbqNP78H.js").catch(() => null) : n = await import("./ort.bundle.min-rcjPiyO0.js").catch(() => null), i = n && (n.default ?? n);
      }
      if (!i) {
        const n = globalThis.ort;
        n && (i = n);
      }
      if (!i)
        return { ok: !1, reason: "internal_error", message: "onnxruntime-web not available. Install as a dependency or inject via loadModel({ ort })." };
      this.ort = i;
    } catch (i) {
      return { ok: !1, reason: "internal_error", message: `Failed to load onnxruntime-web: ${i instanceof Error ? i.message : String(i)}` };
    }
    try {
      e.onProgress?.({ phase: "loading", message: "Preparing SD-Turbo model..." }), this.backendUsed = s;
      const i = this.ort, n = {
        executionProviders: [s],
        enableMemPattern: !1,
        enableCpuMemArena: !1,
        extra: {
          session: {
            disable_prepacking: "1",
            use_device_allocator_for_initializers: "1",
            use_ort_model_bytes_directly: "1",
            use_ort_model_bytes_for_initializers: "1"
          }
        }
      };
      s === "webgpu" && (n.preferredOutputLocation = { last_hidden_state: "gpu-buffer" });
      try {
        e.wasmPaths && (i.env.wasm.wasmPaths = e.wasmPaths), typeof e.wasmNumThreads == "number" && (i.env.wasm.numThreads = e.wasmNumThreads), typeof e.wasmSimd == "boolean" && (i.env.wasm.simd = e.wasmSimd);
      } catch {
      }
      const o = {
        unet: {
          url: "unet/model.onnx",
          sizeMB: 640,
          opt: { freeDimensionOverrides: { batch_size: 1, num_channels: 4, height: 64, width: 64, sequence_length: 77 } }
        },
        text_encoder: {
          url: "text_encoder/model.onnx",
          sizeMB: 1700,
          opt: { freeDimensionOverrides: { batch_size: 1 } }
        },
        vae_decoder: {
          url: "vae_decoder/model.onnx",
          sizeMB: 95,
          opt: { freeDimensionOverrides: { batch_size: 1, num_channels_latent: 4, height_latent: 64, width_latent: 64 } }
        }
      }, l = this.modelBase;
      let f = 0;
      const m = Object.values(o).reduce((y, p) => y + p.sizeMB * 1024 * 1024, 0), h = typeof e.approxTotalBytes == "number" ? e.approxTotalBytes : m;
      e.onProgress?.({
        phase: "loading",
        message: `starting downloads (~${Math.round(h / 1024 / 1024)}MB total)...`,
        bytesDownloaded: 0,
        totalBytesExpected: h,
        pct: 0,
        accuracy: "exact"
      });
      for (const y of Object.keys(o)) {
        const p = o[y];
        e.onProgress?.({ phase: "loading", message: `downloading ${p.url}...`, bytesDownloaded: f });
        const b = p.sizeMB * 1024 * 1024, u = await te(`${l}/${p.url}`, this.id, (P, M) => {
          const A = Math.min(100, Math.round((f + P) / h * 100));
          e.onProgress?.({
            phase: "loading",
            message: `downloading ${p.url}...`,
            pct: A,
            bytesDownloaded: f + P,
            totalBytesExpected: h,
            asset: p.url,
            accuracy: "exact"
          });
        }, b);
        f += u.byteLength;
        const c = performance.now(), w = await i.InferenceSession.create(u, { ...n, ...p.opt }), g = performance.now() - c;
        e.onProgress?.({
          phase: "loading",
          message: `${p.url} ready in ${g.toFixed(1)}ms`,
          bytesDownloaded: f,
          totalBytesExpected: h,
          asset: p.url,
          accuracy: "exact"
        }), this.sessions[y] = w;
      }
      return this.loaded = !0, { ok: !0, backendUsed: s, bytesDownloaded: f };
    } catch (i) {
      return console.error("[sd-turbo] load error", i), { ok: !1, reason: "internal_error", message: i instanceof Error ? i.message : String(i) };
    }
  }
  isLoaded() {
    return this.loaded;
  }
  async generate(e) {
    if (!this.loaded)
      return { ok: !1, reason: "model_not_loaded", message: "Call loadModel() first" };
    const { prompt: t, width: r = 512, height: s = 512, signal: i, onProgress: n, seed: o } = e;
    if (!t || !t.trim())
      return { ok: !1, reason: "unsupported_option", message: "Prompt is required" };
    if (r !== 512 || s !== 512)
      return { ok: !1, reason: "unsupported_option", message: "Only 512x512 is supported in v1" };
    const l = performance.now(), f = this.ort;
    try {
      if (n?.({ phase: "tokenizing", pct: 10 }), this.tokenizerFn || (this.tokenizerProvider ? this.tokenizerFn = await this.tokenizerProvider() : this.tokenizerFn = await de()), i?.aborted)
        return n?.({ phase: "complete", aborted: !0, pct: 0 }), { ok: !1, reason: "cancelled" };
      const m = this.tokenizerFn, { input_ids: h } = await m(t, { padding: !0, max_length: 77, truncation: !0, return_tensor: !1 });
      n?.({ phase: "encoding", pct: 25 });
      const y = Int32Array.from(h);
      let p;
      try {
        p = await this.sessions.text_encoder.run({ input_ids: new f.Tensor("int32", y, [1, y.length]) });
      } catch (B) {
        throw new Error(`text_encoder.run failed: ${B instanceof Error ? B.message : String(B)}`);
      }
      const b = p.last_hidden_state ?? p;
      if (i?.aborted)
        return n?.({ phase: "complete", aborted: !0, pct: 0 }), { ok: !1, reason: "cancelled" };
      const u = [1, 4, 64, 64], c = 14.6146, w = 0.18215, g = new f.Tensor(se(u, c, o), u), P = oe(f, g, c);
      if (n?.({ phase: "denoising", pct: 70 }), i?.aborted)
        return n?.({ phase: "complete", aborted: !0, pct: 0 }), { ok: !1, reason: "cancelled" };
      const M = [BigInt(999)], A = {
        sample: P,
        timestep: new f.Tensor("int64", M, [1]),
        encoder_hidden_states: b
      };
      let T;
      try {
        T = await this.sessions.unet.run(A), T = T.out_sample ?? T;
      } catch (B) {
        throw new Error(`unet.run failed: ${B instanceof Error ? B.message : String(B)}`);
      }
      if (typeof b.dispose == "function" && b.dispose(), i?.aborted)
        return n?.({ phase: "complete", aborted: !0, pct: 0 }), { ok: !1, reason: "cancelled" };
      const Y = ie(f, T, g, c, w);
      if (n?.({ phase: "decoding", pct: 95 }), i?.aborted)
        return n?.({ phase: "complete", aborted: !0, pct: 0 }), { ok: !1, reason: "cancelled" };
      let U;
      try {
        U = await this.sessions.vae_decoder.run({ latent_sample: Y });
      } catch (B) {
        throw new Error(`vae_decoder.run failed: ${B instanceof Error ? B.message : String(B)}`);
      }
      const K = U.sample ?? U;
      if (i?.aborted)
        return n?.({ phase: "complete", aborted: !0, pct: 0 }), { ok: !1, reason: "cancelled" };
      const V = await le(K), F = performance.now() - l;
      return n?.({ phase: "complete", pct: 100, timeMs: F }), { ok: !0, blob: V, timeMs: F };
    } catch (m) {
      return console.error("[sd-turbo] generate error", m), { ok: !1, reason: "internal_error", message: m instanceof Error ? m.message : String(m) };
    }
  }
  async unload() {
    try {
      try {
        this.sessions.unet?.release?.();
      } catch {
      }
      try {
        this.sessions.text_encoder?.release?.();
      } catch {
      }
      try {
        this.sessions.vae_decoder?.release?.();
      } catch {
      }
    } finally {
      this.sessions = {}, this.ort = null, this.loaded = !1, this.backendUsed = null;
    }
  }
  async purgeCache() {
    await j(this.id);
  }
}
function re(a) {
  let e = a >>> 0;
  return function() {
    e += 1831565813;
    let t = Math.imul(e ^ e >>> 15, 1 | e);
    return t ^= t + Math.imul(t ^ t >>> 7, 61 | t), ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function se(a, e, t) {
  const r = t !== void 0 ? re(t) : Math.random;
  function s() {
    const o = r(), l = r();
    return Math.sqrt(-2 * Math.log(o)) * Math.cos(2 * Math.PI * l);
  }
  let i = 1;
  for (const o of a)
    i *= o;
  const n = new Float32Array(i);
  for (let o = 0; o < i; o++)
    n[o] = s() * e;
  return n;
}
function oe(a, e, t) {
  const r = e.data, s = new Float32Array(r.length), i = Math.sqrt(t * t + 1);
  for (let n = 0; n < r.length; n++)
    s[n] = r[n] / i;
  return new a.Tensor(s, e.dims);
}
function ie(a, e, t, r, s) {
  const i = new Float32Array(e.data.length), n = new a.Tensor(i, e.dims), o = r * 1;
  for (let l = 0; l < e.data.length; l++) {
    const f = t.data[l] - o * e.data[l], m = (t.data[l] - f) / o, h = 0 - o;
    i[l] = (t.data[l] + m * h) / s;
  }
  return n;
}
async function le(a) {
  const [e, t, r, s] = a.dims, i = a.data, n = new Uint8ClampedArray(s * r * 4);
  let o = 0;
  for (let p = 0; p < r; p++)
    for (let b = 0; b < s; b++) {
      const u = i[0 * r * s + p * s + b], c = i[1 * r * s + p * s + b], w = i[2 * r * s + p * s + b], g = (P) => {
        let M = P / 2 + 0.5;
        return M < 0 && (M = 0), M > 1 && (M = 1), Math.round(M * 255);
      };
      n[o++] = g(u), n[o++] = g(c), n[o++] = g(w), n[o++] = 255;
    }
  const l = new ImageData(n, s, r), m = typeof OffscreenCanvas < "u" ? new OffscreenCanvas(s, r) : document.createElement("canvas");
  m.width = s, m.height = r;
  const h = m.getContext("2d");
  if (!h)
    throw new Error("Canvas 2D context unavailable");
  return h.putImageData(l, 0, 0), typeof globalThis.HTMLCanvasElement < "u" && m instanceof globalThis.HTMLCanvasElement ? await new Promise((p) => m.toBlob((b) => p(b), "image/png")) : await m.convertToBlob({ type: "image/png" });
}
let S = null;
async function de() {
  if (S)
    return (r, s) => S(r, s);
  const a = globalThis;
  if (a.AutoTokenizer && typeof a.AutoTokenizer.from_pretrained == "function")
    return a.env && (a.env.allowLocalModels = !1, a.env.allowRemoteModels = !0, a.env.remoteHost = "https://huggingface.co/", a.env.remotePathTemplate = "{model}/resolve/{revision}/"), S = await a.AutoTokenizer.from_pretrained("Xenova/clip-vit-base-patch16"), S.pad_token_id = 0, (r, s) => S(r, s);
  let e = null, t = null;
  try {
    const r = await import("./transformers-D5LrCbZU.js");
    e = r.AutoTokenizer, t = r.env;
  } catch {
    try {
      const s = await import("@huggingface/transformers");
      e = s.AutoTokenizer, t = s.env;
    } catch {
      throw new Error("Failed to load a tokenizer. Install @xenova/transformers or provide tokenizerProvider in loadModel options.");
    }
  }
  return t && (t.allowLocalModels = !1, t.allowRemoteModels = !0, t.remoteHost = "https://huggingface.co/", t.remotePathTemplate = "{model}/resolve/{revision}/"), S = await e.from_pretrained("Xenova/clip-vit-base-patch16", {
    local_files_only: !1,
    revision: "main"
  }), S.pad_token_id = 0, (r, s) => S(r, s);
}
class ce {
  constructor() {
    this.id = "janus-pro-1b", this.loaded = !1, this.backendUsed = null, this.hf = null, this.processor = null, this.model = null;
  }
  checkSupport(e) {
    return e.webgpu ? ["webgpu"] : [];
  }
  async load(e) {
    if (!e.backendPreference.includes("webgpu"))
      return { ok: !1, reason: "backend_unavailable", message: "Janus requires WebGPU" };
    let r = null;
    try {
      r = await import("./transformers.web-x-i_vOkX.js").catch(() => null);
    } catch {
    }
    if (!r)
      try {
        const o = import.meta, l = o && typeof o.resolve == "function" ? o.resolve("@huggingface/transformers") : null;
        l && (r = await import(
          /* @vite-ignore */
          l
        ).catch(() => null));
      } catch {
      }
    if (!r) {
      const o = globalThis;
      r = o.transformers || o.HFTransformers || o.HuggingFaceTransformers || null;
    }
    if (!r)
      return { ok: !1, reason: "internal_error", message: 'Missing @huggingface/transformers. Install it (npm i @huggingface/transformers) or include it via a <script> to expose global "transformers".' };
    let s = !1;
    try {
      s = !!(await navigator.gpu?.requestAdapter?.())?.features?.has?.("shader-f16");
    } catch {
    }
    const i = "onnx-community/Janus-Pro-1B-ONNX", n = typeof e.approxTotalBytes == "number" ? e.approxTotalBytes : void 0;
    e.onProgress?.({
      phase: "loading",
      message: "Loading Janus-Pro-1B (starting downloads)…",
      bytesDownloaded: 0,
      totalBytesExpected: n,
      pct: typeof n == "number" ? 0 : void 0,
      accuracy: "approximate"
    });
    try {
      const o = /* @__PURE__ */ new Map();
      let l = 0;
      const f = (c) => {
        try {
          const w = c?.file || c?.name || c?.url || "asset", g = typeof c?.loaded == "number" ? c.loaded : typeof c?.progress == "number" && typeof c?.total == "number" ? Math.floor(c.progress * c.total) : void 0;
          if (typeof g == "number" && isFinite(g) && g >= 0) {
            const A = o.get(w) ?? 0, T = Math.max(A, g);
            o.set(w, T);
          }
          const P = Array.from(o.values()).reduce((A, T) => A + T, 0);
          P > l && (l = P);
          const M = typeof n == "number" ? Math.max(0, Math.min(100, Math.round(l / n * 100))) : void 0;
          e.onProgress?.({
            phase: "loading",
            message: c?.status ?? "loading…",
            bytesDownloaded: l,
            totalBytesExpected: n,
            pct: M,
            asset: typeof w == "string" ? w : void 0,
            accuracy: typeof c?.loaded == "number" ? "exact" : "approximate"
          });
        } catch {
          e.onProgress?.({ phase: "loading", message: c?.status ?? "loading…" });
        }
      }, m = r.AutoProcessor.from_pretrained(i, { progress_callback: f }), h = s ? { prepare_inputs_embeds: "q4", language_model: "q4f16", lm_head: "fp16", gen_head: "fp16", gen_img_embeds: "fp16", image_decode: "fp32" } : { prepare_inputs_embeds: "fp32", language_model: "q4", lm_head: "fp32", gen_head: "fp32", gen_img_embeds: "fp32", image_decode: "fp32" }, y = {
        // TODO: use 'webgpu' when upstream bug fixed; match example using wasm for this small stage
        prepare_inputs_embeds: "wasm",
        language_model: "webgpu",
        lm_head: "webgpu",
        gen_head: "webgpu",
        gen_img_embeds: "webgpu",
        image_decode: "webgpu"
      };
      e.onProgress?.({ phase: "loading", message: "Loading Janus-Pro-1B model…" });
      const p = r.MultiModalityCausalLM.from_pretrained(i, { dtype: h, device: y, progress_callback: f }), [b, u] = await Promise.all([m, p]);
      return typeof n == "number" && (l = Math.max(l, n)), e.onProgress?.({
        phase: "loading",
        message: "Janus-Pro-1B ready",
        bytesDownloaded: typeof n == "number" ? n : l,
        totalBytesExpected: n,
        pct: 100,
        accuracy: "approximate"
      }), this.hf = r, this.processor = b, this.model = u, this.backendUsed = "webgpu", this.loaded = !0, { ok: !0, backendUsed: "webgpu", bytesDownloaded: l || void 0 };
    } catch (o) {
      return { ok: !1, reason: "internal_error", message: o instanceof Error ? o.message : String(o) };
    }
  }
  isLoaded() {
    return this.loaded;
  }
  async generate(e) {
    if (!this.loaded || !this.processor || !this.model)
      return { ok: !1, reason: "model_not_loaded", message: "Call loadModel() first" };
    const { prompt: t, signal: r, onProgress: s } = e;
    if (!t || !t.trim())
      return { ok: !1, reason: "unsupported_option", message: "Prompt is required" };
    if (r?.aborted)
      return { ok: !1, reason: "cancelled" };
    const i = performance.now();
    try {
      const n = [
        { role: "<|User|>", content: t.trim() }
      ], o = await this.processor(n, { chat_template: "text_to_image" }), l = this.processor.num_image_tokens, f = s, m = this.hf.BaseStreamer;
      class h extends m {
        constructor(w, g) {
          super(), this.total = w, this.on_progress = g, this.count = null, this.start_time = null;
        }
        put(w) {
          if (r?.aborted)
            throw new Error("JANUS_STOP");
          if (this.count === null) {
            this.count = 0, this.start_time = performance.now();
            return;
          }
          const g = ++this.count / this.total;
          this.on_progress({ count: this.count, total: this.total, progress: g, time: performance.now() - (this.start_time ?? performance.now()) });
        }
        end() {
        }
      }
      const y = new h(l, (c) => {
        f?.({ phase: "image_tokens", ...c });
      }), b = await (await this.model.generate_images({
        ...o,
        min_new_tokens: l,
        max_new_tokens: l,
        do_sample: !0,
        streamer: y
      }))[0].toBlob(), u = performance.now() - i;
      return s?.({ phase: "complete", pct: 100, timeMs: u }), { ok: !0, blob: b, timeMs: u };
    } catch (n) {
      return n instanceof Error && n.message === "JANUS_STOP" ? (s?.({ phase: "complete", aborted: !0, pct: 0 }), { ok: !1, reason: "cancelled" }) : { ok: !1, reason: "internal_error", message: n instanceof Error ? n.message : String(n) };
    }
  }
  async unload() {
    this.loaded = !1, this.backendUsed = null, this.model = null, this.processor = null, this.hf = null;
  }
  async purgeCache() {
    await j(this.id);
  }
}
const q = [
  {
    id: "sd-turbo",
    displayName: "SD-Turbo (ONNX Runtime Web)",
    task: "text-to-image",
    supportedBackends: ["webgpu", "wasm"],
    notes: "Image size 512×512; seed supported.",
    sizeBytesApprox: 2398 * 1024 * 1024,
    sizeGBApprox: 2.34,
    sizeNotes: "UNet ~640MB, text_encoder ~1700MB, vae_decoder ~95MB",
    createAdapter: () => new ne()
  },
  {
    id: "janus-pro-1b",
    displayName: "Janus-Pro-1B (Transformers.js)",
    task: "text-to-image",
    supportedBackends: ["webgpu"],
    notes: "Seed unsupported.",
    sizeBytesApprox: 2305 * 1024 * 1024,
    sizeGBApprox: 2.25,
    sizeNotes: "Mixed-precision ONNX; varies slightly by device/dtype",
    createAdapter: () => new ce()
  }
];
function ue() {
  return q.map(({ createAdapter: a, ...e }) => e);
}
function fe(a) {
  const e = q.find((s) => s.id === a);
  if (!e)
    throw new Error(`Unknown model id: ${a}`);
  const { createAdapter: t, ...r } = e;
  return r;
}
function pe(a) {
  const e = q.find((t) => t.id === a);
  if (!e)
    throw new Error(`Unknown model id: ${a}`);
  return e;
}
function me(a) {
  switch (a) {
    case "sd-turbo":
      return ["webgpu", "wasm"];
    case "janus-pro-1b":
      return ["webgpu"];
  }
}
const R = /* @__PURE__ */ new Map();
let O = null;
async function G() {
  return O || (O = await Z()), O;
}
function he() {
  return ee();
}
function ge() {
  return ue();
}
function L(a) {
  let e = R.get(a);
  return e || (e = pe(a).createAdapter(), R.set(a, e)), e;
}
async function be(a, e = {}) {
  const t = await G(), r = L(a), s = r.checkSupport(t);
  if (s.length === 0)
    return { ok: !1, reason: a === "janus-pro-1b" ? "webgpu_unsupported" : "backend_unavailable", message: "No supported backend detected" };
  const i = e.backendPreference ?? me(a);
  if (!i.find((f) => s.includes(f)))
    return { ok: !1, reason: "backend_unavailable", message: "No backend available matching preference" };
  const o = fe(a), l = typeof e.approxTotalBytes == "number" ? e.approxTotalBytes : o.sizeBytesApprox;
  return r.load({ ...e, backendPreference: i, approxTotalBytes: l });
}
async function ye(a) {
  await L(a).unload();
}
async function we(a) {
  await L(a).purgeCache();
}
async function _e() {
  await ae();
}
async function ke(a) {
  const e = L(a.model);
  if (!e.isLoaded())
    return { ok: !1, reason: "model_not_loaded", message: "Call loadModel() first" };
  const { model: t, ...r } = a;
  return e.generate(r);
}
let _ = null, v = null, E = !1;
const ve = 8e3;
let x = null, N = null, k = null, D = !1;
function d(a) {
  self.postMessage(a);
}
function z(a) {
  d({ type: "state", value: a });
}
function W(a) {
  if (typeof a?.pct == "number")
    return a.pct;
  if (typeof a?.progress == "number")
    return Math.round(a.progress * 100);
}
async function Q(a) {
  z("running");
  const e = a.params, t = await ke({
    ...e,
    signal: a.controller.signal,
    onProgress: (r) => {
      d({ id: a.id, type: "progress", event: { ...r, pct: W(r) } });
    }
  });
  !_ || _.id !== a.id || (_ = null, E && (E = !1, x && (clearTimeout(x), x = null)), t.ok ? d({ id: a.id, type: "result", ok: !0, blob: t.blob, timeMs: t.timeMs }) : d({ id: a.id, type: "result", ok: !1, reason: t.reason, message: t.message }), Me());
}
function Me() {
  if (_)
    return;
  if (!v) {
    z("idle");
    return;
  }
  z("queued");
  const a = Date.now(), e = Math.max(0, (v.debounceUntil ?? 0) - a);
  N && (clearTimeout(N), N = null), e > 0 ? N = setTimeout(() => {
    J();
  }, e) : J();
}
function J() {
  if (!v || _)
    return;
  const a = v;
  v = null;
  const e = new AbortController();
  _ = { id: a.id, controller: e, params: a.params }, Q(_);
}
function H(a) {
  v && d({ id: v.id, type: "result", ok: !1, reason: "superseded" }), v = a, z("queued");
}
function X() {
  x = setTimeout(() => {
    _ && d({ id: _.id, type: "progress", event: { phase: "aborting_timeout", pct: W({}) } }), E = !1;
  }, ve);
}
function Te(a) {
  const e = a.data;
  if (!(!e || typeof e != "object" || !("kind" in e)))
    switch (e.kind) {
      case "detect": {
        G().then((t) => d({ id: e.id, type: "result", ok: !0, data: t })).catch((t) => d({ id: e.id, type: "result", ok: !1, reason: "internal_error", message: String(t) }));
        break;
      }
      case "listModels": {
        try {
          d({ id: e.id, type: "result", ok: !0, data: ge() });
        } catch (t) {
          d({ id: e.id, type: "result", ok: !1, reason: "internal_error", message: String(t) });
        }
        break;
      }
      case "listBackends": {
        try {
          d({ id: e.id, type: "result", ok: !0, data: he() });
        } catch (t) {
          d({ id: e.id, type: "result", ok: !1, reason: "internal_error", message: String(t) });
        }
        break;
      }
      case "load": {
        if (k || D) {
          const t = "busy", r = k ? `Model "${k}" already loaded. Unload before loading another.` : "Another load is in progress.";
          d({ id: e.id, type: "result", ok: !1, reason: t, message: r });
          break;
        }
        D = !0, be(e.model, {
          ...e.options,
          onProgress: (t) => d({ id: e.id, type: "progress", event: { ...t, pct: typeof t.pct == "number" ? t.pct : void 0 } })
        }).then((t) => {
          if (t.ok)
            d({ id: e.id, type: "result", ok: !0, data: t }), k = e.model;
          else {
            const r = t;
            d({ id: e.id, type: "result", ok: !1, reason: r.reason ?? "internal_error", message: r.message });
          }
        }).catch((t) => d({ id: e.id, type: "result", ok: !1, reason: "internal_error", message: String(t) })).finally(() => {
          D = !1;
        });
        break;
      }
      case "unload": {
        const t = e.model ?? k ?? null;
        if (!t) {
          d({ id: e.id, type: "result", ok: !1, reason: "model_not_loaded", message: "No model loaded to unload." });
          break;
        }
        if (k && k !== t) {
          d({ id: e.id, type: "result", ok: !1, reason: "model_not_loaded", message: `Loaded model is "${k}"; requested unload "${t}".` });
          break;
        }
        ye(t).then(() => {
          k === t && (k = null), d({ id: e.id, type: "result", ok: !0 });
        }).catch((r) => d({ id: e.id, type: "result", ok: !1, reason: "internal_error", message: String(r) }));
        break;
      }
      case "purge": {
        const t = e.model ?? k ?? null;
        if (!t) {
          d({ id: e.id, type: "result", ok: !1, reason: "model_not_loaded", message: "No model specified and none loaded; cannot purge." });
          break;
        }
        we(t).then(() => d({ id: e.id, type: "result", ok: !0 })).catch((r) => d({ id: e.id, type: "result", ok: !1, reason: "internal_error", message: String(r) }));
        break;
      }
      case "purgeAll": {
        _e().then(() => d({ id: e.id, type: "result", ok: !0 })).catch((t) => d({ id: e.id, type: "result", ok: !1, reason: "internal_error", message: String(t) }));
        break;
      }
      case "generate": {
        const t = e.busyPolicy ?? "queue", r = e.replaceQueued ?? !0, s = Math.max(0, e.debounceMs ?? 0), n = e.params.model ?? k ?? null;
        if (!n) {
          d({ id: e.id, type: "result", ok: !1, reason: "model_not_loaded", message: "No model loaded; specify a model or call load() first." });
          break;
        }
        if (!k) {
          d({ id: e.id, type: "result", ok: !1, reason: "model_not_loaded", message: "No model loaded; call load() first." });
          break;
        }
        if (k !== n) {
          d({ id: e.id, type: "result", ok: !1, reason: "model_not_loaded", message: `Loaded model is "${k}"; requested generate for "${n}".` });
          break;
        }
        const o = { ...e.params, model: n };
        if (!_) {
          const l = new AbortController();
          _ = { id: e.id, controller: l, params: o }, Q(_);
          break;
        }
        if (t === "reject") {
          d({ id: e.id, type: "result", ok: !1, reason: "busy" });
          break;
        }
        if (t === "abort_and_queue") {
          const l = { id: e.id, params: o };
          if (r)
            H(l);
          else if (!v)
            v = l;
          else {
            d({ id: e.id, type: "result", ok: !1, reason: "busy" });
            break;
          }
          if (s > 0) {
            const f = Date.now();
            v && (v.debounceUntil = f + s);
          }
          !E && _ && (E = !0, z("aborting"), _.controller.abort(), x && (clearTimeout(x), x = null), X()), d({ id: e.id, type: "accepted" });
          break;
        }
        v ? r ? (H({ id: e.id, params: o, debounceUntil: s ? Date.now() + s : void 0 }), d({ id: e.id, type: "accepted" })) : d({ id: e.id, type: "result", ok: !1, reason: "busy" }) : (v = { id: e.id, params: o, debounceUntil: s ? Date.now() + s : void 0 }, d({ id: e.id, type: "accepted" })), z("queued");
        break;
      }
      case "abort": {
        _ ? (E || (E = !0, z("aborting"), _.controller.abort(), x && (clearTimeout(x), x = null), X()), d({ id: e.id, type: "accepted" })) : d({ id: e.id, type: "result", ok: !0 });
        break;
      }
    }
}
self.addEventListener("message", Te);
z("idle");
