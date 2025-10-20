import dotenv from 'dotenv';
import Imap from 'imap';
import { simpleParser } from 'mailparser';
import qrcode from 'qrcode-terminal';
import { Client, LocalAuth } from 'whatsapp-web.js';
dotenv.config();

// --- Inicializar WhatsApp ---
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './session' }),
});

client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ Cliente de WhatsApp conectado y listo.');
  iniciarCorreoWatcher();
});

client.initialize();

// --- Función para enviar mensaje al grupo ---
async function enviarAlertaWhatsApp (subject) {
  try {
    const chat = await client.getChatById(process.env.WHATSAPP_GROUP_ID);
    const mensaje = `🚨 *Alerta de precios* 🚨\nSe recibió un correo con asunto:\n"${subject}"`;
    await chat.sendMessage(mensaje);
    console.log(`✅ Mensaje enviado al grupo: ${subject}`);
  } catch (err) {
    console.error('❌ Error al enviar mensaje:', err);
  }
}

// --- Monitorear correos con IMAP ---
function iniciarCorreoWatcher () {
  const imap = new Imap({
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASS,
    host: process.env.IMAP_HOST,
    port: process.env.IMAP_PORT,
    tls: true,
  });

  function abrirBandeja (callback) {
    imap.openBox('INBOX', false, callback);
  }

  imap.once('ready', function () {
    abrirBandeja(() => {
      console.log('📬 Monitoreando nuevos correos...');

      imap.on('mail', () => {
        imap.search(['UNSEEN'], (err, results) => {
          if (!results || !results.length) return;

          const fetch = imap.fetch(results, { bodies: '' });
          fetch.on('message', msg => {
            msg.on('body', stream => {
              simpleParser(stream, async (err, parsed) => {
                const subject = parsed.subject || '';

                if (subject.startsWith('Nueva actualización de precios en')) {
                  console.log(`📧 Correo detectado: ${subject}`);
                  await enviarAlertaWhatsApp(subject);
                }
              });
            });
          });
        });
      });
    });
  });

  imap.once('error', err => console.error('❌ Error IMAP:', err));
  imap.once('end', () => console.log('🔚 Conexión IMAP finalizada'));
  imap.connect();
}