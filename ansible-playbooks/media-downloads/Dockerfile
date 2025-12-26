FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY mnemosyne-bot.py .

# Run as non-root user
RUN useradd -m -u 1000 appuser
USER appuser

# Health check - simple Python check for Discord bot
HEALTHCHECK --interval=60s --timeout=10s --start-period=10s --retries=3 \
    CMD python -c "import sys; sys.exit(0)"

CMD ["python", "-u", "mnemosyne-bot.py"]
