// listar-grupos.js
import qrcode from 'qrcode-terminal';
import pkg from 'whatsapp-web.js';

const { Client, LocalAuth } = pkg;

// --- Inicializar WhatsApp solo para listar grupos ---
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './session' }),
  puppeteer: {
    headless: false, // Abre el navegador para escanear el QR
    executablePath: '/usr/bin/chromium-browser', // Ajusta si usas otra ruta
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--start-maximized'
    ]
  }
});

// --- QR para iniciar sesión ---
client.on('qr', qr => {
  console.clear();
  console.log('📱 Escanea este código QR con tu WhatsApp:');
  qrcode.generate(qr, { small: true });
});

// --- Estado de autenticación ---
client.on('authenticated', () => console.log('✅ Autenticado correctamente'));
client.on('auth_failure', msg => console.error('❌ Fallo de autenticación:', msg));
client.on('disconnected', reason => console.log('🔌 Desconectado:', reason));

// --- Cuando el cliente está listo ---
client.on('ready', async () => {
  console.log('✅ Cliente de WhatsApp conectado y listo.');
  await new Promise(resolve => setTimeout(resolve, 4000)); // Espera unos segundos

  try {
    const chats = await client.getChats();
    const grupos = chats.filter(c => c.isGroup);

    if (grupos.length === 0) {
      console.log('⚠️ No se encontraron grupos en esta cuenta.');
      return;
    }

    console.log('📋 Lista de grupos encontrados:\n');
    grupos.forEach((g, i) => {
      console.log(`${i + 1}. Nombre: "${g.name}"`);
      console.log(`   ID: ${g.id._serialized}\n`);
    });

  } catch (error) {
    console.error('❌ Error al obtener grupos:', error);
  }
});

// Inicializar el cliente
client.initialize();
