#!/usr/bin/env node

import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { config as loadEnvFile } from "dotenv";
import PocketBase from "pocketbase";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";
import {
  assertAllowedCollection,
  assertJsonSize,
  sanitize,
  toToolError,
  toToolResult,
} from "./lib.mjs";

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = resolve(MODULE_DIR, "..", "..");
loadEnvFile({ path: join(PROJECT_ROOT, ".env.local"), quiet: true });

const readAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};
const createAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
};
const updateAnnotations = { ...createAnnotations, idempotentHint: true };
const deleteAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true,
};

const requiredCollections = {
  users: ["role"],
  courses: ["title", "status", "teachers"],
  classes: ["title"],
  assignments: ["title"],
  links: ["title", "url"],
  deliveries: ["assignment", "student"],
  inquiries: ["title", "author"],
  inquiry_responses: ["inquiry", "author", "content"],
};

function requiredEnvironment(environment = process.env) {
  const names = [
    "NEXT_PUBLIC_POCKETBASE_URL",
    "POCKETBASE_ADMIN_EMAIL",
    "POCKETBASE_ADMIN_PASSWORD",
  ];
  const missing = names.filter((name) => !environment[name]?.trim());
  if (missing.length) throw new Error(`Faltan variables en .env.local: ${missing.join(", ")}`);

  let url;
  try {
    url = new URL(environment.NEXT_PUBLIC_POCKETBASE_URL);
  } catch {
    throw new Error("NEXT_PUBLIC_POCKETBASE_URL no contiene una URL válida.");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("La URL de PocketBase debe usar HTTP o HTTPS.");
  }

  return {
    url: url.toString().replace(/\/$/, ""),
    email: environment.POCKETBASE_ADMIN_EMAIL,
    password: environment.POCKETBASE_ADMIN_PASSWORD,
  };
}

function createConnection(environment) {
  const settings = requiredEnvironment(environment);
  const client = new PocketBase(settings.url);
  client.autoCancellation(false);
  let pendingAuthentication;

  async function authenticate() {
    if (client.authStore.isValid && client.authStore.isSuperuser) return;

    if (!pendingAuthentication) {
      pendingAuthentication = client
        .collection("_superusers")
        .authWithPassword(settings.email, settings.password, { requestKey: null })
        .then(() => {
          if (!client.authStore.isSuperuser) {
            throw new Error("Las credenciales no pertenecen a un superusuario de PocketBase.");
          }
        })
        .finally(() => {
          pendingAuthentication = undefined;
        });
    }

    return pendingAuthentication;
  }

  return { client, settings, authenticate };
}

function collectionSummary(collection) {
  return sanitize({
    id: collection.id,
    name: collection.name,
    type: collection.type,
    system: collection.system,
    fields: collection.fields,
    indexes: collection.indexes,
    listRule: collection.listRule,
    viewRule: collection.viewRule,
    createRule: collection.createRule,
    updateRule: collection.updateRule,
    deleteRule: collection.deleteRule,
  });
}

function optionalQuery(value, maxLength, label) {
  if (!value) return undefined;
  if (value.length > maxLength) throw new Error(`${label} excede el límite de ${maxLength} caracteres.`);
  return value;
}

function safeTool(handler) {
  return async (args) => {
    try {
      return toToolResult(await handler(args));
    } catch (error) {
      return toToolError(error);
    }
  };
}

