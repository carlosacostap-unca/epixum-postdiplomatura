import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataTable, type DataColumn } from "./data-table";

interface ExampleRow {
  id: string;
  name: string;
  role: string;
}

const columns: DataColumn<ExampleRow>[] = [
  { id: "name", header: "Usuario", render: (row) => row.name },
  { id: "role", header: "Rol", render: (row) => row.role },
];

describe("DataTable", () => {
  it("ofrece tabla semántica y lista móvil con el mismo nombre", () => {
    render(
      <DataTable
        ariaLabel="Usuarios de la plataforma"
        columns={columns}
        items={[{ id: "1", name: "Ana Pérez", role: "Docente" }]}
        getKey={(row) => row.id}
      />,
    );

    expect(screen.getByRole("table", { name: "Usuarios de la plataforma" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Usuarios de la plataforma" })).toBeInTheDocument();
    expect(screen.getAllByText("Ana Pérez")).toHaveLength(2);
  });
});
