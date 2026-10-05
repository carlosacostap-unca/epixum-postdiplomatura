import { describe, expect, it } from "vitest";
import { onboardingProfileSchema, surveySchema, surveyDraftSchema, titleCaseName, validBirthDate } from "./course-onboarding";

const beginner = { experience: "never", frequency: "none", paidAccess: ["no"], goals: ["sources"] };
const experienced = { ...beginner, experience: "tried", frequency: "weekly", tools: ["chatgpt"], uses: ["study"], strategies: ["rephrase"], verification: "sometimes" };
describe("encuesta y datos de onboarding", () => {
  it("omite respuestas ocultas para principiantes y conserva acceso pago institucional", () => {
    const parsed = surveySchema.parse({ ...beginner, tools: ["chatgpt"], otherTools: "anterior", verification: "always", paidAccess: ["institution"], paidTools: "Claude" });
    expect(parsed.tools).toEqual([]);
    expect(parsed.verification).toBeUndefined();
    expect(parsed.paidTools).toBe("Claude");
  });
  it("admite borradores incompletos pero exige todas las preguntas aplicables al enviar", () => {
    expect(surveyDraftSchema.safeParse({}).success).toBe(true);
    expect(surveySchema.safeParse({}).success).toBe(false);
    expect(surveySchema.safeParse(experienced).success).toBe(true);
    expect(surveySchema.safeParse({ ...experienced, uses: [] }).success).toBe(false);
  });
  it.each([
    { paidAccess: ["no", "personal"] }, { paidAccess: ["private", "institution"] },
    { goals: ["sources", "errors", "prompts", "privacy"] }, { paidAccess: ["personal"], paidTools: "" },
    { frequency: "daily" }, { experience: "forged" },
  ])("rechaza opciones inválidas o contradictorias: %j", override => {
    expect(surveySchema.safeParse({ ...beginner, ...override }).success).toBe(false);
  });
  it("borra el detalle de pago cuando la persona prefiere no responder", () => {
    expect(surveySchema.parse({ ...beginner, paidAccess: ["private"], paidTools: "viejo" }).paidTools).toBe("");
  });
  it("requiere detalle de Otras y evita opciones excluyentes combinadas", () => {
    expect(surveySchema.safeParse({ ...experienced, tools: ["other"] }).success).toBe(false);
    expect(surveySchema.safeParse({ ...experienced, tools: ["chatgpt", "unknown"] }).success).toBe(false);
    expect(surveySchema.safeParse({ ...experienced, strategies: ["rephrase", "not_yet"] }).success).toBe(false);
  });
  it("normaliza nombres compuestos sin perder tildes ni inventar otras", () => {
    expect(titleCaseName("  LÓPEZ   ENRIQUE ")).toBe("López Enrique");
    expect(titleCaseName("MARIA JOSE")).toBe("Maria Jose");
    expect(titleCaseName("maría del valle")).toBe("María Del Valle");
  });
  it("rechaza fechas imposibles o futuras y acepta fechas bisiestas reales", () => {
    expect(validBirthDate("2001-02-29")).toBe(false);
    expect(validBirthDate("2064-02-10", new Date("2026-10-05"))).toBe(false);
    expect(validBirthDate("2000-02-29")).toBe(true);
  });
  it("confirma solo datos válidos y no admite cambiar rol o email autenticado", () => {
    const data = { firstName: "MARÍA", lastName: "PRUEBA", dni: "12.345.678", birthDate: "1990-01-15", phone: "383 400-0000", confirmed: true, email: "otra@example.com", role: "admin" };
    expect(onboardingProfileSchema.parse(data)).toEqual({ firstName: "María", lastName: "Prueba", dni: "12345678", birthDate: "1990-01-15", phone: "3834000000", confirmed: true, emailChangeRequested: "" });
    expect(onboardingProfileSchema.safeParse({ ...data, confirmed: false }).success).toBe(false);
  });
});
