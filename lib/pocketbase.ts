import PocketBase, { BaseAuthStore } from "pocketbase";

// La sesión persistente vive en la cookie HttpOnly administrada por el servidor.
// Mantener el token OAuth sólo en memoria evita que un bloqueo o fallo de
// localStorage deje una cuenta creada pero sin completar el inicio de sesión.
const pb = new PocketBase(
  process.env.NEXT_PUBLIC_POCKETBASE_URL,
  new BaseAuthStore(),
);

export default pb;
