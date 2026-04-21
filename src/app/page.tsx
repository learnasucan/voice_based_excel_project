"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ContributionRow } from "@/lib/contracts/row";
import { deleteRow, fetchRows } from "@/lib/utils/apiClient";
import { RowCaptureWizard } from "@/components/row-form/RowCaptureWizard";
import { RowEditDialog } from "@/components/rows/RowEditDialog";
import { RowsTable, RowsTableColumn } from "@/components/table/RowsTable";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

type DuplicateFilter = "all" | "duplicate" | "unique";

const buildExportUrl = (
  format: "csv" | "xlsx" | "pdf",
  search: string,
  fileName: string
): string =>
  `/api/export?format=${format}&search=${encodeURIComponent(search)}&fileName=${encodeURIComponent(fileName.trim())}`;

const buildDuplicateKey = (row: ContributionRow): string =>
  `${row.nameMrKey}|${row.contributionAmount}|${row.placeMrKey}`;

const formatAmount = (value: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);

const normalize = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, " ");

const DEFAULT_TABLE_COLUMNS: RowsTableColumn[] = [
  { id: "serialNumber", label: "Serial", kind: "field", accessor: "serialNumber", width: 120 },
  { id: "nameMr", label: "Name (MR)", kind: "field", accessor: "nameMr", width: 220 },
  { id: "nameEn", label: "Name (EN)", kind: "field", accessor: "nameEn", width: 220 },
  {
    id: "contributionAmount",
    label: "Amount",
    kind: "field",
    accessor: "contributionAmount",
    width: 140
  },
  { id: "placeMr", label: "Place (MR)", kind: "field", accessor: "placeMr", width: 180 },
  { id: "placeEn", label: "Place (EN)", kind: "field", accessor: "placeEn", width: 180 },
  { id: "duplicate", label: "Duplicate", kind: "duplicate", width: 180 },
  { id: "actions", label: "Actions", kind: "actions", width: 210 }
];

