"""SpriteForge RU public Gradio API for Hugging Face ZeroGPU.

Independent open-source inference: not affiliated with SpriteGen.ai.
"""
import json
import traceback
import gradio as gr
import spaces
from spriteforge_backend import Request, generate_sync

def parse_request(payload: str, engine: str) -> Request:
    if not payload or len(payload) > 11500000:
        raise gr.Error("Некорректный размер запроса.")
    try:
        request = Request(**json.loads(payload))
        request.engine = engine
        size = {"all4": 4, "all8": 8}.get(request.facing, 1)
        if engine == "ai" and request.frames * size > 24:
            raise ValueError("Для бесплатного ZeroGPU максимум 24 кадра за запрос.")
        return request
    except (ValueError, TypeError, KeyError) as error:
        raise gr.Error("Ошибка параметров: " + str(error)) from error

def run_demo(payload: str):
    try:
        return generate_sync(parse_request(payload, "demo"))
    except Exception as error:
        raise gr.Error(str(error)) from error

@spaces.GPU(duration=120)
def run_ai(payload: str):
    try:
        return generate_sync(parse_request(payload, "ai"))
    except Exception as error:
        traceback.print_exc()
        raise gr.Error("ИИ не смог завершить генерацию: " + str(error)[:450]) from error

intro = """# SpriteForge RU · генератор спрайтов

Независимый инструмент на открытых моделях AnimateDiff / Stable Diffusion.
[Открыть редактор SpriteForge RU](https://alexerrove-dotcom.github.io/spriteforge/).

На бесплатном ZeroGPU действуют дневные лимиты и очередь. Первая генерация
скачивает модели; согласованность героя между кадрами пока экспериментальная.
"""
example = json.dumps({
    "prompt": "Рыжий лис с зелёным шарфом и рогаткой",
    "style": "16bit", "view": "side", "facing": "right",
    "size": 64, "frames": 6, "action": "run",
    "engine": "ai", "reference": None
}, ensure_ascii=False, indent=2)

with gr.Blocks(title="SpriteForge RU · AI Server") as demo:
    gr.Markdown(intro)
    payload = gr.Textbox(label="Запрос JSON", value=example, lines=12)
    with gr.Row():
        ai_button = gr.Button("Генерировать с ИИ", variant="primary")
        demo_button = gr.Button("Проверить без GPU")
    result = gr.JSON(label="Ответ: изображения и атлас")
    ai_button.click(run_ai, inputs=payload, outputs=result, api_name="generate")
    demo_button.click(run_demo, inputs=payload, outputs=result, api_name="demo")

demo.queue(default_concurrency_limit=1, max_size=12)
demo.launch()
