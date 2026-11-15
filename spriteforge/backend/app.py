"""SpriteForge RU: independently hosted text-to-sprite API.
AI mode uses open pretrained AnimateDiff + Stable Diffusion models, NOT the SpriteGen service.
Demo mode is procedural (not artificial intelligence) and is for smoke tests.
"""
import asyncio
import base64
import io
import json
import math
import os
import re
import threading
import zipfile
from functools import lru_cache
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from PIL import Image, ImageDraw, ImageOps

HERE = Path(__file__).resolve().parent
MODEL_ID = os.getenv("MODEL_ID", "frankjoshua/toonyou_beta6")
MOTION_ID = os.getenv("MOTION_ID", "guoyww/animatediff-motion-adapter-v1-5-2")
GPU_LOCK = threading.Lock()
STYLE = {
    "16bit": "classic 16-bit pixel art video game sprite, crisp clean outlines",
    "retro": "retro handheld console pixel art, limited color palette",
    "cozy": "cozy storybook farm pixel art, warm colors",
    "dark": "dark gothic fantasy game pixel art",
    "cute": "cute colorful chunky pixel art sprite",
    "cartoon": "2D hand-drawn cartoon game character, clear silhouette",
    "anime": "2D anime game character sprite",
    "chibi": "cute chibi game sprite, large head small body",
    "vector": "flat vector game sprite, clear shapes",
    "toon3d": "stylized 3D cartoon game character render",
    "painted": "hand-painted illustrative game character",
    "comic": "bold comic book character, ink outlines",
}
ACTIONS = {
    "idle": "idling, subtle natural breathing",
    "walk": "walking cycle, clear moving arms and legs",
    "run": "running cycle, energetic swinging limbs",
    "jump": "jumping and landing",
    "attack": "attacking with a weapon, dynamic strike",
    "cast": "casting a magic spell with hands",
    "hurt": "reacting to damage, recoiling",
    "death": "falling and collapsing in a death animation",
    "fly": "flying and flapping wings",
}
FACE = {
    "right": "right side profile facing right", "left": "left side profile facing left",
    "up": "back view facing away from camera", "down": "front view facing camera",
    "ne": "three-quarter view facing northeast", "nw": "three-quarter view facing northwest",
    "se": "three-quarter view facing southeast", "sw": "three-quarter view facing southwest",
}
VIEW = {"side": "side view", "front": "front view", "top": "top down view", "iso": "isometric three-quarter view"}
PIXEL = {"16bit", "retro", "cozy", "dark", "cute"}

app = FastAPI(title="SpriteForge RU AI", version="0.1.0")
allowed = [x.strip() for x in os.getenv("ALLOW_ORIGINS", "https://alexerrove-dotcom.github.io,http://localhost:8000,http://127.0.0.1:8000").split(",") if x.strip()]
app.add_middleware(CORSMiddleware, allow_origins=allowed, allow_credentials=False, allow_methods=["GET", "POST"], allow_headers=["Content-Type"])


class Request(BaseModel):
    prompt: str = Field(min_length=3, max_length=800)
    style: str = "16bit"
    view: str = "side"
    facing: str = "right"
    size: int = 64
    frames: int = 8
    action: str = "idle"
    engine: str = "ai"
    reference: str | None = None


def directions(facing: str) -> list[str]:
    if facing == "all4":
        return ["down", "left", "right", "up"]
    if facing == "all8":
        return ["down", "sw", "left", "nw", "up", "ne", "right", "se"]
    if facing not in FACE:
        raise ValueError("Неизвестное направление")
    return [facing]


def validate(req: Request):
    if req.style not in STYLE or req.view not in VIEW:
        raise ValueError("Некорректный стиль или ракурс")
    if req.size not in (16, 32, 64, 96, 128, 256):
        raise ValueError("Недоступный размер")
    if req.frames not in (6, 8, 12):
        raise ValueError("Поддерживается 6, 8 или 12 кадров")
    if req.engine not in ("ai", "demo"):
        raise ValueError("Неизвестный режим")
    if not req.action.strip() or len(req.action) > 140:
        raise ValueError("Слишком длинное действие")
    directions(req.facing)


def read_reference(value: str | None) -> Image.Image | None:
    if not value:
        return None
    if len(value) > 11_000_000:
        raise ValueError("Изображение слишком большое")
    if not value.startswith(("data:image/png;base64,", "data:image/jpeg;base64,", "data:image/webp;base64,")):
        raise ValueError("Изображение должно быть PNG, JPEG или WebP")
    raw = base64.b64decode(value.partition(",")[2], validate=True)
    im = Image.open(io.BytesIO(raw))
    im.verify()
    im = Image.open(io.BytesIO(raw)).convert("RGBA")
    if im.width * im.height > 12_000_000:
        raise ValueError("Изображение превышает 12 млн пикселей")
    return im


