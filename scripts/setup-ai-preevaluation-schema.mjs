import dotenv from 'dotenv';
import PocketBase from 'pocketbase';
import { applyAIPreevaluationSchema } from './ai-preevaluation-schema.mjs';

dotenv.config({ path: '.env.local', quiet: true });
const url = process.env.NEXT_PUBLIC_POCKETBASE_URL;
const email = process.env.POCKETBASE_SUPERUSER_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
const password = process.env.POCKETBASE_SUPERUSER_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;
if (!url || !email || !password) throw new Error('Faltan las credenciales de PocketBase en .env.local');
const pb = new PocketBase(url);
pb.autoCancellation(false);
await pb.collection('_superusers').authWithPassword(email, password);
const result = await applyAIPreevaluationSchema(pb);
console.log(`- preevaluación IA configurada (${result.migratedPrompts} prompts heredados migrados)`);
