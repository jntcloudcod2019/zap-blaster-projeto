# Zap Blaster

Um bot de WhatsApp que consome mensagens de uma fila RabbitMQ e as envia automaticamente.

## 🚀 Funcionalidades

- ✅ Conexão com WhatsApp Web via whatsapp-web.js
- ✅ Consumo de mensagens de fila RabbitMQ
- ✅ Envio automático de mensagens
- ✅ **QR Code com expiração de 3 minutos**
- ✅ **Templates de mensagem flexíveis**
- ✅ **Suporte a múltiplos formatos de payload**
- ✅ Validação de números de telefone
- ✅ Tratamento de erros robusto
- ✅ Reconexão automática
- ✅ Graceful shutdown

## 📋 Pré-requisitos

- Node.js 18+ 
- NPM ou Yarn
- Conta do WhatsApp
- Acesso ao RabbitMQ

## 🛠️ Instalação

1. **Clone o repositório:**
```bash
git clone <seu-repositorio>
cd zap-blaster-projeto
```

2. **Instale as dependências:**
```bash
npm install
```

3. **Configure as variáveis de ambiente:**
Crie um arquivo `.env` baseado no exemplo abaixo:

```env
# Configurações do Zap Blaster
INSTANCE_ID=zap-prod

# Configurações do RabbitMQ
RABBITMQ_HOST=mouse.rmq5.cloudamqp.com
RABBITMQ_PORT=5672
RABBITMQ_USER=ewxcrhtv
RABBITMQ_PASS=DNcdH0NEeP4Fsgo2_w-vd47CqjelFk_S
RABBITMQ_VHOST=ewxcrhtv
RABBITMQ_QUEUE=sqs-send-Credentials
```

## 🚀 Uso

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm start
```

### Testes
```bash
# Teste de conexão com RabbitMQ
npm test

# Teste de envio de mensagem simples
npm run test-send

# Teste de templates de mensagem
npm run test-template
```

## 📱 Primeira Execução

1. Execute o comando de inicialização
2. Escaneie o QR Code que aparecerá no terminal
3. Aguarde a conexão com o WhatsApp
4. O bot começará a consumir mensagens da fila

## 📦 Formatos de Mensagem Suportados

### 1. Mensagem Simples
```json
{
  "phone": "5511999999999",
  "message": "Olá! Esta é uma mensagem de teste."
}
```

### 2. Template com Dados
```json
{
  "phone": "5511999999999",
  "template": "Olá {{UserName}}! Seu nickname é {{NickName}} e sua senha é {{Password}}.",
  "data": {
    "UserName": "João Silva",
    "NickName": "joao123",
    "Password": "senha123"
  }
}
```

### 3. Formato C# Style
```json
{
  "Phone": "5511999999999",
  "UserName": "Maria Santos",
  "NickName": "maria456",
  "Password": "senha456",
  "template": "Dados do usuário:\nNome: {{UserName}}\nNickname: {{NickName}}\nSenha: {{Password}}"
}
```

### 4. JSON Direto
```json
{
  "phone": "5511999999999",
  "message": {
    "type": "notification",
    "content": "Sua mensagem aqui"
  }
}
```

### Variáveis Disponíveis

**Variáveis Básicas:**
- `{{UserName}}` - Nome do usuário
- `{{NickName}}` - Nickname do usuário
- `{{Password}}` - Senha do usuário
- `{{Phone}}` - Número de telefone
- `{{Email}}` - Email do usuário
- `{{Id}}` - ID do usuário

**Variáveis Especiais:**
- `{{currentDate}}` - Data atual (DD/MM/YYYY)
- `{{currentTime}}` - Hora atual (HH:MM:SS)
- `{{timestamp}}` - Timestamp ISO
- `{{instanceId}}` - ID da instância do bot

## 🔧 Configurações

### Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `INSTANCE_ID` | ID da instância do bot | `zap-prod` |
| `RABBITMQ_HOST` | Host do RabbitMQ | `mouse.rmq5.cloudamqp.com` |
| `RABBITMQ_PORT` | Porta do RabbitMQ | `5672` |
| `RABBITMQ_USER` | Usuário do RabbitMQ | `ewxcrhtv` |
| `RABBITMQ_PASS` | Senha do RabbitMQ | `DNcdH0NEeP4Fsgo2_w-vd47CqjelFk_S` |
| `RABBITMQ_VHOST` | VHost do RabbitMQ | `ewxcrhtv` |
| `RABBITMQ_QUEUE` | Nome da fila | `sqs-send-Credentials` |

## 🐳 Docker

Para executar com Docker:

```bash
docker build -t zap-blaster .
docker run -it --rm zap-blaster
```

## 📊 Logs

O bot gera logs detalhados com emojis para facilitar o monitoramento:

- 🚀 Inicialização
- 📱 QR Code para escaneamento
- ✅ Conexão estabelecida
- 📤 Envio de mensagens
- ❌ Erros e falhas
- 🔌 Reconexões

## 🔒 Segurança

- As credenciais do RabbitMQ devem ser mantidas seguras
- Use variáveis de ambiente para configurações sensíveis
- O bot não envia mensagens para o próprio número
- Validação de números de telefone implementada

## 🐛 Solução de Problemas

### Erro de Conexão com RabbitMQ
- Verifique as credenciais no arquivo `.env`
- Confirme se o RabbitMQ está acessível
- Verifique se a fila existe

### Falha na Autenticação do WhatsApp
- Escaneie o QR Code novamente
- Verifique se o WhatsApp Web está funcionando
- Aguarde alguns minutos e tente novamente

### Mensagens não sendo enviadas
- Verifique se o número está no formato correto
- Confirme se o chat existe no WhatsApp
- Verifique os logs para detalhes do erro

## 📝 Licença

Este projeto é de uso interno. Não distribua sem autorização.

## 🤝 Contribuição

Para contribuir com o projeto:

1. Faça um fork
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📞 Suporte

Para suporte técnico, entre em contato com a equipe de desenvolvimento. 