const createCustomColumn = (label: string): RowsTableColumn => ({
  id: `custom-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
  label,
  kind: "custom",
  width: 180
});

export default function HomePage() {
  const [rows, setRows] = useState<ContributionRow[]>([]);
  const [nextSerialNumber, setNextSerialNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [exportFileName, setExportFileName] = useState("aaherpatti_contributions");
  const [duplicateFilter, setDuplicateFilter] = useState<DuplicateFilter>("all");
  const [editingRow, setEditingRow] = useState<ContributionRow | null>(null);
  const [tableColumns, setTableColumns] = useState<RowsTableColumn[]>(DEFAULT_TABLE_COLUMNS);
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(
    DEFAULT_TABLE_COLUMNS[0]?.id ?? null
  );

  useEffect(() => {
    if (!tableColumns.some((column) => column.id === selectedColumnId)) {
      setSelectedColumnId(tableColumns[0]?.id ?? null);
    }
  }, [selectedColumnId, tableColumns]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchRows("");
      setRows(result.rows);
      setNextSerialNumber(result.nextSerialNumber);
    } catch (loadError: unknown) {
      const message =
        typeof loadError === "object" && loadError !== null && "message" in loadError
          ? String(loadError.message)
          : "Failed to load rows";

      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const refreshRows = useCallback(async () => {
    await loadRows();
  }, [loadRows]);

  const handleRowCreated = async (row: ContributionRow) => {
    void row;
    await refreshRows();
  };

  const handleRowUpdated = async (row: ContributionRow) => {
    void row;
    await refreshRows();
  };

  const handleDelete = async (row: ContributionRow) => {
    const confirmed = window.confirm(
      `Delete row #${row.serialNumber} for ${row.nameMr}? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteRow(row.id);
      await refreshRows();
    } catch {
      setError("Failed to delete row.");
    }
  };

  const duplicateRowIds = useMemo(() => {
    const grouped = new Map<string, string[]>();

    rows.forEach((row) => {
      const key = buildDuplicateKey(row);
      const existing = grouped.get(key) ?? [];
      existing.push(row.id);
      grouped.set(key, existing);
    });

    const duplicateIds = new Set<string>();
    grouped.forEach((ids) => {
      if (ids.length > 1) {
        ids.forEach((id) => {
          duplicateIds.add(id);
        });
      }
    });

    return duplicateIds;
  }, [rows]);

  const visibleRows = useMemo(() => {
    const normalizedSearch = normalize(search);

    return rows.filter((row) => {
      const isDuplicate = duplicateRowIds.has(row.id);

      if (duplicateFilter === "duplicate" && !isDuplicate) {
        return false;
      }

      if (duplicateFilter === "unique" && isDuplicate) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        String(row.serialNumber),
        row.nameMr,
        row.nameEn,
        row.placeMr,
        row.placeEn,
        String(row.contributionAmount)
      ]
        .map(normalize)
        .join(" ");

      return haystack.includes(normalizedSearch);
    });
  }, [duplicateFilter, duplicateRowIds, rows, search]);

  const overallTotal = useMemo(
    () => rows.reduce((sum, row) => sum + row.contributionAmount, 0),
    [rows]
  );

  const filteredTotal = useMemo(
    () => visibleRows.reduce((sum, row) => sum + row.contributionAmount, 0),
    [visibleRows]
  );

  const summaryText = useMemo(
    () => `Showing ${visibleRows.length} of ${rows.length} rows`,
    [rows.length, visibleRows.length]
  );

  const selectedColumnIndex = useMemo(
    () => tableColumns.findIndex((column) => column.id === selectedColumnId),
    [selectedColumnId, tableColumns]
  );

  const selectedColumn = selectedColumnIndex >= 0 ? tableColumns[selectedColumnIndex] : null;

  const addColumnRelativeToSelection = (position: "before" | "after") => {
    if (selectedColumnIndex < 0) {
      return;
    }

    const label = window.prompt("New column title", "New Column");
    const trimmedLabel = label?.trim() ?? "";
    if (!trimmedLabel) {
      return;
    }

    const newColumn = createCustomColumn(trimmedLabel);
    const insertionIndex = position === "before" ? selectedColumnIndex : selectedColumnIndex + 1;

    setTableColumns((prev) => {
      const next = [...prev];
      next.splice(insertionIndex, 0, newColumn);
      return next;
    });
    setSelectedColumnId(newColumn.id);
  };

  const renameSelectedColumn = () => {
    if (!selectedColumn) {
      return;
    }

    const label = window.prompt("Edit column title", selectedColumn.label);
    const trimmedLabel = label?.trim() ?? "";
    if (!trimmedLabel) {
      return;
    }

    setTableColumns((prev) =>
      prev.map((column) =>
        column.id === selectedColumn.id ? { ...column, label: trimmedLabel } : column
      )
    );
  };

  const deleteSelectedColumn = () => {
    if (!selectedColumn || tableColumns.length <= 1) {
      return;
    }

    const confirmed = window.confirm(`Delete column "${selectedColumn.label}"?`);
    if (!confirmed) {
      return;
    }

    const nextColumns = tableColumns.filter((column) => column.id !== selectedColumn.id);
    setTableColumns(nextColumns);
    setSelectedColumnId(nextColumns[Math.max(0, selectedColumnIndex - 1)]?.id ?? null);
  };

  const resizeColumn = useCallback((columnId: string, width: number) => {
    setTableColumns((prev) =>
      prev.map((column) => (column.id === columnId ? { ...column, width: Math.round(width) } : column))
    );
  }, []);

  return (
    <main className="mx-auto max-w-7xl space-y-4 p-4 pb-8 md:p-6">
      <header className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">
          Voice-Based Structured Data Entry (Marathi + English)
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Capture each field using microphone, verify text visually, edit if needed, then save.
        </p>
      </header>

      <RowCaptureWizard nextSerialNumber={nextSerialNumber} onRowCreated={handleRowCreated} />

      <Card title="Saved Rows" subtitle={summaryText}>
        <div className="mb-4 grid gap-2 lg:grid-cols-[1fr_minmax(220px,1fr)_auto_auto_auto_auto]">
          <div className="min-w-[260px] flex-1">
            <Input
              label="Search / Filter"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by serial, name, place, or amount"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="duplicate-filter">
              Duplicate Filter
            </label>
            <select
              id="duplicate-filter"
              value={duplicateFilter}
              onChange={(event) => setDuplicateFilter(event.target.value as DuplicateFilter)}
              className="h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">All rows</option>
              <option value="duplicate">Potential duplicates</option>
              <option value="unique">Unique rows</option>
            </select>
          </div>

          <div className="min-w-[220px]">
            <Input
              label="Export File Name"
              value={exportFileName}
              onChange={(event) => setExportFileName(event.target.value)}
              placeholder="aaherpatti_contributions"
            />
          </div>

          <Button
            variant="secondary"
            onClick={() => window.open(buildExportUrl("csv", search, exportFileName), "_blank")}
          >
            Export CSV
          </Button>
          <Button
            variant="secondary"
            onClick={() => window.open(buildExportUrl("xlsx", search, exportFileName), "_blank")}
          >
            Export XLSX
          </Button>
          <Button
            variant="secondary"
            onClick={() => window.open(buildExportUrl("pdf", search, exportFileName), "_blank")}
          >
            Export PDF
          </Button>
        </div>

        <div className="mb-4 grid gap-2 lg:grid-cols-[minmax(220px,1fr)_auto_auto_auto_auto]">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="column-select">
              Selected Column
            </label>
            <select
              id="column-select"
              value={selectedColumnId ?? ""}
              onChange={(event) => setSelectedColumnId(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              {tableColumns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.label}
                </option>
              ))}
            </select>
          </div>
          <Button variant="secondary" onClick={() => addColumnRelativeToSelection("before")}>
            Add Before
          </Button>
          <Button variant="secondary" onClick={() => addColumnRelativeToSelection("after")}>
            Add After
          </Button>
          <Button variant="secondary" onClick={renameSelectedColumn}>
            Edit Title
          </Button>
          <Button
            variant="secondary"
            onClick={deleteSelectedColumn}
            disabled={tableColumns.length <= 1}
          >
            Delete Column
          </Button>
        </div>
        <p className="mb-4 text-xs text-slate-500">
          Tip: click any table header to select it, drag the header edge to resize, and use horizontal
          scroll when columns exceed screen width.
        </p>

        <div className="mb-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <p className="text-xs uppercase tracking-wide text-slate-500">Record Count</p>
            <p className="font-semibold text-slate-900">
              {visibleRows.length} / {rows.length}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <p className="text-xs uppercase tracking-wide text-slate-500">Filtered Total</p>
            <p className="font-semibold text-slate-900">{formatAmount(filteredTotal)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <p className="text-xs uppercase tracking-wide text-slate-500">Overall Total</p>
            <p className="font-semibold text-slate-900">{formatAmount(overallTotal)}</p>
          </div>
        </div>

        {loading ? <p className="text-sm text-slate-600">Loading rows...</p> : null}
        {error ? (
          <p className="mb-3 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        <RowsTable
          rows={visibleRows}
          columns={tableColumns}
          selectedColumnId={selectedColumnId}
          duplicateRowIds={duplicateRowIds}
          onSelectColumn={setSelectedColumnId}
          onResizeColumn={resizeColumn}
          onEdit={setEditingRow}
          onDelete={handleDelete}
          emptyMessage={
            rows.length === 0
              ? "No rows available yet. Add your first row above."
              : "No rows match your current filters."
          }
        />
      </Card>

      <RowEditDialog
        row={editingRow}
        onClose={() => setEditingRow(null)}
        onRowUpdated={handleRowUpdated}
      />
    </main>
  );
}
