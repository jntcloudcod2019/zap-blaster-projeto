#!/bin/bash

# Script de inicialização do Zap Blaster
echo "🚀 Iniciando Zap Blaster..."

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Instale o Node.js 18+ primeiro."
    exit 1
fi

# Verificar se o npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ NPM não encontrado. Instale o NPM primeiro."
    exit 1
fi

# Verificar se as dependências estão instaladas
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
fi

# Verificar se o arquivo .env existe
if [ ! -f ".env" ]; then
    echo "⚠️ Arquivo .env não encontrado."
    echo "📝 Criando arquivo .env com configurações padrão..."
    cat > .env << EOF
# Configurações do Zap Blaster
INSTANCE_ID=zap-prod

# Configurações do RabbitMQ
RABBITMQ_HOST=mouse.rmq5.cloudamqp.com
RABBITMQ_PORT=5672
RABBITMQ_USER=ewxcrhtv
RABBITMQ_PASS=DNcdH0NEeP4Fsgo2_w-vd47CqjelFk_S
RABBITMQ_VHOST=ewxcrhtv
RABBITMQ_QUEUE=sqs-send-Credentials
EOF
    echo "✅ Arquivo .env criado com configurações padrão."
fi

# Testar conexão com RabbitMQ
echo "🧪 Testando conexão com RabbitMQ..."
if npm test > /dev/null 2>&1; then
    echo "✅ Conexão com RabbitMQ OK!"
else
    echo "❌ Falha na conexão com RabbitMQ."
    echo "🔧 Verifique as configurações no arquivo .env"
    exit 1
fi

# Perguntar se quer executar em modo desenvolvimento
echo ""
echo "🎯 Escolha o modo de execução:"
echo "1) Desenvolvimento (com nodemon)"
echo "2) Produção"
read -p "Digite sua escolha (1 ou 2): " choice

case $choice in
    1)
        echo "🔄 Iniciando em modo desenvolvimento..."
        NODE_ENV=development npm run dev
        ;;
    2)
        echo "🚀 Iniciando em modo produção..."
        NODE_ENV=production npm start
        ;;
    *)
        echo "❌ Opção inválida. Saindo..."
        exit 1
        ;;
esac 