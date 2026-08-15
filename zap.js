// zap.js - Versão final usando whatsapp-web.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const amqp = require('amqplib');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const instanceId = process.env.INSTANCE_ID || 'zap-prod';

// Caminho da sessão que funciona tanto localmente quanto no Docker
const isDocker = process.env.NODE_ENV === 'production' || fs.existsSync('/.dockerenv');
const sessionPath = isDocker 
  ? `/app/session/${instanceId}`
  : path.join(process.cwd(), 'session', instanceId);

// Criar diretório de sessão se não existir
const sessionDir = path.dirname(sessionPath);
if (!fs.existsSync(sessionDir)) {
  try {
    fs.mkdirSync(sessionDir, { recursive: true });
    console.log(` Diretório de sessão criado: ${sessionDir}`);
  } catch (error) {
    console.error(` Erro ao criar diretório de sessão: ${error.message}`);
    // Fallback para diretório local
    const localSessionDir = path.join(process.cwd(), 'session', instanceId);
    fs.mkdirSync(path.dirname(localSessionDir), { recursive: true });
    console.log(` Usando diretório local: ${localSessionDir}`);
  }
}

const rabbitConfig = {
  protocol: 'amqp',
  hostname: process.env.RABBITMQ_HOST || 'mouse.rmq5.cloudamqp.com',
  port: parseInt(process.env.RABBITMQ_PORT) || 5672,
  username: process.env.RABBITMQ_USER || 'ewxcrhtv',
  password: process.env.RABBITMQ_PASS || 'DNcdH0NEeP4Fsgo2_w-vd47CqjelFk_S',
  vhost: process.env.RABBITMQ_VHOST || 'ewxcrhtv'
};

// Variáveis de controle de estado
let isConnected = false;
let isFullyValidated = false;
let connectedNumber = null;
let qrCodeTimer = null;
let qrCodeStartTime = null;
let validationTimer = null;
let messageQueue = [];
const QR_CODE_DURATION = 3 * 60 * 1000; // 3 minutos em millisegundos
const VALIDATION_DELAY = 10000; // 10 segundos para validação completa

// Função para limpar timer do QR Code
function clearQRCodeTimer() {
  if (qrCodeTimer) {
    clearTimeout(qrCodeTimer);
    qrCodeTimer = null;
  }
}

// Função para limpar timer de validação
function clearValidationTimer() {
  if (validationTimer) {
    clearTimeout(validationTimer);
    validationTimer = null;
  }
}

// Função para verificar se já existe uma sessão conectada
function checkExistingSession() {
  const sessionDir = path.join(sessionPath, 'session-zap-prod');
  return fs.existsSync(sessionDir);
}

// Função para validar conexão completamente
async function validateConnection() {
  try {
    console.log(' Validando conexão...');
    
    // Verificar se o cliente está realmente conectado
    if (!client.info || !client.info.wid) {
      console.log(' Cliente não tem informações válidas');
      return false;
    }

    // Verificar se o número está disponível
    const number = client.info.wid.user;
    if (!number) {
      console.log(' Número não disponível');
      return false;
    }

    // Testar uma operação simples para verificar se está funcionando
    try {
      // Testar obtenção de chats
      const chats = await client.getChats();
      if (!chats || chats.length === 0) {
        console.log(' Nenhum chat encontrado - pode indicar problema de conexão');
      }
      
      // Testar uma operação de envio simples (sem enviar)
      try {
        const testChat = chats && chats.length > 0 ? chats[0] : null;
        if (testChat) {
          // Verificar se conseguimos acessar propriedades do chat
          const chatId = testChat.id;
          if (!chatId) {
            console.log(' Chat sem ID válido');
          }
        }
      } catch (testError) {
        console.log(' Erro ao testar operações de chat:', testError.message);
      }
      
      console.log(' Conexão validada com sucesso!');
      return true;
    } catch (error) {
      console.log(' Erro ao validar conexão:', error.message);
      return false;
    }
  } catch (error) {
    console.log(' Erro durante validação:', error.message);
    return false;
  }
}

