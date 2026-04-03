# ─── Stage 1: Install dependencies ───
FROM python:3.11-slim AS deps
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --target=/install -r requirements.txt

# ─── Stage 2: Run ───
FROM python:3.11-slim
WORKDIR /app

# Create non-root user
RUN useradd --create-home appuser

COPY --from=deps /install /usr/local/lib/python3.11/site-packages
COPY . .

USER appuser

EXPOSE 8000
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
