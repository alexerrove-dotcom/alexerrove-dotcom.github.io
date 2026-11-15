# Запуск собственного SpriteForge AI на бесплатном Hugging Face ZeroGPU

Автоматизация на GitHub уже подготовлена. GitHub сам создаст Space под твоим Hugging Face логином, загрузит открытые ИИ-модели и автоматически подключит адрес Space к опубликованному сайту.

## Что нужно сделать владельцу

1. Зарегистрироваться на https://huggingface.co/join или войти в уже существующий аккаунт Hugging Face, подтвердить почту. Бесплатный ZeroGPU для своих Space доступен только подходящим аккаунтам с подтверждённой почтой и возрастом более 30 дней.
2. Создать Hugging Face access token на https://huggingface.co/settings/tokens с правом записи (Write). Рекомендуется fine-grained token с минимальными разрешениями; для первичного создания Space может потребоваться соответствующий write-доступ. Не публикуй токен в чате или открытом коде.
3. На GitHub открыть https://github.com/alexerrove-dotcom/alexerrove-dotcom.github.io/settings/secrets/actions → New repository secret. Name: HF_TOKEN. Secret: созданный токен.
4. Открыть https://github.com/alexerrove-dotcom/alexerrove-dotcom.github.io/actions/workflows/spriteforge-hf-space.yml → Run workflow → Run workflow.

Дальше автоматизация сама:
- определит логин Hugging Face по токену;
- создаст публичный Gradio Space с именем spriteforge-ru;
- загрузит исходники и создаст запрос на бесплатное оборудование zero-a10g;
- запишет адрес вида ЛОГИН/spriteforge-ru в spriteforge/config.json;
- GitHub Pages автоматически предложит подключённый Space при открытии https://alexerrove-dotcom.github.io/spriteforge/.

Проверь, что в Actions статус success, а в Hugging Face у Space статус Running. Без успешного запуска Space на GPU нейросетевая генерация не работает, даже если код размещён.

## Ограничения

ZeroGPU для владельцев доступен только подходящим учётным записям. Бесплатная квота ограничена и генерация 8 направлений может исчерпать её. Код использует предобученные открытые модели, но качество изображения и согласованность персонажа между кадрами НЕ гарантируются на уровне SpriteGen.ai.

Если аккаунт ещё не подходит под ZeroGPU, автоматизация завершится ошибкой, не создавая платный GPU-сервер. Платный сервер можно развернуть позже, после отдельного согласования стоимости.

В Space размещается публичный API. Не загружай секретные данные или личные фотографии.
