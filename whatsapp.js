import dotenv from 'dotenv';
import qrcode from 'qrcode-terminal';
import pkg from 'whatsapp-web.js';

dotenv.config();
const { Client, LocalAuth } = pkg;

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './session' }),
  puppeteer: {
    headless: false,
    executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

client.on('qr', qr => {
  console.clear();
  console.log('📱 Escanea este QR con tu WhatsApp:');
  qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => console.log('✅ Autenticado correctamente'));
client.on('auth_failure', msg => console.error('❌ Fallo de autenticación:', msg));
client.on('disconnected', reason => console.log('🔌 Desconectado:', reason));

client.on('ready', () => console.log('✅ Cliente de WhatsApp conectado y listo.'));

client.initialize();

/** Función para enviar mensaje al grupo */
export async function enviarAlertaWhatsApp (subject) {
  try {
    const chat = await client.getChatById(process.env.WHATSAPP_GROUP_ID);
    const mensaje = `🚨 *Alerta de precios* 🚨\nSe recibió un correo con asunto:\n"${subject}"`;
    await chat.sendMessage(mensaje);
    console.log(`✅ Mensaje enviado al grupo: ${subject}`);
  } catch (err) {
    console.error('❌ Error al enviar mensaje:', err);
  }
}

export default client;
