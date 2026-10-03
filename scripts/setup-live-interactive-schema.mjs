import dotenv from 'dotenv';
import PocketBase from 'pocketbase';
import { applyLiveInteractiveSchema } from './live-interactive-schema.mjs';

dotenv.config({ path: '.env.local', quiet: true });
const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);
pb.autoCancellation(false);
try {
  await pb.collection('_superusers').authWithPassword(process.env.POCKETBASE_SUPERUSER_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL, process.env.POCKETBASE_SUPERUSER_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD);
  await applyLiveInteractiveSchema(pb);
  console.log('Esquema de sesiones en vivo configurado. No se habilitaron cursos ni se iniciaron sesiones.');
} catch (error) {
  console.error(error.message, JSON.stringify(error.response?.data || {}));
  process.exitCode = 1;
}
