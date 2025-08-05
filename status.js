// status.js - Script para mostrar status da conexão
const { Client, LocalAuth } = require('whatsapp-web.js');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const instanceId = process.env.INSTANCE_ID || 'zap-prod';

// Caminho da sessão
const isDocker = process.env.NODE_ENV === 'production' || fs.existsSync('/.dockerenv');
const sessionPath = isDocker 
  ? `/app/session/${instanceId}`
  : path.join(process.cwd(), 'session', instanceId);

// Função para verificar se já existe uma sessão conectada
function checkExistingSession() {
  const sessionDir = path.join(sessionPath, 'session-zap-prod');
  return fs.existsSync(sessionDir);
}

// Função para mostrar informações da sessão
function showSessionInfo() {
  console.log('📊 STATUS DO ZAP BLASTER');
  console.log('=' .repeat(50));
  
  console.log(`🆔 Instância: ${instanceId}`);
  console.log(`📁 Sessão: ${sessionPath}`);
  
  if (checkExistingSession()) {
    console.log('✅ Sessão encontrada');
    
    // Tentar ler informações da sessão
    try {
      const sessionDir = path.join(sessionPath, 'session-zap-prod');
      const files = fs.readdirSync(sessionDir);
      console.log(`📄 Arquivos de sessão: ${files.length}`);
      
      if (files.length > 0) {
        console.log('📋 Arquivos:');
        files.forEach(file => {
          const stats = fs.statSync(path.join(sessionDir, file));
          console.log(`   - ${file} (${stats.size} bytes)`);
        });
      }
    } catch (error) {
      console.log('⚠️ Erro ao ler arquivos de sessão:', error.message);
    }
  } else {
    console.log('❌ Nenhuma sessão encontrada');
  }
  
  console.log('=' .repeat(50));
}

// Função para testar conexão rápida
async function testConnection() {
  console.log('\n🧪 Testando conexão...');
  
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
        '--disable-gpu'
      ]
    }
  });

  let connectionTimeout;
  let isConnected = false;

  client.on('ready', () => {
    clearTimeout(connectionTimeout);
    isConnected = true;
    console.log('✅ CONECTADO!');
    console.log(`📞 Número: ${client.info?.wid?.user || 'N/A'}`);
    console.log(`📱 Nome: ${client.info?.pushname || 'N/A'}`);
    console.log(`🌍 Plataforma: ${client.info?.platform || 'N/A'}`);
    
    client.destroy();
    process.exit(0);
  });

  client.on('auth_failure', (msg) => {
    clearTimeout(connectionTimeout);
    console.log('❌ Falha de autenticação');
    console.log(`📝 Detalhes: ${msg}`);
    process.exit(1);
  });

  client.on('disconnected', (reason) => {
    clearTimeout(connectionTimeout);
    console.log('❌ Desconectado');
    console.log(`📝 Motivo: ${reason}`);
    process.exit(1);
  });

  client.on('qr', (qr) => {
    clearTimeout(connectionTimeout);
    console.log('📱 QR Code necessário - não há sessão válida');
    process.exit(1);
  });

  // Timeout de 30 segundos
  connectionTimeout = setTimeout(() => {
    console.log('⏰ Timeout - não foi possível conectar em 30 segundos');
    process.exit(1);
  }, 30000);

  client.initialize();
}

// Executar verificações
showSessionInfo();
setTimeout(() => {
  testConnection();
}, 1000); 