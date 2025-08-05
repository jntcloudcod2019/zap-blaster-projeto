// clear-session.js - Script para limpar sessões corrompidas
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const instanceId = process.env.INSTANCE_ID || 'zap-prod';

// Caminho da sessão
const isDocker = process.env.NODE_ENV === 'production' || fs.existsSync('/.dockerenv');
const sessionPath = isDocker 
  ? `/app/session/${instanceId}`
  : path.join(process.cwd(), 'session', instanceId);

function clearSession() {
  console.log('🧹 LIMPANDO SESSÕES CORROMPIDAS');
  console.log('=' .repeat(50));
  
  console.log(`📁 Sessão: ${sessionPath}`);
  
  try {
    // Verificar se o diretório existe
    if (fs.existsSync(sessionPath)) {
      console.log('📂 Diretório de sessão encontrado');
      
      // Listar arquivos
      const files = fs.readdirSync(sessionPath);
      console.log(`📄 Arquivos encontrados: ${files.length}`);
      
      if (files.length > 0) {
        console.log('📋 Arquivos:');
        files.forEach(file => {
          const filePath = path.join(sessionPath, file);
          const stats = fs.statSync(filePath);
          console.log(`   - ${file} (${stats.size} bytes)`);
        });
        
        // Perguntar se quer limpar
        console.log('\n⚠️ ATENÇÃO: Isso irá remover todas as sessões!');
        console.log('📱 Você precisará escanear o QR Code novamente.');
        
        // Simular confirmação (em produção, você pode usar readline)
        console.log('\n✅ Limpando sessões...');
        
        // Remover arquivos
        files.forEach(file => {
          const filePath = path.join(sessionPath, file);
          try {
            fs.unlinkSync(filePath);
            console.log(`🗑️ Removido: ${file}`);
          } catch (error) {
            console.log(`❌ Erro ao remover ${file}: ${error.message}`);
          }
        });
        
        console.log('\n✅ Sessões limpas com sucesso!');
        console.log('🔄 Reinicie o bot para escanear um novo QR Code.');
        
      } else {
        console.log('📂 Diretório vazio - nada para limpar');
      }
    } else {
      console.log('📂 Diretório de sessão não encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro ao limpar sessões:', error.message);
  }
  
  console.log('=' .repeat(50));
}

// Função para backup antes de limpar
function backupSession() {
  const backupDir = path.join(process.cwd(), 'backup', new Date().toISOString().replace(/[:.]/g, '-'));
  
  try {
    if (fs.existsSync(sessionPath)) {
      console.log('💾 Criando backup...');
      
      // Criar diretório de backup
      fs.mkdirSync(backupDir, { recursive: true });
      
      // Copiar arquivos
      const files = fs.readdirSync(sessionPath);
      files.forEach(file => {
        const sourcePath = path.join(sessionPath, file);
        const destPath = path.join(backupDir, file);
        fs.copyFileSync(sourcePath, destPath);
        console.log(`💾 Backup: ${file}`);
      });
      
      console.log(`✅ Backup criado em: ${backupDir}`);
    }
  } catch (error) {
    console.error('❌ Erro ao criar backup:', error.message);
  }
}

// Executar limpeza
console.log('🚀 Iniciando limpeza de sessões...\n');

// Fazer backup primeiro
backupSession();

// Aguardar um pouco
setTimeout(() => {
  clearSession();
}, 1000); 