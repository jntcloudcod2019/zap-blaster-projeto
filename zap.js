/**
 * zap.js — disparo massivo Baileys com reconexão automática
 * Execução:   node zap.js         (produção)
 *             npx nodemon zap.js  (dev/hot-reload)
 */

const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pLimit = require('p-limit');
const fs = require('fs');
const path = require('path');

const AUTH_FOLDER   = 'auth';
const CONTACTS_FILE = 'numbers.json';

const MSG_DELAY_MS  = 4_000;  // intervalo entre mensagens (sequencial)
const MAX_PARALLEL  = 1;      // 1 = sequencial; >1 = paralelo
const RETRY_MIN_MS  = 5_000;  // back-off inicial
const RETRY_MAX_MS  = 60_000; // back-off máximo

const MESSAGE = `
Olá, tudo bem? 😊

Aqui é do setor de Tecnologia da Pregiato Management – Agência de Modelos. Estamos entrando em contato para dar andamento ao seu processo de agenciamento na nossa plataforma My Pregiato.

Para liberar o seu acesso exclusivo, precisamos confirmar algumas informações cadastrais. Por gentileza, envie os dados abaixo:

CPF
RG
E-mail
Data de nascimento
Telefone principal
Telefone secundário (opcional)
CEP
Endereço completo (rua, número, bairro, cidade e UF)

Assim que os dados forem enviados, você receberá no seu e-mail as credenciais de acesso à plataforma. Caso não localize na caixa de entrada, lembre-se de verificar a pasta de SPAM ou lixo eletrônico.

Estamos à disposição para qualquer dúvida, e desejamos muito sucesso nessa nova jornada com a gente. 💼✨

Equipe T.I – Pregiato Management
`.trim();

// --------------------------------------------------------------------
// 1. Cria cliente Baileys com reconexão
// --------------------------------------------------------------------
async function createClient(instanceId = 'default', attempt = 1) {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    browser: ['ZapBlast', 'Windows', '110'],
    syncFullHistory: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      console.log(`✅ Sessão ${instanceId} pronta!`);
      await sendBlast(sock);
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut  = statusCode === DisconnectReason.loggedOut;

      if (!loggedOut) {
        const nextDelay = Math.min(RETRY_MIN_MS * 2 ** (attempt - 1), RETRY_MAX_MS);
        console.warn(`⚠️  Conexão perdida (código ${statusCode || 'desconhecido'}).`
          + ` Tentando reconectar em ${nextDelay / 1000}s…`);
        setTimeout(() => createClient(instanceId, attempt + 1), nextDelay);
      } else {
        console.error('🛑 Sessão encerrada. Escaneie o QR Code novamente.');
      }
    }
  });

  sock.ev.on('connection.error', (err) =>
    console.error('❌ Erro de conexão:', err)
  );
}

// --------------------------------------------------------------------
// 2. Disparo em lote
// --------------------------------------------------------------------
async function sendBlast(sock) {
  const filePath = path.resolve(__dirname, CONTACTS_FILE);
  if (!fs.existsSync(filePath)) {
    console.error(`Arquivo ${CONTACTS_FILE} não encontrado.`);
    return;
  }

  let lista;
  try {
    lista = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    console.error(`⚠️  ${CONTACTS_FILE} inválido: ${e.message}`);
    return;
  }

  const limit = pLimit(MAX_PARALLEL);

  for (const number of lista) {
    await limit(() => sendOne(sock, number));
    if (MAX_PARALLEL === 1) await delay(MSG_DELAY_MS);
  }

  console.log('🎉 Disparo concluído. Aguardando respostas…');
}

// --------------------------------------------------------------------
// 3. Envia mensagem para um número
// --------------------------------------------------------------------
async function sendOne(sock, number) {
  const jid = `${number}@s.whatsapp.net`;
  try {
    await sock.sendMessage(jid, { text: MESSAGE });
    console.log(`✔️  Mensagem enviada para ${number}`);
  } catch (err) {
    console.error(`❌  Falhou em ${number}:`, err.message);
  }
}

// utilitário para delay
function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

// --------------------------------------------------------------------
// bootstrap
// --------------------------------------------------------------------
createClient().catch((err) => console.error('Falha fatal:', err));
