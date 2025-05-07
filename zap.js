const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys'); 
const amqp = require('amqplib');
const fs = require('fs');
require('dotenv').config();

const instanceId = process.env.INSTANCE_ID || 'zap-instance';
const authFolder = `./auth/${instanceId}`;
fs.mkdirSync(authFolder, { recursive: true });

const rabbitConfig = {
  protocol: 'amqp',
  hostname: 'mouse.rmq5.cloudamqp.com',
  port: 5672,
  username: 'ewxcrhtv',
  password: 'DNcdH0NEeP4Fsgo2_w-vd47CqjelFk_S',
  vhost: 'ewxcrhtv'
};

async function connectToWhatsApp() {
  console.log('🚀 Iniciando conexão com o WhatsApp...');

  const { state, saveCreds } = await useMultiFileAuthState(authFolder);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on('creds.update', async () => {
    console.log('💾 Credenciais atualizadas e salvas.');
    await saveCreds();
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('📱 ESCANEIE O QR CODE NO TERMINAL:');
      console.log('\n========================================\n');
      console.log(qr);
      console.log('\n========================================\n');
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('🔌 Conexão encerrada. Reconnect?', shouldReconnect);
      if (shouldReconnect) connectToWhatsApp();
    } else if (connection === 'open') {
      const userId = sock.user?.id?.split('@')[0];
      console.log(`📱 Número conectado no bot: ${userId}`);
      console.log(`✅ Sessão ${instanceId} conectada!`);
      await startQueueConsumer(sock);
    }
  });

  sock.ev.on('connection.error', (err) => {
    console.error('❌ Erro de conexão com WhatsApp:', err);
  });
}

async function sendOne(sock, number, messageText) {
  const jid = `${number}@s.whatsapp.net`;
  const ownNumber = sock.user?.id?.split('@')[0];

  if (number === ownNumber || number === `+${ownNumber}`) {
    console.log(`⚠️ Ignorando envio para o próprio número (${number}).`);
    return;
  }

  try {
    console.log(`📤 Enviando mensagem para ${number}...`);
    await sock.sendMessage(jid, { text: messageText });
    console.log(`✅ Mensagem enviada para ${number}`);
  } catch (err) {
    console.error(`❌ Erro ao enviar para ${number}:`, err.message);
  }
}

async function startQueueConsumer(sock) {
  try {
    console.log('🔌 Conectando ao RabbitMQ...');

    const connection = await amqp.connect(rabbitConfig);
    const channel = await connection.createChannel();

    const queue = 'sqs-send-Credentials';
    await channel.assertQueue(queue, { durable: true });

    console.log(`🎧 Aguardando mensagens na fila: ${queue}...`);

    channel.consume(queue, async (msg) => {
      if (msg !== null) {
        try {
          const payload = JSON.parse(msg.content.toString());
          console.log('📦 Mensagem recebida da fila:', payload);

          await sendOne(sock, payload.phone, payload.message);
          channel.ack(msg);
        } catch (error) {
          console.error('❌ Erro ao processar mensagem:', error.message);
          channel.nack(msg, false, false); // rejeita e descarta
        }
      }
    });
  } catch (err) {
    console.error('❌ Erro ao conectar ao RabbitMQ:', err.message);
  }
}

// Inicializa o app
connectToWhatsApp();
