import dotenv from 'dotenv';
import PocketBase from 'pocketbase';
import { applyCourseDraftSchema } from './course-draft-schema.mjs';
dotenv.config({path:'.env.local',quiet:true});
const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);
await pb.collection('_superusers').authWithPassword(process.env.POCKETBASE_SUPERUSER_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL,process.env.POCKETBASE_SUPERUSER_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD);
console.log(JSON.stringify({updated:await applyCourseDraftSchema(pb)}));
