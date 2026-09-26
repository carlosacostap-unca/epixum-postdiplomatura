import dotenv from 'dotenv';
import PocketBase from 'pocketbase';
import {
  candidateSummary,
  confirmedLegacyResubmissionPatch,
  legacyResubmissionCandidate,
} from './delivery-resubmission-candidates.mjs';

dotenv.config({ path: '.env.local', quiet: true });
const url = process.env.NEXT_PUBLIC_POCKETBASE_URL;
const email = process.env.POCKETBASE_SUPERUSER_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
const password = process.env.POCKETBASE_SUPERUSER_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;
if (!url || !email || !password) throw new Error('Faltan las credenciales de PocketBase en .env.local');

const courseArg = process.argv.find((argument) => argument.startsWith('--course='));
const applyArg = process.argv.find((argument) => argument.startsWith('--apply='));
const courseId = courseArg?.slice('--course='.length).trim();
const confirmedIds = new Set((applyArg?.slice('--apply='.length) || '').split(',').map((value) => value.trim()).filter(Boolean));
if (!courseId) throw new Error('Indicá el curso con --course=<id>. El modo predeterminado genera solamente un informe.');

const pb = new PocketBase(url);
pb.autoCancellation(false);
await pb.collection('_superusers').authWithPassword(email, password);
const deliveries = await pb.collection('deliveries').getFullList({
  filter: pb.filter('assignment.course = {:courseId}', { courseId }),
  expand: 'student,assignment',
});
const candidates = deliveries.filter(legacyResubmissionCandidate);
console.log(JSON.stringify({ courseId, mode: confirmedIds.size ? 'apply-confirmed' : 'report', candidates: candidates.map(candidateSummary) }, null, 2));

if (confirmedIds.size) {
  const candidateIds = new Set(candidates.map((delivery) => delivery.id));
  const invalidIds = [...confirmedIds].filter((id) => !candidateIds.has(id));
  if (invalidIds.length) throw new Error(`No se aplicó ningún cambio: estos ids no son candidatos válidos: ${invalidIds.join(', ')}`);
  for (const delivery of candidates.filter((item) => confirmedIds.has(item.id))) {
    await pb.collection('deliveries').update(delivery.id, confirmedLegacyResubmissionPatch(delivery));
  }
  console.log(`- ${confirmedIds.size} reenvíos históricos confirmados y regularizados`);
}
