import "server-only";

import PocketBase from "pocketbase";

export async function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_POCKETBASE_URL;
  const email = process.env.POCKETBASE_SUPERUSER_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
  const password = process.env.POCKETBASE_SUPERUSER_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;

  if (!url || !email || !password) {
    throw new Error("Falta configurar el cliente de servicio de PocketBase.");
  }

  const pb = new PocketBase(url);
  pb.autoCancellation(false);
  await pb.collection("_superusers").authWithPassword(email, password);
  return pb;
}
