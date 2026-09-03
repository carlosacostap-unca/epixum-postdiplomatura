import { describe, expect, it } from "vitest";
import {
  isAssignedTeacher,
  resolveCourseParticipation,
  resolveWorkspaceAccess,
  workspaceFromPath,
} from "./course-roles";

const course = { teachers: ["mixed-user"] };

describe("roles contextuales por curso", () => {
  it("permite enseñar y estudiar en cursos diferentes", () => {
    const user = { id: "mixed-user", role: "docente" as const };
    expect(resolveCourseParticipation(course, user, false)).toBe("docente");
    expect(resolveCourseParticipation({ teachers: [] }, user, true)).toBe("estudiante");
});
  it("no concede docencia por el valor global heredado", () => {
    const user = { id: "legacy-teacher", role: "docente" as const };
    expect(isAssignedTeacher(course, user.id)).toBe(false);
    expect(resolveCourseParticipation(course, user, false)).toBe("none");
  });

  it("detecta una participación incompatible en el mismo curso", () => {
    expect(resolveCourseParticipation(course, { id: "mixed-user", role: "estudiante" }, true)).toBe("conflict");
  });

  it("mantiene administración global", () => {
    expect(resolveCourseParticipation({ teachers: [] }, { id: "admin", role: "admin" }, false)).toBe("admin");
  });
});
describe("espacios disponibles", () => {
  it("ofrece estudio a toda cuenta autenticada", () => {
    expect(resolveWorkspaceAccess({ role: "estudiante" }, false)).toEqual({ available: ["estudiante"], preferred: "estudiante" });
  });

  it("ofrece docencia y estudio a una cuenta asignada", () => {
    expect(resolveWorkspaceAccess({ role: "docente" }, true)).toEqual({ available: ["docente", "estudiante"], preferred: "docente" });
  });

  it("ofrece todos los espacios a un administrador asignado", () => {
    expect(resolveWorkspaceAccess({ role: "admin" }, true)).toEqual({ available: ["admin", "docente", "estudiante"], preferred: "admin" });
  });

  it("deriva el espacio activo de la ruta", () => {
    expect(workspaceFromPath("/admin/users")).toBe("admin");
    expect(workspaceFromPath("/docentes/cursos/a")).toBe("docente");
    expect(workspaceFromPath("/estudiantes/cursos/b")).toBe("estudiante");
  });
});
