# Бесплатное развёртывание SpriteForge AI на Hugging Face ZeroGPU

1. Создай учётную запись на https://huggingface.co/join, если её ещё нет, и подтверди почту. Для бесплатного ZeroGPU аккаунт должен существовать более 30 дней и иметь хорошую репутацию.
2. На https://huggingface.co/new-space создай Space под названием spriteforge-ru, выбери SDK Gradio и оборудование ZeroGPU, если доступно. Не выбирай платные GPU без проверки стоимости.
3. На https://huggingface.co/settings/tokens создай ограниченный токен с правом записи только в этот Space. Не вставляй токен в чат или сайт.
4. На GitHub в репозитории alexerrove-dotcom/alexerrove-dotcom.github.io открой Settings → Secrets and variables → Actions → New repository secret, создай HF_TOKEN и вставь токен.
5. В GitHub Actions → Deploy SpriteForge to Hugging Face ZeroGPU → Run workflow укажи полное имя Space: твой-логин/spriteforge-ru.
6. Синхронизация перенесёт файлы в Hugging Face. В Space дождись Running и проверь API.
7. Открой https://alexerrove-dotcom.github.io/spriteforge/ и в поле «Адрес своего ИИ-сервера» введи твой-логин/spriteforge-ru. Выбери «Настоящий ИИ».

В бесплатном ZeroGPU действует квота. Размещение собственных публичных Gradio Space на ZeroGPU бесплатно только для подходящих аккаунтов. ИИ может не завершить запрос в установленное время; для этого потребуется оптимизация модели или платный GPU.

Публичный Space и API доступны другим пользователям. Не загружай личные фотографии или секреты.

Альтернативный Dockerfile в spriteforge/backend/Dockerfile позволяет арендовать постоянный GPU и запустить FastAPI.
