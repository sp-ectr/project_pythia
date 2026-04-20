FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app
COPY pyproject.toml .
RUN uv pip install --system .
COPY . .
EXPOSE 8000
CMD ["uvicorn", "project_pythia.app.main:app", "--host", "0.0.0.0", "--port", "8000"]