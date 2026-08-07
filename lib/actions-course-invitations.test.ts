import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  role: "admin",
  create: vi.fn(),
  update: vi.fn(),
  revalidatePath: vi.fn(),
  records: new Map<string, { id: string; emailNormalized: string; status: string }>(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("./pocketbase-server", () => ({
  createServerClient: vi.fn(async () => ({
    authStore: { isValid: true, model: { id: `${mocks.role}-1`, role: mocks.role } },
    filter: (expression: string, params: Record<string, string>) => ({ expression, params }),
    collection: (name: string) => {
      if (name === "courses") return { getOne: vi.fn().mockResolvedValue({ id: "course-1", enrollmentMode: "invitacion_contrasena" }) };
      if (name !== "course_enrollment_invitations") throw new Error(`Colección inesperada: ${name}`);
      return {
        getFirstListItem: vi.fn(async (filter: { params: { email: string } }) => {
          const record = mocks.records.get(filter.params.email);
          if (!record) throw Object.assign(new Error("not found"), { status: 404 });
          return record;
        }),
        create: mocks.create.mockImplementation(async (data) => {
          const record = { id: `inv-${mocks.records.size + 1}`, emailNormalized: data.emailNormalized, status: data.status };
          mocks.records.set(data.emailNormalized, record);
          return record;
        }),
        getOne: vi.fn(async (id: string) => [...mocks.records.values()].find((record) => record.id === id)),
        update: mocks.update.mockResolvedValue({}),
      };
    },
  })),
}));

import { createCourseInvitations, revokeCourseInvitation } from "./actions-course-invitations";

describe("administración de invitaciones", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.role = "admin";
    mocks.records.clear();
    mocks.records.set("existente@epixum.com", { id: "inv-existing", emailNormalized: "existente@epixum.com", status: "pendiente" });
    mocks.records.set("revocada@epixum.com", { id: "inv-revoked", emailNormalized: "revocada@epixum.com", status: "revocada" });
  });

  it("carga emails sin enviar correo y resume cada resultado", async () => {
    const result = await createCourseInvitations("course-1", "Nueva@Epixum.com, existente@epixum.com; revocada@epixum.com\ninválido");
    expect(result).toMatchObject({ success: true, created: ["nueva@epixum.com"], existing: ["existente@epixum.com"], revoked: ["revocada@epixum.com"], invalid: ["inválido"] });
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });

  it("impide que un docente gestione invitados", async () => {
    mocks.role = "docente";
    await expect(createCourseInvitations("course-1", "nuevo@epixum.com")).rejects.toThrow("permisos");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("revoca solamente invitaciones pendientes", async () => {
    expect((await revokeCourseInvitation("inv-existing")).success).toBe(true);
    expect(mocks.update).toHaveBeenCalledWith("inv-existing", { status: "revocada" });
    expect((await revokeCourseInvitation("inv-revoked")).success).toBe(false);
  });
});