@lru_cache(maxsize=1)
def translator():
    """Local, optional RU→EN translation; never calls a paid API."""
    from transformers import pipeline
    return pipeline("translation", model="Helsinki-NLP/opus-mt-ru-en", device=-1)


def english(text: str) -> str:
    if not re.search(r"[а-яА-ЯёЁ]", text):
        return text
    try:
        return translator()(text, max_length=180)[0]["translation_text"]
    except Exception as exc:
        raise RuntimeError("Не удалось загрузить офлайн-переводчик RU→EN: " + str(exc)) from exc


@lru_cache(maxsize=1)
def ai_pipes():
    import torch
    from diffusers import AnimateDiffPipeline, AnimateDiffVideoToVideoPipeline, DDIMScheduler, MotionAdapter
    if not torch.cuda.is_available():
        raise RuntimeError("Для режима ИИ нужна видеокарта NVIDIA CUDA. На CPU доступен только demo.")
    dtype = torch.float16
    adapter = MotionAdapter.from_pretrained(MOTION_ID, torch_dtype=dtype)
    pipe = AnimateDiffPipeline.from_pretrained(MODEL_ID, motion_adapter=adapter, torch_dtype=dtype).to("cuda")
    pipe.scheduler = DDIMScheduler.from_pretrained(MODEL_ID, subfolder="scheduler", beta_schedule="linear", clip_sample=False, steps_offset=1)
    pipe.enable_vae_slicing()
    return pipe, adapter


@lru_cache(maxsize=1)
def video_pipe():
    import torch
    from diffusers import AnimateDiffVideoToVideoPipeline, DDIMScheduler
    _, adapter = ai_pipes()
    pipe = AnimateDiffVideoToVideoPipeline.from_pretrained(MODEL_ID, motion_adapter=adapter, torch_dtype=torch.float16).to("cuda")
    pipe.scheduler = DDIMScheduler.from_pretrained(MODEL_ID, subfolder="scheduler", beta_schedule="linear", clip_sample=False, steps_offset=1)
    pipe.enable_vae_slicing()
    return pipe


@lru_cache(maxsize=1)
def segmentation():
    from rembg import new_session
    return new_session("u2netp")


def background_remove(im: Image.Image) -> Image.Image:
    from rembg import remove
    return remove(im.convert("RGB"), session=segmentation()).convert("RGBA")


