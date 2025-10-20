import 'dotenv/config';
import Imap from 'imap';
import qr from 'qrcode-terminal';
import { Client, LocalAuth } from 'whatsapp-web.js';

// Inicializa WhatsApp
const client = new Client({
  authStrategy: new LocalAuth(),
});

client.on('qr', (qrCode) => {
  console.clear();
  console.log('📱 Escanea este QR con tu WhatsApp para vincular:');
  qr.generate(qrCode, { small: true });
});

client.on('ready', () => {
  console.log('✅ WhatsApp conectado y listo.');
  initMailWatcher();
});

client.initialize();

// ---- MONITOREO DE CORREOS ----
function initMailWatcher () {
  const imap = new Imap({
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASS,
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    tls: true,
  });

  imap.once('ready', () => {
    console.log('📬 Conectado al correo. Escuchando nuevos mensajes...');
    imap.openBox('INBOX', false, () => {
      imap.on('mail', (numNewMsgs) => {
        console.log(`✉️ Nuevo correo detectado (${numNewMsgs})`);
        processNewMail(imap);
      });
    });
  });

  imap.once('error', (err) => {
    console.error('❌ Error IMAP:', err);
    setTimeout(initMailWatcher, 10000); // reconectar
  });

  imap.connect();
}

function processNewMail (imap) {
  imap.search(['UNSEEN'], (err, results) => {
    if (err || !results.length) return;

    const f = imap.fetch(results.slice(-1), {
      bodies: ['HEADER.FIELDS (SUBJECT FROM)'],
      markSeen: true,
    });

    f.on('message', (msg) => {
      msg.on('body', async (stream) => {
        let buffer = '';
        stream.on('data', (chunk) => (buffer += chunk.toString('utf8')));
        stream.on('end', async () => {
          const subject = buffer.match(/Subject: (.*)/)?.[1]?.trim() || '(sin asunto)';
          const from = buffer.match(/From: (.*)/)?.[1]?.trim() || '(desconocido)';
          const keywords = process.env.KEYWORDS.split(',').map((k) => k.trim().toLowerCase());

          if (keywords.some((k) => subject.toLowerCase().includes(k))) {
            const msgText = `📩 *Nuevo correo detectado:*\nDe: ${from}\nAsunto: ${subject}`;
            const groupId = process.env.WPP_GROUP_ID;

            try {
              await client.sendMessage(groupId, msgText);
              console.log('✅ Alerta enviada a WhatsApp:', subject);
            } catch (err) {
              console.error('⚠️ Error al enviar a WhatsApp:', err.message);
            }
          } else {
            console.log(`📨 Correo ignorado: ${subject}`);
          }
        });
      });
    });
  });
}
