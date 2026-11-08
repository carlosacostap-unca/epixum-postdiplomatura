import PocketBase from 'pocketbase';

export const PREVIEW_COURSE_ID = '5wdbs1o1p22vszm';
/** Server-only reader. No tokens or unpublished records are returned to the browser. */
export function createPreviewScheduleReader(env, createClient = url => new PocketBase(url)) {
  let client;
  let pending;
  return function read() {
    if (pending) return pending;
    pending = (async () => {
      const url = env.NEXT_PUBLIC_POCKETBASE_URL;
      const email = env.POCKETBASE_SUPERUSER_EMAIL || env.POCKETBASE_ADMIN_EMAIL;
      const password = env.POCKETBASE_SUPERUSER_PASSWORD || env.POCKETBASE_ADMIN_PASSWORD;
      if (!url || !email || !password) throw new Error('Falta configurar PocketBase para la vista previa.');
      client ??= createClient(url);
      client.autoCancellation(false);
      if (!client.authStore.isValid) await client.collection('_superusers').authWithPassword(email,password,{signal:AbortSignal.timeout(10000)});
      const records = await client.collection('classes').getFullList({
        filter:client.filter('course = {:course}',{course:PREVIEW_COURSE_ID}),
        fields:'id,course,title,date,publicationStatus,publishAt', sort:'date,id',
        cache:'no-store', signal:AbortSignal.timeout(10000),
      });
      const serverNow = Date.now();
      return {serverNow,classes:records.filter(c=>c.course===PREVIEW_COURSE_ID && (
        c.publicationStatus == null || c.publicationStatus === '' || c.publicationStatus === 'published' ||
        (c.publicationStatus === 'scheduled' && Date.parse(c.publishAt) <= serverNow)
      )).map(({id,title,date})=>({id,title,date}))};
    })().catch(error=>{if(error?.status===401) client?.authStore.clear(); throw error;}).finally(()=>{pending=undefined;});
    return pending;
  };
}
