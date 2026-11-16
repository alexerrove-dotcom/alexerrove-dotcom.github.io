"""SpriteForge GPU — mobile-friendly server-side AI character & keyframe drawing.

The model is lazy-loaded on GPU after Hugging Face approves/provisions dedicated
hardware. This file deliberately refuses CPU-only generation rather than
pretending a GPU grant already exists.
"""
from __future__ import annotations
import os
import secrets
import threading
import gradio as gr
from PIL import Image
from core import ACTIONS, STYLES, prompt_character, pose_guide, frame_instruction, export_animation

MODEL_ID="black-forest-labs/FLUX.2-klein-4B"  # Apache 2.0
GPU_LOCK=threading.Lock()
PIPE=None

def get_pipe():
    global PIPE
    import torch
    if not torch.cuda.is_available():
        raise RuntimeError("Выделенный GPU пока не подключён. Нужен Community GPU Grant от Hugging Face.")
    if PIPE is None:
        from diffusers import Flux2KleinPipeline
        pipeline=Flux2KleinPipeline.from_pretrained(MODEL_ID,torch_dtype=torch.bfloat16)
        pipeline.enable_model_cpu_offload()
        PIPE=pipeline
    return PIPE

def render(prompt,seed,reference_images=None,width=768,height=1024):
    """Every keyframe is its own inference, with common identity + pose references."""
    import torch
    with GPU_LOCK:
        pipe=get_pipe()
        generator=torch.Generator(device="cpu").manual_seed(int(seed)%(2**31-1))
        kwargs=dict(prompt=prompt,width=width,height=height,
                    guidance_scale=1.0,num_inference_steps=4,generator=generator)
        if reference_images:
            kwargs["image"]=[img.convert("RGB") for img in reference_images]
        return pipe(**kwargs).images[0].convert("RGB")

def make_character(description,style,seed,progress=gr.Progress()):
    try:
        seed=int(seed or secrets.randbelow(999999999))
        text=(description or "").strip()
        style=style if style in STYLES else list(STYLES)[0]
        prompt=prompt_character(text,style)
        progress(.1,desc="Нейросеть рисует одного героя в полный рост")
        image=render(prompt,seed)
        progress(1,desc="Персонаж готов")
        return image,{"description":text,"style":style,"seed":seed,"reference":image.copy()},"Персонаж создан. Выбери действие ниже."
    except Exception as exc:
        raise gr.Error(str(exc)) from exc

def make_animation(state,action,progress=gr.Progress()):
    if not state or not isinstance(state.get("reference"),Image.Image):
        raise gr.Error("Сначала создай персонажа")
    if action not in ACTIONS:
        raise gr.Error("Выбери доступную анимацию")
    output=[]
    for i in range(8):
        progress(i/8,desc=f"Нейросеть рисует новый кадр {i+1}/8 · {action}")
        # Image 1 is locked character, image 2 supplies a pose drawing.
        pose=pose_guide(action,i)
        instruction=frame_instruction(state["description"],state["style"],action,i)
        try:
            frame=render(instruction,state["seed"]+101+i*17,
                         reference_images=[state["reference"],pose])
        except Exception as exc:
            raise gr.Error(f"Ошибка при генерации кадра {i+1}: {exc}") from exc
        output.append(frame)
    progress(.94,desc="Собираем PNG, GIF, JSON и ZIP")
    sheet,pngpath,zippath=export_animation(output,action)
    progress(1,desc="Готово")
    return sheet,pngpath,zippath,"8 нейросетевых кадров созданы отдельно. Проверь анатомию, лицо и одежду перед публикацией."

with gr.Blocks(title="SpriteForge GPU — персонажи и анимация") as demo:
    gr.Markdown("# SpriteForge GPU\n**Создай персонажа по описанию и восемь новых кадров его движения.** Работает с телефона; модель размещается на сервере.")
    gr.Markdown("Пока нет выделенного GPU, создание изображений недоступно. Код подготовлен для заявки Community GPU Grant.")
    state=gr.State(value=None)
    with gr.Group():
        description=gr.Textbox(label="Кого нарисовать?",lines=4,max_lines=7,
            value="Мужчина около 30 лет, коричневая куртка, синие джинсы, белые кроссовки, полный рост")
        style=gr.Radio(choices=list(STYLES),value="Рисованный мультфильм",label="Стиль")
        seed=gr.Number(value=0,precision=0,label="Вариант (0 — случайный)")
        make=gr.Button("Создать персонажа",variant="primary")
        hero=gr.Image(label="Исходный персонаж",type="pil",interactive=False,height=380)
        status=gr.Textbox(label="Состояние",interactive=False)
    with gr.Group():
        action=gr.Radio(label="Выбери действие",choices=list(ACTIONS),value="Ходьба")
        animate=gr.Button("Нарисовать покадровую анимацию",variant="primary")
        sprites=gr.Image(label="Новые кадры 4 × 2",type="pil",interactive=False,height=360)
        png=gr.File(label="PNG спрайт-лист")
        zipout=gr.File(label="ZIP: кадры, GIF, JSON")
        message=gr.Textbox(label="Результат",interactive=False)
    make.click(make_character,[description,style,seed],[hero,state,status],
        api_name="generate_character",concurrency_limit=1)
    animate.click(make_animation,[state,action],[sprites,png,zipout,message],
        api_name="generate_animation",concurrency_limit=1)
    gr.Markdown("*Каждый кадр — отдельный вызов нейросети. Качество совпадения внешности пока не проверено на выделенном GPU.*")
if __name__=="__main__":
    demo.queue(default_concurrency_limit=1,max_size=8)
    demo.launch(server_name="0.0.0.0",server_port=int(os.getenv("PORT","7860")),show_error=True)
