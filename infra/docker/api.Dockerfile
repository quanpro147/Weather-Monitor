FROM python:3.12-slim

WORKDIR /app

# Install deps first (layer cache — only re-runs when requirements.txt changes)
COPY services/api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY services/api/ /app/services/api/

ENV PYTHONPATH=/app

# Run as non-root
RUN adduser --disabled-password --gecos "" appuser
USER appuser

EXPOSE 8000

CMD ["uvicorn", "services.api.main:app", "--host", "0.0.0.0", "--port", "8000"]

