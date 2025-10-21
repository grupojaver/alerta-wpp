import dotenv from 'dotenv';
import Imap from 'imap-simple';
import { enviarAlertaWhatsApp } from './whatsapp.js';

dotenv.config();

export async function iniciarEscuchaCorreo () {
  const config = {
    imap: {
      user: process.env.EMAIL_USER,
      password: process.env.EMAIL_PASS,
      host: process.env.IMAP_HOST,
      port: process.env.IMAP_PORT,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 5000,
    },
  };



  try {
    const connection = await Imap.connect(config);
    await connection.openBox('INBOX');

    console.log('📬 Escuchando correos entrantes...');

    connection.on('mail', async () => {
      const searchCriteria = ['UNSEEN'];
      const fetchOptions = { bodies: ['HEADER.FIELDS (FROM SUBJECT)'], markSeen: true };
      const results = await connection.search(searchCriteria, fetchOptions);

      for (const res of results) {
        const header = res.parts.find(p => p.which === 'HEADER.FIELDS (FROM SUBJECT)');
        const subject = header?.body?.subject?.[0] || '(sin asunto)';

        console.log(`📨 Nuevo correo detectado: ${subject}`);

        // FILTRO: Solo enviar a WhatsApp si el asunto contiene "Nueva lista de precios"
        if (subject.toLowerCase().includes('actualización de precios')) {
          console.log('🎯 ¡Email objetivo! Enviando a WhatsApp...');
          await enviarAlertaWhatsApp(subject);
        } else {
          console.log('📭 Email ignorado (no contiene "actualización de precios")');
        }
      }
    });
  } catch (err) {
    console.error('❌ Error en el listener de correo:', err);
  }
}
