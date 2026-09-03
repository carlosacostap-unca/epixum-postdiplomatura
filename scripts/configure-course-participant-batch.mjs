import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';

dotenv.config({ path: '.env.local', quiet: true });

const url = process.env.NEXT_PUBLIC_POCKETBASE_URL;
const email = process.env.POCKETBASE_SUPERUSER_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
const password = process.env.POCKETBASE_SUPERUSER_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;

if (!url || !email || !password) throw new Error('Faltan credenciales de PocketBase');

const [operation = 'status', snapshotArgument = 'tmp/course-participant-batch-settings.json'] = process.argv.slice(2);
const snapshotPath = path.resolve(snapshotArgument);
const pb = new PocketBase(url);
pb.autoCancellation(false);
await pb.collection('_superusers').authWithPassword(email, password);

function normalizedBatch(settings) {
  return {
    enabled: Boolean(settings?.enabled),
    maxRequests: Number(settings?.maxRequests || 50),
    timeout: Number(settings?.timeout || 3),
    maxBodySize: Number(settings?.maxBodySize || 0),
  };
}

async function readBatch() {
  const settings = await pb.settings.getAll();
  return normalizedBatch(settings.batch);
}

if (operation === 'status') {
  process.stdout.write(`${JSON.stringify(await readBatch())}\n`);
} else if (operation === 'apply') {
  const before = await readBatch();
  await mkdir(path.dirname(snapshotPath), { recursive: true });
  await writeFile(snapshotPath, `${JSON.stringify({ url, capturedAt: new Date().toISOString(), batch: before }, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  });

  if (!before.enabled) await pb.settings.update({ batch: { ...before, enabled: true } });
  const after = await readBatch();
  if (!after.enabled) throw new Error('PocketBase no confirmó la activación de operaciones batch');
  process.stdout.write(`Operaciones batch habilitadas. Snapshot: ${snapshotPath}\n`);
} else if (operation === 'rollback') {
  const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'));
  if (snapshot.url !== url) throw new Error('El snapshot pertenece a otra instancia de PocketBase');
  const expected = normalizedBatch(snapshot.batch);
  await pb.settings.update({ batch: expected });
  const restored = await readBatch();
  if (JSON.stringify(restored) !== JSON.stringify(expected)) throw new Error('PocketBase no confirmó la restauración de la configuración batch');
  process.stdout.write('Configuración batch restaurada desde el snapshot.\n');
} else {
  throw new Error('Usá status, apply o rollback');
}