def fit_sprite(im: Image.Image, sz: int, pixel: bool) -> Image.Image:
    im = im.convert("RGBA")
    alpha = im.getchannel("A").point(lambda n: 255 if n >= 80 else 0)
    im.putalpha(alpha)
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    target = max(1, int(sz * 0.88))
    im.thumbnail((target, target), Image.Resampling.LANCZOS)
    if pixel:
        # Pixelize art before upscaling; preserve alpha without black borders.
        source = max(12, min(48, sz // 2))
        im = im.resize((source, source), Image.Resampling.NEAREST)
        rgb = im.convert("RGB").quantize(colors=28, dither=Image.Dither.NONE).convert("RGB")
        rgb.putalpha(im.getchannel("A"))
        im = rgb
        im.thumbnail((target, target), Image.Resampling.NEAREST)
    out = Image.new("RGBA", (sz, sz), (0, 0, 0, 0))
    out.alpha_composite(im, ((sz - im.width) // 2, sz - im.height - max(0, int(sz * .025))))
    return out


def generate_ai(req: Request, dirs: list[str], reference: Image.Image | None) -> list[Image.Image]:
    import torch
    text = english(req.prompt)
    move = english(ACTIONS.get(req.action, req.action))
    result = []
    pipe = video_pipe() if reference else ai_pipes()[0]
    for direction in dirs:
        full = (text + ", " + move + ", " + VIEW[req.view] + ", " + FACE[direction] +
                ", " + STYLE[req.style] + ", single full-body character centered, complete limbs visible, "
                "isolated game character, plain uniform white background, animation frames, consistent costume")
        neg = "blurry, low quality, text, lettering, watermark, cropped, multiple characters, extra arms, background scenery, spritesheet, grid"
        kw = dict(prompt=full, negative_prompt=neg, width=512, height=512,
                  num_inference_steps=22, guidance_scale=7.5)
        with torch.inference_mode():
            if reference:
                base = Image.new("RGB", (512, 512), "white")
                sample = reference.convert("RGBA")
                sample.thumbnail((456, 456), Image.Resampling.LANCZOS)
                base.paste(sample.convert("RGB"), ((512-sample.width)//2, (512-sample.height)//2), sample)
                video = [base.copy() for _ in range(req.frames)]
                frames = pipe(video=video, strength=.68, **kw).frames[0]
            else:
                frames = pipe(num_frames=req.frames, **kw).frames[0]
        if len(frames) < req.frames:
            raise RuntimeError("Модель вернула недостаточно кадров")
        for im in frames[:req.frames]:
            result.append(fit_sprite(background_remove(im), req.size, req.style in PIXEL))
    return result


def demo_sprite(req: Request, direction: str, index: int) -> Image.Image:
    """Hand-coded procedural animation, explicitly NOT an AI output."""
    canvas = Image.new("RGBA", (192, 192))
    d = ImageDraw.Draw(canvas)
    name = req.prompt.lower()
    fox = bool(re.search("лис|fox", name))
    undead = bool(re.search("зомб|zomb", name))
    robot = bool(re.search("робот|robot", name))
    dragon = bool(re.search("дракон|dragon", name))
    mage = bool(re.search("маг|волшеб|mage", name))
    skin = (232, 119, 47) if fox else (101, 170, 95) if (undead or dragon) else (135, 175, 213) if robot else (231, 191, 144)
    coat = (45, 124, 77) if fox else (111, 63, 155) if mage else (68, 92, 136) if robot else (116, 83, 72)
    swing = math.sin(index * 2 * math.pi / req.frames)
    flight = req.action == "fly"
    stride = req.action in ("walk", "run")
    attack = req.action in ("attack", "cast")
    jump = req.action == "jump"
    death = req.action == "death"
    phase = index / max(1, req.frames - 1)
    dy = (-32 * math.sin(phase * math.pi) if jump else -10 * abs(swing) if flight else -3 * abs(swing) if stride else -2 * math.sin(index * 2 * math.pi / req.frames))
    if death:
        dy = 40 * phase
    cy = int(dy)
    tail = (194, 117, 53) if fox else (90, 145, 78)
    if fox or dragon:
        d.polygon([(126, 114+cy), (166, 92+cy+int(swing*9)), (158, 125+cy), (125, 142+cy)], fill=tail)
        if fox:
            d.polygon([(166,92+cy+int(swing*9)),(158,125+cy),(147,120+cy)],fill=(249,227,186))
    # Limb animation comes from actual redrawn positions, not a repeated frame.
    shift = int(swing * (19 if req.action == "run" else 11)) if stride else 0
    d.line([(84,128+cy),(76+shift,158+cy)],fill=(51,61,71),width=17)
    d.line([(112,128+cy),(113-shift,160+cy)],fill=(51,61,71),width=17)
    d.ellipse((67+shift,152+cy,85+shift,161+cy),fill=(35,41,52))
    d.ellipse((104-shift,154+cy,125-shift,163+cy),fill=(35,41,52))
    d.rounded_rectangle((72,78+cy,122,135+cy),radius=12,fill=coat,outline=(42,48,58),width=3)
    d.line([(79,91+cy),(69-shift,119+cy)],fill=skin,width=13)
    handx=137+shift if stride else 144 if attack else 132
    handy=63+cy if attack else 119+cy
    d.line([(113,91+cy),(handx,handy)],fill=skin,width=13)
    # Tailored face and ears.
    if fox:
        d.polygon([(73,49+cy),(77,18+cy),(96,40+cy)],fill=skin,outline=(56,50,42))
        d.polygon([(105,40+cy),(124,18+cy),(126,54+cy)],fill=skin,outline=(56,50,42))
        d.ellipse((72,41+cy,126,94+cy),fill=skin,outline=(58,56,55),width=3)
        d.polygon([(94,74+cy),(133,72+cy),(118,91+cy)],fill=(241,219,183))
        d.ellipse((123,74+cy,131,81+cy),fill=(40,40,44))
    elif robot:
        d.rounded_rectangle((70,36+cy,127,91+cy),radius=10,fill=skin,outline=(40,49,72),width=4)
        d.rectangle((83,57+cy,96,68+cy),fill=(83,240,255));d.rectangle((107,57+cy,118,68+cy),fill=(83,240,255))
        d.line([(99,36+cy),(99,19+cy)],fill=(160,170,180),width=4)
    else:
        d.ellipse((70,34+cy,127,93+cy),fill=skin,outline=(60,53,57),width=3)
        d.ellipse((113,59+cy,122,67+cy),fill=(24,32,36))
        if mage:d.polygon([(60,48+cy),(96,10+cy),(136,49+cy)],fill=(99,63,130))
    if fox:
        d.ellipse((107,56+cy,115,64+cy),fill=(26,27,31))
        d.polygon([(71,80+cy),(121,80+cy),(116,94+cy),(80,95+cy)],fill=(51,142,82))
    if attack:
        d.line([(handx,handy),(163,29+cy)],fill=(163,139,90),width=6)
        d.line([(163,29+cy),(173,12+cy)],fill=(210,224,235),width=5)
    if flight or dragon:
        d.polygon([(80,91+cy),(29,53+cy-int(swing*17)),(54,119+cy)],fill=(100,142,125),outline=(44,78,67))
    if direction in ("left", "nw", "sw"):
        canvas=ImageOps.mirror(canvas)
    if death:
        canvas=canvas.rotate(-phase*75,resample=Image.Resampling.BICUBIC)
    return fit_sprite(canvas,req.size,req.style in PIXEL)


def png_bytes(im: Image.Image) -> bytes:
    output=io.BytesIO()
    im.save(output, format="PNG")
    return output.getvalue()


def data_url(kind: str, payload: bytes) -> str:
    return "data:" + kind + ";base64," + base64.b64encode(payload).decode("ascii")


def build_assets(frames: list[Image.Image], req: Request, dirs: list[str]) -> dict:
    sz=req.size
    cols=req.frames
    sheet=Image.new("RGBA",(sz*cols,sz*len(dirs)))
    atlas={"meta":{"image":"sprite_sheet.png","size":{"w":sheet.width,"h":sheet.height},"frame_size":sz,
                   "generator":"SpriteForge RU","engine":req.engine,"directions":dirs},
           "frames":{},"animations":{}}
    for n,direction in enumerate(dirs):
        key=direction+"_"+req.action
        atlas["animations"][key]=[]
        for f in range(req.frames):
            i=n*req.frames+f
            sheet.alpha_composite(frames[i],(f*sz,n*sz))
            tag=key+"_"+str(f).zfill(2)+".png"
            atlas["frames"][tag]={"frame":{"x":f*sz,"y":n*sz,"w":sz,"h":sz},
                                  "duration":125,"sourceSize":{"w":sz,"h":sz}}
            atlas["animations"][key].append(tag)
    gif_buffer=io.BytesIO()
    # Pillow encodes GIF frames; transparency may be binary and palette is capped at 256 colors.
    frames[:req.frames][0].save(gif_buffer,format="GIF",save_all=True,
                              append_images=frames[1:req.frames],duration=125,loop=0,disposal=2,
                              optimize=False,transparency=0)
    atlas_bytes=json.dumps(atlas,ensure_ascii=False,indent=2).encode("utf8")
    zbuf=io.BytesIO()
    with zipfile.ZipFile(zbuf,"w",zipfile.ZIP_DEFLATED) as z:
        z.writestr("sprite_sheet.png",png_bytes(sheet))
        z.writestr("atlas.json",atlas_bytes)
        for n,direction in enumerate(dirs):
            for f in range(req.frames):
                z.writestr("frames/"+direction+"_"+str(f).zfill(2)+".png",
                           png_bytes(frames[n*req.frames+f]))
    return {"sheet":data_url("image/png",png_bytes(sheet)),
            "gif":data_url("image/gif",gif_buffer.getvalue()),
            "zip":data_url("application/zip",zbuf.getvalue()),
            "atlas":data_url("application/json",atlas_bytes),
            "frames":req.frames,"cell_size":sz,"columns":cols,
            "directions":len(dirs),"engine":req.engine}


def generate_sync(req: Request) -> dict:
    validate(req)
    dirs=directions(req.facing)
    ref=read_reference(req.reference)
    if req.engine=="demo":
        frames=[demo_sprite(req,d,i) for d in dirs for i in range(req.frames)]
        return build_assets(frames,req,dirs)
    with GPU_LOCK:
        frames=generate_ai(req,dirs,ref)
        return build_assets(frames,req,dirs)


@app.get("/api/health")
def health():
    try:
        import torch
        gpu=torch.cuda.is_available()
    except ImportError:
        gpu=False
    return {"status":"ok","model":MODEL_ID,"gpu":gpu,
            "ai_available":gpu,"demo_available":True,
            "note":"AI inference downloads open models on first use; demo is NOT AI."}


@app.post("/api/generate")
async def generate(req: Request):
    try:
        return await asyncio.to_thread(generate_sync,req)
    except (ValueError, OSError) as exc:
        raise HTTPException(status_code=422,detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503,detail=str(exc)) from exc


@app.get("/")
def index():
    return FileResponse(HERE.parent/"index.html")
