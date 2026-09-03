import { beforeEach, describe, expect, it, vi } from "vitest";
import type PocketBase from "pocketbase";

vi.mock("server-only", () => ({}));

import { validateTeacherSelection, verifyPersistedTeachers } from "./course-teacher-assignment";

function client(options: { enrolled?: string[]; persisted?: string[] } = {}) {
  const enrolled = new Set(options.enrolled || []);
  return {
    filter: (_expression: string, params: Record<string, string>) => params,
    collection: (name: string) => {
      if (name === "users") return { getOne: vi.fn(async (id: string) => ({ id })) };
      if (name === "course_enrollments") return {
        getFirstListItem: vi.fn(async (params: { teacherId: string }) => {
          if (!enrolled.has(params.teacherId)) throw Object.assign(new Error("not found"), { status: 404 });
          return { id: `enrollment-${params.teacherId}` };
        }),
      };
      if (name === "courses") return { getOne: vi.fn(async () => ({ id: "course-a", teachers: options.persisted || [] })) };
      throw new Error(`Colección inesperada: ${name}`);
    },
  } as unknown as PocketBase;
}

describe("asignación docente exclusiva", () => {
  beforeEach(() => vi.clearAllMocks());

  it("acepta cualquier cuenta no matriculada y elimina duplicados", async () => {
    await expect(validateTeacherSelection(client(), "course-a", ["person-a", "person-a"])).resolves.toEqual(["person-a"]);
  });

  it("rechaza toda la selección si una cuenta ya está matriculada en el curso", async () => {
    await expect(validateTeacherSelection(client({ enrolled: ["person-a"] }), "course-a", ["person-a", "person-b"])).rejects.toThrow("matriculada");
  });

  it("verifica que la relación persistida coincida exactamente", async () => {
    await expect(verifyPersistedTeachers(client({ persisted: ["person-b", "person-a"] }), "course-a", ["person-a", "person-b"])).resolves.toBeUndefined();
    await expect(verifyPersistedTeachers(client({ persisted: ["person-a"] }), "course-a", ["person-a", "person-b"])).rejects.toThrow("verificar");
  });
});
