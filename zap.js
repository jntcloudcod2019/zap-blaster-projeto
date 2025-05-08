// zap.js - Versão final usando whatsapp-web.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const amqp = require('amqplib');
const qrcode = require('qrcode-terminal');
require('dotenv').config();

const instanceId = process.env.INSTANCE_ID || 'zap-prod';
const sessionPath = `/app/session/${instanceId}`;

const rabbitConfig = {
  protocol: 'amqp',
  hostname: 'mouse.rmq5.cloudamqp.com',
  port: 5672,
  username: 'ewxcrhtv',
  password: 'DNcdH0NEeP4Fsgo2_w-vd47CqjelFk_S',
  vhost: 'ewxcrhtv'
};

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: sessionPath }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

const QRCode = require('qrcode'); // novo pacote

client.on('qr', async (qr) => {
  console.log('📱 ESCANEIE O QR CODE NO TERMINAL:\n');
  qrcode.generate(qr, { small: true });

  const url = await QRCode.toDataURL(qr);
  console.log('\n🔗 QR como imagem base64:\n');
  console.log(url);
  console.log('\n👉 Acesse https://goqr.me e cole o conteúdo acima para escanear.');
});

client.on('ready', async () => {
  console.log('✅ Cliente WhatsApp conectado!');
  await startQueueConsumer(client);
});

client.on('auth_failure', () => {
  console.error('❌ Falha de autenticação. Escaneie o QR novamente.');
});

client.on('disconnected', (reason) => {
  console.log('🔌 Cliente desconectado:', reason);
});

async function sendOne(client, number, messageText) {
  const ownNumber = client.info?.wid?.user;

  if (!ownNumber || number === ownNumber || number === `+${ownNumber}`) {
    console.log(`⚠️ Ignorando envio para o próprio número (${number}).`);
    return;
  }

  try {
    console.log(`📤 Enviando mensagem para ${number}...`);
    await client.sendMessage(`${number}@c.us`, messageText);
    console.log(`✅ Mensagem enviada para ${number}`);
  } catch (err) {
    console.error(`❌ Erro ao enviar para ${number}:`, err.message);
  }
}

async function startQueueConsumer(client) {
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

          await sendOne(client, payload.phone, payload.message);
          channel.ack(msg);
        } catch (error) {
          console.error('❌ Erro ao processar mensagem:', error.message);
          channel.nack(msg, false, false);
        }
      }
    });
  } catch (err) {
    console.error('❌ Erro ao conectar ao RabbitMQ:', err.message);
  }
}

client.initialize();
