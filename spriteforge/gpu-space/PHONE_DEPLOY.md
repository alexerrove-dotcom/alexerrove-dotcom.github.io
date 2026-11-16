# Запуск SpriteForge GPU только со смартфона

Вся разработка, исходники, мобильный интерфейс и заявка на видеокарту уже находятся в GitHub.

## Нужны только действия владельца аккаунта

1. На телефоне войди на https://huggingface.co/join (если аккаунта нет) или https://huggingface.co/login. Нельзя зарегистрироваться за тебя без твоего согласия.
2. Открой https://huggingface.co/settings/tokens и создай токен с правом **write** (для отдельного репозитория Space). **Не отправляй этот токен в чат.**
3. Открой GitHub: https://github.com/alexerrove-dotcom/alexerrove-dotcom.github.io/settings/secrets/actions/new — создай секрет **HF_TOKEN** и вставь туда токен.
4. Открой https://github.com/alexerrove-dotcom/alexerrove-dotcom.github.io/actions/workflows/deploy-spriteforge-gpu.yml — нажми **Run workflow**. GitHub сам создаст для тебя бесплатный статический Space `spriteforge-gpu` и загрузит подготовленный код. Терминал или ПК не нужны.
5. В новом Space на Hugging Face зайди в **Settings → Hardware → Community GPU Grant**, вставь текст из [GPU_GRANT_REQUEST.md](GPU_GRANT_REQUEST.md) и отправь заявку. Hugging Face самостоятельно решает, выдавать ли GPU.
6. Если грант одобрят, выбери выделенную GPU-видеокарту в Space, вернись на страницу GitHub Actions и снова нажми **Run workflow**. Он автоматически заменит статическую страницу на рабочий Gradio-генератор.

**Важно:** без одобренной видеокарты нельзя честно обещать рабочую нейросеть без лимита GPU. Посетителям сервиса не понадобятся аккаунты Hugging Face или загрузки моделей.

**Проверки:** подготовлены CPU-тесты спрайт-листов, синтаксическая компиляция Python и автоматическая установка на Space. Выделенный GPU и качество 8 нейросетевых кадров еще не испытаны.

[Основной сайт SpriteForge](https://alexerrove-dotcom.github.io/spriteforge/) · [Все исходники сервера](https://github.com/alexerrove-dotcom/alexerrove-dotcom.github.io/tree/main/spriteforge/gpu-space)