export function createPocketBaseMcpServer(environment = process.env) {
  const { client, settings, authenticate } = createConnection(environment);
  const server = new McpServer(
    { name: "epixum-postdiplomatura-pocketbase", version: "1.0.0" },
    {
      instructions:
        "Conexión administrativa de PocketBase exclusiva para Epixum. Ejecuta pocketbase_health antes de operar. Las colecciones internas están bloqueadas, las respuestas se limitan a 100 KB y toda escritura requiere aprobación de Codex.",
    },
  );

  server.registerTool("pocketbase_health", {
    description: "Comprueba PocketBase y valida las credenciales administrativas sin exponerlas.",
    inputSchema: {},
    annotations: readAnnotations,
  }, safeTool(async () => {
    const health = await client.health.check({ requestKey: null });
    await authenticate();
    return {
      connected: true,
      authenticatedAsSuperuser: client.authStore.isSuperuser,
      endpoint: new URL(settings.url).origin,
      health,
    };
  }));

  server.registerTool("pocketbase_whoami", {
    description: "Devuelve el endpoint y la identidad administrativa sanitizada.",
    inputSchema: {},
    annotations: readAnnotations,
  }, safeTool(async () => {
    await authenticate();
    const model = client.authStore.model;
    return {
      endpoint: new URL(settings.url).origin,
      authenticatedAsSuperuser: client.authStore.isSuperuser,
      model: model ? sanitize({ id: model.id, email: model.email, collectionName: model.collectionName }) : null,
    };
  }));

  server.registerTool("pocketbase_list_collections", {
    description: "Lista las colecciones de la aplicación y sus campos. Omite colecciones internas.",
    inputSchema: {},
    annotations: readAnnotations,
  }, safeTool(async () => {
    await authenticate();
    const collections = await client.collections.getFullList({ sort: "name", requestKey: null });
    const visible = collections.filter((collection) => !collection.name.startsWith("_"));
    return { count: visible.length, collections: visible.map(collectionSummary) };
  }));

  server.registerTool("pocketbase_get_collection", {
    description: "Obtiene el esquema y las reglas de una colección.",
    inputSchema: { collection: z.string().min(1).describe("Nombre o ID de la colección") },
    annotations: readAnnotations,
  }, safeTool(async ({ collection }) => {
    await authenticate();
    const model = await client.collections.getOne(assertAllowedCollection(collection), { requestKey: null });
    return { collection: collectionSummary(model) };
  }));

  server.registerTool("pocketbase_list_records", {
    description: "Consulta registros paginados con filtro, orden, expansión y selección de campos opcionales.",
    inputSchema: {
      collection: z.string().min(1),
      page: z.number().int().min(1).max(10_000).default(1),
      perPage: z.number().int().min(1).max(100).default(30),
      filter: z.string().optional(),
      sort: z.string().optional(),
      expand: z.string().optional(),
      fields: z.string().optional(),
    },
    annotations: readAnnotations,
  }, safeTool(async ({ collection, page, perPage, filter, sort, expand, fields }) => {
    await authenticate();
    return client.collection(assertAllowedCollection(collection)).getList(page, perPage, {
      filter: optionalQuery(filter, 5_000, "filter"),
      sort: optionalQuery(sort, 1_000, "sort"),
      expand: optionalQuery(expand, 1_000, "expand"),
      fields: optionalQuery(fields, 2_000, "fields"),
      requestKey: null,
    });
  }));

  server.registerTool("pocketbase_get_record", {
    description: "Obtiene un registro por ID.",
    inputSchema: {
      collection: z.string().min(1),
      id: z.string().min(1).max(100),
      expand: z.string().optional(),
      fields: z.string().optional(),
    },
    annotations: readAnnotations,
  }, safeTool(async ({ collection, id, expand, fields }) => {
    await authenticate();
    const record = await client.collection(assertAllowedCollection(collection)).getOne(id, {
      expand: optionalQuery(expand, 1_000, "expand"),
      fields: optionalQuery(fields, 2_000, "fields"),
      requestKey: null,
    });
    return { record };
  }));

  server.registerTool("pocketbase_create_record", {
    description: "Crea un registro JSON. No admite archivos ni colecciones internas.",
    inputSchema: {
      collection: z.string().min(1),
      data: z.record(z.string(), z.unknown()),
    },
    annotations: createAnnotations,
  }, safeTool(async ({ collection, data }) => {
    assertJsonSize(data);
    await authenticate();
    const record = await client.collection(assertAllowedCollection(collection)).create(data, { requestKey: null });
    return { created: true, record };
  }));

  server.registerTool("pocketbase_update_record", {
    description: "Actualiza campos JSON de un registro existente.",
    inputSchema: {
      collection: z.string().min(1),
      id: z.string().min(1).max(100),
      data: z.record(z.string(), z.unknown()),
    },
    annotations: updateAnnotations,
  }, safeTool(async ({ collection, id, data }) => {
    assertJsonSize(data);
    await authenticate();
    const record = await client.collection(assertAllowedCollection(collection)).update(id, data, { requestKey: null });
    return { updated: true, record };
  }));

  server.registerTool("pocketbase_delete_record", {
    description: "Elimina definitivamente un registro.",
    inputSchema: {
      collection: z.string().min(1),
      id: z.string().min(1).max(100),
    },
    annotations: deleteAnnotations,
  }, safeTool(async ({ collection, id }) => {
    await authenticate();
    await client.collection(assertAllowedCollection(collection)).delete(id, { requestKey: null });
    return { deleted: true, collection, id };
  }));

  server.registerTool("pocketbase_create_collection", {
    description: "Crea una colección a partir de un esquema PocketBase.",
    inputSchema: { schema: z.record(z.string(), z.unknown()) },
    annotations: createAnnotations,
  }, safeTool(async ({ schema }) => {
    assertJsonSize(schema);
    assertAllowedCollection(String(schema.name || ""));
    await authenticate();
    return { created: true, collection: await client.collections.create(schema, { requestKey: null }) };
  }));

  server.registerTool("pocketbase_update_collection", {
    description: "Modifica el esquema o las reglas de una colección.",
    inputSchema: {
      collection: z.string().min(1),
      data: z.record(z.string(), z.unknown()),
    },
    annotations: updateAnnotations,
  }, safeTool(async ({ collection, data }) => {
    assertJsonSize(data);
    await authenticate();
    const updated = await client.collections.update(assertAllowedCollection(collection), data, { requestKey: null });
    return { updated: true, collection: collectionSummary(updated) };
  }));

  server.registerTool("pocketbase_delete_collection", {
    description: "Elimina definitivamente una colección y sus registros.",
    inputSchema: { collection: z.string().min(1) },
    annotations: deleteAnnotations,
  }, safeTool(async ({ collection }) => {
    await authenticate();
    await client.collections.delete(assertAllowedCollection(collection), { requestKey: null });
    return { deleted: true, collection };
  }));

  server.registerTool("pocketbase_validate_epixum_schema", {
    description: "Comprueba las colecciones y campos base esperados por esta aplicación.",
    inputSchema: {},
    annotations: readAnnotations,
  }, safeTool(async () => {
    await authenticate();
    const collections = await client.collections.getFullList({ sort: "name", requestKey: null });
    const byName = new Map(collections.map((collection) => [collection.name, collection]));
    const missingCollections = [];
    const missingFields = {};

    for (const [name, fields] of Object.entries(requiredCollections)) {
      const collection = byName.get(name);
      if (!collection) {
        missingCollections.push(name);
        continue;
      }
      const existingFields = new Set(collection.fields.map((field) => field.name));
      const missing = fields.filter((field) => !existingFields.has(field));
      if (missing.length) missingFields[name] = missing;
    }

    return {
      ok: missingCollections.length === 0 && Object.keys(missingFields).length === 0,
      missingCollections,
      missingFields,
      enrollmentFlow: {
        courseKeyFieldPresent: byName.get("courses")?.fields.some((field) => field.name === "enrollmentKeyHash") || false,
        enrollmentsCollectionPresent: byName.has("course_enrollments"),
        legacyRequestsPresent: byName.has("enrollment_requests"),
      },
    };
  }));

  return server;
}

export async function main() {
  const server = createPocketBaseMcpServer();
  await server.connect(new StdioServerTransport());
  console.error("Epixum PostDiplomatura PocketBase MCP activo por stdio.");
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    console.error(`No se pudo iniciar PocketBase MCP: ${error.message}`);
    process.exitCode = 1;
  });
}
