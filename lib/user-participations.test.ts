import { describe, expect, it } from "vitest";
import { buildUserParticipationSummaries } from "./user-participations";

describe("resumen de participaciones administrativas", () => {
  it("muestra una misma cuenta como docente y estudiante en cursos distintos", () => {
    const summaries = buildUserParticipationSummaries(
      [
        { id: "course-a", title: "Curso A", teachers: ["mixed"] },
        { id: "course-b", title: "Curso B", teachers: [] },
      ],
      [{ course: "course-b", student: "mixed" }],
    );
    expect(summaries.mixed).toEqual({
      teaching: [{ id: "course-a", title: "Curso A" }],
      studying: [{ id: "course-b", title: "Curso B" }],
    });
  });
});
