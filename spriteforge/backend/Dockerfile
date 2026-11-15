FROM nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04
ENV DEBIAN_FRONTEND=noninteractive PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
RUN apt-get update && apt-get install -y python3 python3-pip libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY backend/requirements-ai.txt backend/requirements.txt /app/
RUN python3 -m pip install --upgrade pip && python3 -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124 && python3 -m pip install -r requirements-ai.txt
COPY index.html /app/index.html
COPY backend/app.py /app/backend/app.py
ENV ALLOW_ORIGINS=https://alexerrove-dotcom.github.io,http://localhost:8000
EXPOSE 8000
CMD ["python3","-m","uvicorn","backend.app:app","--host","0.0.0.0","--port","8000"]