// Função para processar fila de mensagens pendentes
async function processMessageQueue() {
  if (messageQueue.length === 0) return;
  
  console.log(` Processando ${messageQueue.length} mensagens pendentes...`);
  
  for (const queuedMessage of messageQueue) {
    try {
      const result = await sendOne(client, queuedMessage.phone, queuedMessage.messageData);
      
      if (result.success) {
        console.log(` Mensagem pendente enviada para ${queuedMessage.phone}`);
      } else {
        console.log(` Falha ao enviar mensagem pendente para ${queuedMessage.phone}: ${result.reason}`);
      }
    } catch (error) {
      console.error(` Erro ao processar mensagem pendente: ${error.message}`);
    }
  }
  
  messageQueue = [];
  console.log(' Fila de mensagens processada');
}

// Função para mostrar status da conexão
function showConnectionStatus() {
  if (isConnected && isFullyValidated && connectedNumber) {
    console.log(`\n STATUS: CONECTADO E VALIDADO`);
    console.log(` Número conectado: ${connectedNumber}`);
    console.log(` Instância: ${instanceId}`);
    console.log(` Conectado desde: ${new Date().toLocaleString('pt-BR')}`);
    console.log(` Pronto para receber mensagens da fila\n`);
  } else if (isConnected && !isFullyValidated) {
    console.log(`\n STATUS: CONECTADO - VALIDANDO`);
    console.log(` Número conectado: ${connectedNumber || 'N/A'}`);
    console.log(` Aguardando validação completa...\n`);
  } else {
    console.log(`\n STATUS: DESCONECTADO`);
    console.log(` Aguardando conexão do WhatsApp\n`);
  }
}

// Configuração melhorada do cliente WhatsApp
const client = new Client({
  authStrategy: new LocalAuth({ 
    dataPath: sessionPath,
    clientId: instanceId
  }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection'
    ]
  },
  webVersion: '2.2402.5',
  webVersionCache: {
    type: 'local'
  }
});

const QRCode = require('qrcode');

// Função para processar templates de mensagem
function processMessageTemplate(template, data) {
  if (typeof template !== 'string') {
    return JSON.stringify(template);
  }

  let processedMessage = template;

  // Substituir variáveis do template
  if (data) {
    // Substituir variáveis básicas
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'gi');
      processedMessage = processedMessage.replace(regex, data[key] || '');
    });

    // Substituir variáveis especiais
    processedMessage = processedMessage
      .replace(/{{currentDate}}/gi, new Date().toLocaleDateString('pt-BR'))
      .replace(/{{currentTime}}/gi, new Date().toLocaleTimeString('pt-BR'))
      .replace(/{{timestamp}}/gi, new Date().toISOString())
      .replace(/{{instanceId}}/gi, instanceId)
      .replace(/{{senderNumber}}/gi, connectedNumber || 'N/A');
  }

  return processedMessage;
}

// Melhor tratamento de eventos
client.on('qr', async (qr) => {
  // Só gerar QR code se não estiver conectado
  if (isConnected) {
    console.log(' QR Code ignorado - já existe uma sessão conectada');
    return;
  }

  clearQRCodeTimer();
  
  console.log(' ESCANEIE O QR CODE NO TERMINAL:');
  console.log(' QR Code válido por 3 minutos\n');
  
  qrcode.generate(qr, { small: true });

  try {
  const url = await QRCode.toDataURL(qr);
  console.log('\n QR como imagem base64:\n');
  console.log(url);
  console.log('\n Acesse https://goqr.me e cole o conteúdo acima para escanear.');
    
    // Timer para expirar o QR Code
    qrCodeStartTime = Date.now();
    qrCodeTimer = setTimeout(() => {
      if (!isConnected) {
        console.log('\n QR Code expirado! Reinicie o bot para gerar um novo.');
      }
    }, QR_CODE_DURATION);
    
  } catch (error) {
    console.error(' Erro ao gerar QR code:', error.message);
  }
});

