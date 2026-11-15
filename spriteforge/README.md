# SpriteForge RU — независимая студия игровых спрайтов

**Сайт:** https://alexerrove-dotcom.github.io/spriteforge/
**Исходники:** https://github.com/alexerrove-dotcom/alexerrove-dotcom.github.io/tree/main/spriteforge

Проект не является копией исходного кода SpriteGen.ai, не использует его закрытый API и не связан с его владельцами. Это собственная реализация основных рабочих сценариев на русском языке.

## Что реализовано

- Русскоязычный интерфейс с 12 визуальными стилями, ракурсами и действиями.
- Анимации на 6, 8 или 12 кадров; одно, четыре или восемь направлений.
- Режим ИИ: независимые открытые модели [AnimateDiff](https://huggingface.co/guoyww/animatediff-motion-adapter-v1-5-2) + [ToonYou/Stable Diffusion](https://huggingface.co/frankjoshua/toonyou_beta6), локальный перевод RU→EN и удаление фона через rembg.
- Входное изображение-референс для video-to-video генерации (экспериментально).
- Экспорт PNG sprite sheet, GIF, ZIP с покадровыми PNG, JSON атлас.
- Пиксель-редактор в браузере: карандаш, ластик, зеркальное рисование, PNG.
- Сборщик PNG/JPEG/WebP кадров в атлас с JSON.
- Конвертер GIF → лист через браузерный ImageDecoder (Chrome/Chromium с поддержкой API).
- Процедурный демо-режим для проверки без видеокарты (не ИИ).
- Библиотека результатов в пределах открытой вкладки.

## Важно: не обещает идентичности исходному сервису

Нельзя гарантировать такое же качество, движение, постоянство внешности или скорость, как у закрытого SpriteGen.ai. Это не обученная с нуля новая нейросеть: здесь собственная инфраструктура, код и алгоритм обработки спрайтов, но генеративные веса берутся из открытых предобученных моделей. Спрайты AnimateDiff могут требовать художественной правки. Автоматическая 8-направленная консистентность и строгое соблюдение заданных поз не гарантируются. Сервис не включает биллинг, аккаунты, платные планы и постоянное облачное хранение.

GitHub Pages размещает только HTML/JS, не выполняет Python/ИИ на GPU. Для ИИ нужен сервер с NVIDIA CUDA GPU, способный разместить модель и AnimateDiff (ориентир: от 12–16 ГБ видеопамяти, в зависимости от количества кадров, конфигурации и оптимизаций). Перед коммерческим использованием проверь лицензии моделей и условия их авторов.

## Проверка локального демо

Нужен Python 3.10+.

~~~bash
cd spriteforge/backend
python -m pip install -r requirements.txt
python -m unittest -v test_demo
uvicorn app:app --host 127.0.0.1 --port 8000
~~~

Открой http://127.0.0.1:8000 и выбери «Демонстрация · без ИИ». Проверка не требует скачивания весов.

## Запуск настоящего ИИ на GPU

~~~bash
cd spriteforge/backend
python -m pip install -r requirements-ai.txt
# Убедись, что установлен CUDA-вариант PyTorch; проверь torch.cuda.is_available().
uvicorn app:app --host 0.0.0.0 --port 8000
~~~

Рекомендуется Docker с NVIDIA Container Toolkit:

~~~bash
cd spriteforge
docker build -t spriteforge-ru -f backend/Dockerfile .
docker run --gpus all --rm -p 8000:8000 \
  -e ALLOW_ORIGINS=https://alexerrove-dotcom.github.io,http://localhost:8000 \
  -v spriteforge_hf_cache:/root/.cache/huggingface spriteforge-ru
~~~

Первый запрос загружает модели (несколько гигабайт); на CPU режим ИИ намеренно недоступен. Запросы обрабатываются последовательно из-за GPU_LOCK. Для публичного сайта нужны HTTPS, очередь задач, rate limits, мониторинг, аутентификация и отдельное хранилище — текущий сервер демонстрационный/разработческий, а не готовая к массовому трафику инфраструктура.

### Подключение GitHub Pages к серверу

1. Размести API на своём сервере по HTTPS, например https://ai.example.com.
2. Разреши адрес GitHub Pages в ALLOW_ORIGINS.
3. В интерфейсе сайта вставь адрес API в поле «Адрес своего ИИ-сервера».
4. Открой https://ai.example.com/api/health: ai_available=true означает, что CUDA видна. Результаты генерации лучше проверить отдельно на реальном GPU.

### Входные параметры

POST /api/generate с JSON:

~~~json
{
  "prompt": "Рыжий лис с зелёным шарфом и рогаткой",
  "style": "16bit",
  "view": "side",
  "facing": "right",
  "size": 64,
  "frames": 8,
  "action": "run",
  "engine": "ai",
  "reference": null
}
~~~

Поле engine может быть "ai" или "demo". Сервис возвращает data URL для PNG, GIF, ZIP и JSON. Допустимые направления: right, left, up, down, all4, all8.

## Структура

- index.html — автономный интерфейс GitHub Pages.
- backend/app.py — API FastAPI, генерация, удаление фона, сборка спрайтов.
- backend/requirements.txt — легковесные зависимости для демо.
- backend/requirements-ai.txt — зависимости для запуска открытых моделей.
- backend/Dockerfile — NVIDIA CUDA-контейнер.
- backend/test_demo.py — проверка основных экспортов.

## Лицензии

Код собственных компонентов проекта можно использовать отдельно; права на веса, выходные изображения и материалы третьих лиц зависят от лицензий соответствующих моделей и исходных материалов. Проект не переносит чужой исходный код, логотипы или текстовые материалы SpriteGen.ai.
