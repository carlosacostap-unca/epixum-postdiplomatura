/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv").config({ path: ".env.local", quiet: true });
const PocketBase = require("pocketbase/cjs");
const readline = require("node:readline/promises");

const url = process.env.NEXT_PUBLIC_POCKETBASE_URL || "https://pocketbase-postdiplomatura.epixum.com";
let email = process.env.POCKETBASE_SUPERUSER_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL || "";
let password =
  process.env.POCKETBASE_SUPERUSER_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD || "";

const pb = new PocketBase(url);
pb.autoCancellation(false);

function isNotFound(error) {
  return error && error.status === 404;
}

function askHidden(question) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
      reject(new Error("La contraseña debe configurarse en POCKETBASE_SUPERUSER_PASSWORD."));
      return;
    }

    let value = "";
    process.stdout.write(question);
    process.stdin.setEncoding("utf8");
    process.stdin.setRawMode(true);
    process.stdin.resume();

    const finish = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("data", onData);
      process.stdout.write("\n");
      resolve(value);
    };

    const onData = (chunk) => {
      for (const character of chunk) {
        if (character === "\r" || character === "\n") {
          finish();
          return;
        }
        if (character === "\u0003") {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener("data", onData);
          process.stdout.write("\n");
          reject(new Error("Configuración cancelada."));
          return;
        }
        if (character === "\u007f" || character === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        value += character;
      }
    };

    process.stdin.on("data", onData);
  });
}

async function ensureCredentials() {
  if (!email) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    email = (await rl.question("Email de superusuario de PocketBase: ")).trim();
    rl.close();
  }

  if (!password) {
    password = await askHidden("Contraseña de superusuario (no se mostrará): ");
  }

  if (!email || !password) {
    throw new Error("Faltan las credenciales del superusuario de PocketBase.");
  }
}

async function getCollection(name) {
  try {
    return await pb.collections.getOne(name);
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

async function ensureCourseKeyField() {
  const courses = await pb.collections.getOne("courses");
  if (courses.fields.some((field) => field.name === "enrollmentKeyHash")) {
    console.log("- courses.enrollmentKeyHash ya existe");
    return courses;
  }

  const fields = [
    ...courses.fields,
    {
      name: "enrollmentKeyHash",
      type: "text",
      required: false,
      hidden: true,
      min: 64,
      max: 64,
      pattern: "^[a-f0-9]{64}$",
    },
  ];

  const updated = await pb.collections.update(courses.id, { fields });
  console.log("- agregado courses.enrollmentKeyHash");
  return updated;
}

async function ensureEnrollmentsCollection(courses, users) {
  const rules = {
    listRule:
      'student = @request.auth.id || course.teachers.id ?= @request.auth.id || @request.auth.role = "admin"',
    viewRule:
      'student = @request.auth.id || course.teachers.id ?= @request.auth.id || @request.auth.role = "admin"',
    createRule:
      'student = @request.auth.id && @request.auth.role = "estudiante" && keyHash = course.enrollmentKeyHash && course.status != "borrador"',
    updateRule: null,
    deleteRule:
      'course.teachers.id ?= @request.auth.id || @request.auth.role = "admin"',
  };

  let enrollments = await getCollection("course_enrollments");
  if (!enrollments) {
    enrollments = await pb.collections.create({
      name: "course_enrollments",
      type: "base",
      fields: [
        {
          name: "course",
          type: "relation",
          required: true,
          collectionId: courses.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: "student",
          type: "relation",
          required: true,
          collectionId: users.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: "keyHash",
          type: "text",
          required: false,
          hidden: true,
          min: 64,
          max: 64,
          pattern: "^[a-f0-9]{64}$",
        },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_course_enrollments_unique ON course_enrollments (course, student)",
      ],
      ...rules,
    });
    console.log("- creada course_enrollments");
    return enrollments;
  }

  const fields = [...enrollments.fields];
  if (!fields.some((field) => field.name === "keyHash")) {
    fields.push({
      name: "keyHash",
      type: "text",
      required: false,
      hidden: true,
      min: 64,
      max: 64,
      pattern: "^[a-f0-9]{64}$",
    });
  }

  const indexes = enrollments.indexes.some((index) =>
    index.includes("idx_course_enrollments_unique"),
  )
    ? enrollments.indexes
    : [
        ...enrollments.indexes,
        "CREATE UNIQUE INDEX idx_course_enrollments_unique ON course_enrollments (course, student)",
      ];

  enrollments = await pb.collections.update(enrollments.id, {
    fields,
    indexes,
    ...rules,
  });
  console.log("- actualizada course_enrollments");
  return enrollments;
}

async function ensureOAuthStudentRegistration(users) {
  const createRule = '@request.context = "oauth2"';
  const updateRule =
    '(id = @request.auth.id && ((role = "" && @request.body.role = "estudiante") || @request.body.role:isset = false)) || @request.auth.role = "admin"';

  await pb.collections.update(users.id, { createRule, updateRule });
  console.log("- habilitado el alta inicial segura mediante Google OAuth");
}

async function migrateLegacyStudents() {
  const courses = await pb.collection("courses").getFullList({ sort: "created" });
  let created = 0;

  for (const course of courses) {
    for (const studentId of course.students || []) {
      try {
        await pb.collection("course_enrollments").getFirstListItem(
          pb.filter("course = {:courseId} && student = {:studentId}", {
            courseId: course.id,
            studentId,
          }),
        );
      } catch (error) {
        if (!isNotFound(error)) throw error;
        await pb.collection("course_enrollments").create({
          course: course.id,
          student: studentId,
        });
        created += 1;
      }
    }
  }

  console.log(`- migradas ${created} matrículas heredadas`);
}

async function removeLegacyRequests() {
  const legacy = await getCollection("enrollment_requests");
  if (!legacy) {
    console.log("- enrollment_requests ya no existe");
    return;
  }

  await pb.collections.delete(legacy.id);
  console.log("- eliminada enrollment_requests");
}

async function main() {
  await ensureCredentials();
  console.log(`Configurando matrículas en ${url}`);
  await pb.collection("_superusers").authWithPassword(email, password);

  const users = await pb.collections.getOne("users");
  const courses = await ensureCourseKeyField();
  await ensureOAuthStudentRegistration(users);
  await ensureEnrollmentsCollection(courses, users);
  await migrateLegacyStudents();
  await removeLegacyRequests();

  const { applyWeeklySchema } = await import('./weekly-schema.mjs');
  const weekly = await applyWeeklySchema(pb);
  console.log(`- esquema semanal configurado; ${weekly.initializedCourses} cursos inicializados como tradicionales`);

  const { applyInvitationSchema } = await import('./invitation-schema.mjs');
  const invitations = await applyInvitationSchema(pb);
  console.log(`- doble validación configurada; ${invitations.initializedCourses} cursos inicializados con clave`);

  console.log("Configuración completada.");
}

main().catch((error) => {
  console.error("No se pudo configurar PocketBase:", error.message);
  if (error.data) console.error(JSON.stringify(error.data, null, 2));
  process.exit(1);
});
