"use client";

import { useEffect, useRef } from "react";
import { ContributionRow } from "@/lib/contracts/row";
import { Button } from "@/components/ui/Button";

type RowFieldAccessor =
  | "serialNumber"
  | "nameMr"
  | "nameEn"
  | "contributionAmount"
  | "placeMr"
  | "placeEn";

export type RowsTableColumn = {
  id: string;
  label: string;
  width: number;
  kind: "field" | "name" | "place" | "actions" | "custom";
  accessor?: RowFieldAccessor;
};

type Props = {
  rows: ContributionRow[];
  columns: RowsTableColumn[];
  selectedColumnId?: string | null;
  duplicateRowIds?: Set<string>;
  emptyMessage?: string;
  onSelectColumn?: (columnId: string) => void;
  onResizeColumn?: (columnId: string, width: number) => void;
  onEdit: (row: ContributionRow) => void;
  onDelete: (row: ContributionRow) => void;
};

export const RowsTable = ({
  rows,
  columns,
  selectedColumnId = null,
  duplicateRowIds = new Set<string>(),
  emptyMessage = "No rows available yet. Add your first row above.",
  onSelectColumn,
  onResizeColumn,
  onEdit,
  onDelete
}: Props) => {
  const resizeSessionRef = useRef<{
    columnId: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      if (!resizeSessionRef.current || !onResizeColumn) {
        return;
      }

      const { columnId, startX, startWidth } = resizeSessionRef.current;
      const delta = event.clientX - startX;
      const nextWidth = Math.max(90, startWidth + delta);
      onResizeColumn(columnId, nextWidth);
    };

    const onMouseUp = () => {
      resizeSessionRef.current = null;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onResizeColumn]);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
        {emptyMessage}
      </div>
    );
  }

  const tableMinWidth = columns.reduce((sum, column) => sum + column.width, 0);

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="table-fixed text-left text-sm text-slate-700" style={{ minWidth: tableMinWidth }}>
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
          <tr>
            {columns.map((column) => {
              const isSelected = selectedColumnId === column.id;
              return (
                <th
                  key={column.id}
                  style={{ width: column.width, minWidth: column.width, maxWidth: column.width }}
                  className="relative px-3 py-2"
                >
                  <button
                    type="button"
                    className={`w-full truncate text-left ${
                      isSelected ? "font-semibold text-slate-900" : ""
                    }`}
                    onClick={() => onSelectColumn?.(column.id)}
                  >
                    {column.label}
                  </button>
                  {onResizeColumn ? (
                    <span
                      role="presentation"
                      className="absolute right-0 top-0 h-full w-2 cursor-col-resize"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        resizeSessionRef.current = {
                          columnId: column.id,
                          startX: event.clientX,
                          startWidth: column.width
                        };
                      }}
                    />
                  ) : null}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isDuplicate = duplicateRowIds.has(row.id);

            return (
              <tr key={row.id} className="border-t border-slate-100">
                {columns.map((column) => {
                  if (column.kind === "actions") {
                    return (
                      <td
                        key={`${row.id}-${column.id}`}
                        style={{ width: column.width, minWidth: column.width, maxWidth: column.width }}
                        className="px-3 py-2 align-middle"
                      >
                        <div className="flex gap-2">
                          <Button
                            aria-label={`Edit row ${row.serialNumber}`}
                            variant="secondary"
                            className="px-2 py-1"
                            onClick={() => onEdit(row)}
                          >
                            Edit
                          </Button>
                          <Button
                            aria-label={`Delete row ${row.serialNumber}`}
                            variant="danger"
                            className="px-2 py-1"
                            onClick={() => onDelete(row)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    );
                  }

                  if (column.kind === "name") {
                    return (
                      <td
                        key={`${row.id}-${column.id}`}
                        style={{ width: column.width, minWidth: column.width, maxWidth: column.width }}
                        className="px-3 py-2 align-middle"
                      >
                        <div className="font-semibold text-slate-950">{row.nameMr}</div>
                        <div className="text-xs text-slate-500">{row.nameEn}</div>
                        {isDuplicate ? (
                          <div className="mt-1">
                            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                              Possible duplicate
                            </span>
                          </div>
                        ) : null}
                      </td>
                    );
                  }

                  if (column.kind === "place") {
                    return (
                      <td
                        key={`${row.id}-${column.id}`}
                        style={{ width: column.width, minWidth: column.width, maxWidth: column.width }}
                        className="px-3 py-2 align-middle"
                      >
                        <div className="font-semibold text-slate-950">{row.placeMr}</div>
                        <div className="text-xs text-slate-500">{row.placeEn}</div>
                      </td>
                    );
                  }

                  if (column.kind === "custom") {
                    return (
                      <td
                        key={`${row.id}-${column.id}`}
                        style={{ width: column.width, minWidth: column.width, maxWidth: column.width }}
                        className="px-3 py-2 text-slate-400"
                      >
                        -
                      </td>
                    );
                  }

                  const value = column.accessor ? row[column.accessor] : "";

                  return (
                    <td
                      key={`${row.id}-${column.id}`}
                      style={{ width: column.width, minWidth: column.width, maxWidth: column.width }}
                      className={`truncate px-3 py-2 align-middle ${
                        column.accessor === "serialNumber" ? "font-semibold text-slate-900" : ""
                      }`}
                    >
                      {value}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
