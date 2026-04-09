FROM python:3.10-slim

WORKDIR /app

COPY data-pipeline/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY data-pipeline/ /app/

CMD ["python", "fetchers/Collect_RealTime.py"]