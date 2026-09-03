import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  actor: { id: "admin-a", role: "admin" } as { id: string; role: string } | null,
  update: vi.fn(),
  getOne: vi.fn(),
  collections: [] as string[],
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("./s3", () => ({ configureBucketCors: vi.fn(), getPresignedDownloadUrl: vi.fn(), getPresignedUploadUrl: vi.fn() }));
vi.mock("./pocketbase-server", () => ({
  createServerClient: vi.fn(async () => ({
    authStore: { isValid: true, get model() { return mocks.actor; } },
    collection: (name: string) => {
      mocks.collections.push(name);
      return { update: mocks.update, getOne: mocks.getOne };
    },
  })),
}));

import { updateUserAdminAccess } from "./actions";

describe("privilegio administrativo", () => {
  beforeEach(() => {
    mocks.actor = { id: "admin-a", role: "admin" };
    mocks.collections = [];
    mocks.update.mockReset().mockImplementation(async (_id, data) => ({ id: "person-a", ...data }));
    mocks.getOne.mockReset().mockImplementation(async () => ({ id: "person-a", role: mocks.update.mock.calls.at(-1)?.[1].role }));
  });

  it("concede y retira sólo el privilegio global sin tocar participaciones", async () => {
    await expect(updateUserAdminAccess("person-a", true)).resolves.toEqual({ success: true });
    expect(mocks.update).toHaveBeenLastCalledWith("person-a", { role: "admin" });
    await expect(updateUserAdminAccess("person-a", false)).resolves.toEqual({ success: true });
    expect(mocks.update).toHaveBeenLastCalledWith("person-a", { role: "estudiante" });
    expect(new Set(mocks.collections)).toEqual(new Set(["users"]));
  });

  it("rechaza una escalada solicitada por una cuenta no administradora", async () => {
    mocks.actor = { id: "student-a", role: "estudiante" };
    await expect(updateUserAdminAccess("student-a", true)).rejects.toThrow("Unauthorized");
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
