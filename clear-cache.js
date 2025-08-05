// clear-cache.js - Script para limpar cache do whatsapp-web.js
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const instanceId = process.env.INSTANCE_ID || 'zap-prod';

// Caminhos de cache
const sessionPath = path.join(process.cwd(), 'session', instanceId);
const cachePath = path.join(process.cwd(), '.wwebjs_cache');
const authPath = path.join(process.cwd(), 'auth');

function clearCache() {
  console.log('🧹 LIMPANDO CACHE DO WHATSAPP-WEB.JS');
  console.log('=' .repeat(50));
  
  const pathsToClean = [
    { path: sessionPath, name: 'Sessão' },
    { path: cachePath, name: 'Cache' },
    { path: authPath, name: 'Auth' }
  ];
  
  pathsToClean.forEach(({ path: dirPath, name }) => {
    console.log(`\n📁 ${name}: ${dirPath}`);
    
    if (fs.existsSync(dirPath)) {
      try {
        const files = fs.readdirSync(dirPath);
        console.log(`📄 Arquivos encontrados: ${files.length}`);
        
        if (files.length > 0) {
          console.log('📋 Arquivos:');
          files.forEach(file => {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            console.log(`   - ${file} (${stats.size} bytes)`);
          });
          
          // Remover arquivos
          files.forEach(file => {
            const filePath = path.join(dirPath, file);
            try {
              if (fs.statSync(filePath).isDirectory()) {
                fs.rmSync(filePath, { recursive: true, force: true });
              } else {
                fs.unlinkSync(filePath);
              }
              console.log(`🗑️ Removido: ${file}`);
            } catch (error) {
              console.log(`❌ Erro ao remover ${file}: ${error.message}`);
            }
          });
          
          console.log(`✅ ${name} limpo com sucesso!`);
        } else {
          console.log(`📂 ${name} já está vazio`);
        }
      } catch (error) {
        console.error(`❌ Erro ao limpar ${name}:`, error.message);
      }
    } else {
      console.log(`📂 ${name} não encontrado`);
    }
  });
  
  console.log('\n' + '=' .repeat(50));
  console.log('✅ Limpeza concluída!');
  console.log('🔄 Reinicie o bot para escanear um novo QR Code.');
}

// Função para mostrar informações do cache
function showCacheInfo() {
  console.log('📊 INFORMAÇÕES DO CACHE');
  console.log('=' .repeat(50));
  
  const pathsToCheck = [
    { path: sessionPath, name: 'Sessão' },
    { path: cachePath, name: 'Cache' },
    { path: authPath, name: 'Auth' }
  ];
  
  pathsToCheck.forEach(({ path: dirPath, name }) => {
    console.log(`\n📁 ${name}: ${dirPath}`);
    
    if (fs.existsSync(dirPath)) {
      try {
        const files = fs.readdirSync(dirPath);
        console.log(`📄 Arquivos: ${files.length}`);
        
        if (files.length > 0) {
          files.forEach(file => {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            const isDir = stats.isDirectory();
            console.log(`   ${isDir ? '📁' : '📄'} ${file} (${stats.size} bytes)`);
          });
        }
      } catch (error) {
        console.log(`❌ Erro ao ler ${name}: ${error.message}`);
      }
    } else {
      console.log(`❌ ${name} não encontrado`);
    }
  });
}

// Executar
console.log('🚀 Iniciando limpeza de cache...\n');

// Mostrar informações antes de limpar
showCacheInfo();

// Aguardar um pouco
setTimeout(() => {
  clearCache();
}, 2000); 