client.on('ready', async () => {
  clearQRCodeTimer();
  isConnected = true;
  connectedNumber = client.info?.wid?.user || 'N/A';
  isFullyValidated = false;
  
  console.log('Cliente WhatsApp conectado!');
  showConnectionStatus();
  
  // Aguardar um tempo antes de validar para evitar problemas de sincronização
  console.log(' Aguardando estabilização da conexão...');
  
  validationTimer = setTimeout(async () => {
    const isValid = await validateConnection();
    
    if (isValid) {
      isFullyValidated = true;
      showConnectionStatus();
      
      // Processar mensagens pendentes
      await processMessageQueue();
      
      // Iniciar consumidor da fila
  await startQueueConsumer(client);
    } else {
      console.log(' Falha na validação - tentando novamente em 30 segundos...');
      isConnected = false;
      connectedNumber = null;
      showConnectionStatus();
    }
  }, VALIDATION_DELAY);
});

client.on('auth_failure', (msg) => {
  clearQRCodeTimer();
  clearValidationTimer();
  isConnected = false;
  isFullyValidated = false;
  connectedNumber = null;
  console.error(' Falha de autenticação:', msg);
  console.log(' Tente escanear o QR code novamente.');
  showConnectionStatus();
});

client.on('disconnected', (reason) => {
  clearQRCodeTimer();
  clearValidationTimer();
  isConnected = false;
  isFullyValidated = false;
  connectedNumber = null;
  console.log(' Cliente desconectado:', reason);
  console.log(' Tentando reconectar...');
  showConnectionStatus();
});

client.on('loading_screen', (percent, message) => {
  console.log(` Carregando: ${percent}% - ${message}`);
});

// Função melhorada para envio de mensagens com templates
async function sendOne(client, number, messageData) {
  // Verificar se está completamente validado
  if (!isFullyValidated) {
    console.log(` Mensagem para ${number} adicionada à fila - aguardando validação`);
    messageQueue.push({ phone: number, messageData });
    return { success: false, reason: 'waiting_validation' };
  }

  const ownNumber = client.info?.wid?.user;

  if (!ownNumber || number === ownNumber || number === `+${ownNumber}`) {
    console.log(` Ignorando envio para o próprio número (${number}).`);
    return { success: false, reason: 'own_number' };
  }

  // Validação do número
  const cleanNumber = number.replace(/\D/g, '');
  if (cleanNumber.length < 10) {
    console.log(` Número inválido: ${number}`);
    return { success: false, reason: 'invalid_number' };
  }

  try {
    console.log(` Enviando mensagem para ${number}...`);
    console.log(` Remetente: ${connectedNumber || 'N/A'}`);
    
    const chatId = `${cleanNumber}@c.us`;
    
    // Verifica se o chat existe
    let chat;
    try {
      chat = await client.getChatById(chatId);
      if (!chat) {
        console.log(` Chat não encontrado para ${number}`);
        return { success: false, reason: 'chat_not_found' };
      }
    } catch (chatError) {
      console.log(` Erro ao verificar chat para ${number}: ${chatError.message}`);
      // Tentar enviar mesmo assim
    }

    // Processar template de mensagem
    let finalMessage;
    
    if (typeof messageData === 'string') {
      // Mensagem simples
      finalMessage = messageData;
    } else if (messageData.template) {
      // Template com dados
      finalMessage = processMessageTemplate(messageData.template, messageData.data);
    } else if (messageData.message) {
      // Mensagem com dados adicionais
      finalMessage = processMessageTemplate(messageData.message, messageData);
    } else {
      console.log(` Formato de mensagem inválido para ${number}`);
      return { success: false, reason: 'invalid_message_format' };
    }

    // Validar se a mensagem não está vazia
    if (!finalMessage || finalMessage.trim() === '') {
      console.log(` Mensagem vazia para ${number}`);
      return { success: false, reason: 'empty_message' };
    }

    // Tentar enviar a mensagem com retry
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        // Usar método mais seguro para envio
        const message = await client.sendMessage(chatId, finalMessage);
        
        if (message && message.id) {
          console.log(` Mensagem enviada para ${number}`);
          console.log(`Conteúdo: ${finalMessage.substring(0, 100)}${finalMessage.length > 100 ? '...' : ''}`);
          return { success: true, messageId: message.id };
        } else {
          throw new Error('Mensagem não foi enviada corretamente');
        }
      } catch (sendError) {
        retryCount++;
        console.log(` Tentativa ${retryCount} falhou para ${number}: ${sendError.message}`);
        
        if (retryCount >= maxRetries) {
          console.error(` Todas as tentativas falharam para ${number}`);
          return { success: false, reason: sendError.message };
        }
        
        // Aguardar antes da próxima tentativa
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
  } catch (err) {
    console.error(` Erro ao enviar para ${number}:`, err.message);
    return { success: false, reason: err.message };
  }
}

