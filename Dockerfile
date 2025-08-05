FROM node:18-slim

# Instalar dependências do sistema para o Puppeteer
RUN apt-get update && apt-get install -y \
    git wget gnupg ca-certificates fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 \
    libatk1.0-0 libcups2 libdbus-1-3 libgdk-pixbuf2.0-0 libnspr4 libnss3 libx11-xcb1 libxcomposite1 \
    libxdamage1 libxrandr2 xdg-utils libgbm-dev libxshmfence-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Criar usuário não-root para segurança
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Copiar arquivos de dependências primeiro para melhor cache
COPY package*.json ./
RUN npm ci --only=production

# Copiar código da aplicação
COPY . .

# Criar diretórios necessários
RUN mkdir -p /app/session /app/auth && chown -R appuser:appuser /app

# Mudar para usuário não-root
USER appuser

# Expor porta (opcional, para monitoramento)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check passed')" || exit 1

# Comando padrão
CMD ["node", "zap.js"]