// Função melhorada para consumidor da fila
async function startQueueConsumer(client) {
  let connection, channel;
  
  try {
    console.log(' Conectando ao RabbitMQ...');
    console.log(` Host: ${rabbitConfig.hostname}:${rabbitConfig.port}`);

    connection = await amqp.connect(rabbitConfig);
    channel = await connection.createChannel();

    const queue = process.env.RABBITMQ_QUEUE || 'sqs-send-Credentials';
    await channel.assertQueue(queue, { durable: true });

    console.log(` Aguardando mensagens na fila: ${queue}...`);

    channel.consume(queue, async (msg) => {
      if (msg !== null) {
        try {
          const payload = JSON.parse(msg.content.toString());
          console.log(' Mensagem recebida da fila:', payload);

          // Validação do payload
          if (!payload.phone && !payload.Phone) {
            console.error(' Payload inválido: número não encontrado', payload);
            channel.nack(msg, false, false);
            return;
          }

          // Suportar diferentes formatos de payload
          const phone = payload.phone || payload.Phone;
          const messageData = {
            message: payload.message || payload.Message,
            template: payload.template || payload.Template,
            data: payload.data || payload.Data || payload
          };

          const result = await sendOne(client, phone, messageData);
          
          if (result.success) {
          channel.ack(msg);
            console.log(` Mensagem processada com sucesso para ${phone}`);
          } else if (result.reason === 'waiting_validation') {
            // Não fazer ack nem nack - aguardar validação
            console.log(` Mensagem para ${phone} aguardando validação`);
          } else {
            console.log(` Falha no envio para ${phone}: ${result.reason}`);
            channel.nack(msg, false, false);
          }
        } catch (error) {
          console.error(' Erro ao processar mensagem:', error.message);
          channel.nack(msg, false, false);
        }
      }
    });

    // Tratamento de desconexão
    connection.on('close', () => {
      console.log(' Conexão RabbitMQ fechada');
      setTimeout(() => startQueueConsumer(client), 5000);
    });

    connection.on('error', (err) => {
      console.error(' Erro na conexão RabbitMQ:', err.message);
    });

  } catch (err) {
    console.error(' Erro ao conectar ao RabbitMQ:', err.message);
    console.log(' Tentando reconectar em 10 segundos...');
    setTimeout(() => startQueueConsumer(client), 10000);
  }
}

// Tratamento de sinais para graceful shutdown
process.on('SIGINT', async () => {
  clearQRCodeTimer();
  clearValidationTimer();
  console.log('\n Recebido SIGINT, encerrando...');
  try {
    await client.destroy();
    console.log(' Cliente WhatsApp encerrado');
  } catch (error) {
    console.error('Erro ao encerrar cliente:', error.message);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  clearQRCodeTimer();
  clearValidationTimer();
  console.log('\n Recebido SIGTERM, encerrando...');
  try {
    await client.destroy();
    console.log(' Cliente WhatsApp encerrado');
  } catch (error) {
    console.error(' Erro ao encerrar cliente:', error.message);
  }
  process.exit(0);
});

// Inicialização do cliente
console.log('🚀 Iniciando Zap Blaster...');
console.log(`📁 Sessão: ${sessionPath}`);

// Verificar se já existe uma sessão conectada
if (checkExistingSession()) {
  console.log(' Sessão existente encontrada, tentando reconectar...');
} else {
  console.log(' Nenhuma sessão encontrada, será necessário escanear QR Code');
}

showConnectionStatus();
client.initialize();
