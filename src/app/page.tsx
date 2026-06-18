"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ContributionRow, EntryType } from "@/lib/contracts/row";
import { deleteRow, fetchRows } from "@/lib/utils/apiClient";
import { RowCaptureWizard } from "@/components/row-form/RowCaptureWizard";
import { RowEditDialog } from "@/components/rows/RowEditDialog";
import { RowsTable, RowsTableColumn } from "@/components/table/RowsTable";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

type DuplicateFilter = "all" | "cash" | "gift" | "cash_and_gift" | "duplicate" | "possible" | "unique";

const buildExportUrl = (
  format: "csv" | "xlsx" | "pdf",
  search: string,
  fileName: string
): string =>
  `/api/export?format=${format}&search=${encodeURIComponent(search)}&fileName=${encodeURIComponent(fileName.trim())}`;

const buildDuplicateKey = (row: ContributionRow): string =>
  `${row.entryType}|${row.nameMrKey}|${row.contributionAmount ?? ""}|${row.giftNameMrKey ?? ""}|${row.placeMrKey}`;

const formatAmount = (value: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);

const normalize = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, " ");

const DEFAULT_TABLE_COLUMNS: RowsTableColumn[] = [
  { id: "serialNumber", label: "#", kind: "field", accessor: "serialNumber", width: 80 },
  { id: "name", label: "Name (MR / EN)", kind: "name", width: 300 },
  {
    id: "contributionAmount",
    label: "Amount",
    kind: "field",
    accessor: "contributionAmount",
    width: 140
  },
  { id: "entryType", label: "Type", kind: "field", accessor: "entryType", width: 130 },
  { id: "giftNameMr", label: "Gift (MR)", kind: "field", accessor: "giftNameMr", width: 160 },
  { id: "place", label: "Place (MR / EN)", kind: "place", width: 260 },
  { id: "actions", label: "Actions", kind: "actions", width: 190 }
];

const createCustomColumn = (label: string): RowsTableColumn => ({
  id: `custom-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
  label,
  kind: "custom",
  width: 180
});

export default function HomePage() {
  const entrySectionRef = useRef<HTMLDivElement | null>(null);
  const recordsSectionRef = useRef<HTMLElement | null>(null);
  const reportsSectionRef = useRef<HTMLElement | null>(null);
  const [rows, setRows] = useState<ContributionRow[]>([]);
  const [nextSerialNumber, setNextSerialNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [exportFileName, setExportFileName] = useState("aaherpatti_contributions");
  const [duplicateFilter, setDuplicateFilter] = useState<DuplicateFilter>("all");
  const [editingRow, setEditingRow] = useState<ContributionRow | null>(null);
  const [tableColumns, setTableColumns] = useState<RowsTableColumn[]>(DEFAULT_TABLE_COLUMNS);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);
  const [darkTheme, setDarkTheme] = useState(false);
  const [activeSection, setActiveSection] = useState("Entry");
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

      if ((duplicateFilter === "duplicate" || duplicateFilter === "possible") && !isDuplicate) {
        return false;
      }

      if (duplicateFilter === "unique" && isDuplicate) {
        return false;
      }

      if (
        (["cash", "gift", "cash_and_gift"] as EntryType[]).includes(
          duplicateFilter as EntryType
        ) &&
        row.entryType !== duplicateFilter
      ) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        String(row.serialNumber),
        row.nameMr,
        row.nameEn,
        row.entryType,
        row.giftNameMr ?? "",
        row.giftNameEn ?? "",
        row.placeMr,
        row.placeEn,
        String(row.contributionAmount ?? "")
      ]
        .map(normalize)
        .join(" ");

      return haystack.includes(normalizedSearch);
    });
  }, [duplicateFilter, duplicateRowIds, rows, search]);

  const overallTotal = useMemo(
    () =>
      rows.reduce(
        (sum, row) =>
          row.entryType === "cash" || row.entryType === "cash_and_gift"
            ? sum + (row.contributionAmount ?? 0)
            : sum,
        0
      ),
    [rows]
  );

  const filteredTotal = useMemo(
    () =>
      visibleRows.reduce(
        (sum, row) =>
          row.entryType === "cash" || row.entryType === "cash_and_gift"
            ? sum + (row.contributionAmount ?? 0)
            : sum,
        0
      ),
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

  const scrollToSection = (section: "Entry" | "Records" | "Reports") => {
    setActiveSection(section);
    const target =
      section === "Entry"
        ? entrySectionRef.current
        : section === "Records"
          ? recordsSectionRef.current
          : reportsSectionRef.current;

    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const sidebarIcons: Record<string, string> = {
  Entry: "/entry.png",
  Records: "/records.png",
  Reports: "/reports.png",
  Export: "/export.png",
  Settings: "/settings.png",
  Theme: "/theme.png",
  Light: "/theme.png"
};

  const handleSideMenuClick = (item: string) => {
    if (item === "Entry" || item === "Records" || item === "Reports") {
      scrollToSection(item);
      setExportMenuOpen(false);
      setColumnsMenuOpen(false);
      return;
    }

    if (item === "Export") {
      scrollToSection("Records");
      setExportMenuOpen(true);
      setColumnsMenuOpen(false);
      setActiveSection("Export");
      return;
    }

    if (item === "Settings") {
      scrollToSection("Records");
      setColumnsMenuOpen(true);
      setExportMenuOpen(false);
      setActiveSection("Settings");
      return;
    }

    if (item === "Theme") {
      setDarkTheme((value) => !value);
      setActiveSection("Theme");
    }
  };

  return (
    <div className={`min-h-screen ${darkTheme ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-950"}`}>
      <aside className={`fixed inset-y-0 left-0 z-30 hidden w-28 border-r p-3 shadow-sm lg:block ${
        darkTheme ? "border-slate-800 bg-slate-900/95" : "border-slate-200 bg-white/95"
      }`}>
        <div className="flex h-full flex-col items-center justify-between">
          <div className="w-full space-y-5">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                <path d="M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" stroke="currentColor" strokeWidth="2" />
                <path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            {["Entry", "Records", "Reports", "Export", "Settings", darkTheme ? "Light" : "Theme"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => handleSideMenuClick(item === "Light" ? "Theme" : item)}
                className={`flex w-full flex-col items-center gap-1 rounded-lg px-2 py-3 text-xs font-semibold ${
                  activeSection === item || (activeSection === "Theme" && item === "Light")
                    ? "bg-blue-50 text-blue-700"
                    : darkTheme
                      ? "text-slate-300 hover:bg-slate-800 hover:text-white"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                }`}
              >
                
<img
  src={sidebarIcons[item]}
  alt=""
  className="h-6 w-6 object-contain"
/>
                {item}
              </button>
            ))}
          </div>
          <div className={`w-full rounded-lg border p-2 text-center text-xs font-semibold ${
            darkTheme
              ? "border-slate-700 bg-slate-800 text-slate-100"
              : "border-slate-200 bg-white text-slate-600"
          }`}>
            Menu
          </div>
        </div>
      </aside>

      <main className="mx-auto max-w-[1440px] space-y-3 p-3 pb-8 md:p-5 lg:ml-28">
      <header ref={reportsSectionRef} className="scroll-mt-4 grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-center">
        <div>
          <h1 className="text-2xl font-black tracking-normal text-slate-950">
            Voice-Based Structured Data Entry
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-600">Speak once. Verify. Save.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:min-w-[360px]">
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Total Records</p>
            <p className="mt-1 text-xl font-bold text-slate-950">{rows.length}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Overall Total</p>
            <p className="mt-1 text-xl font-bold text-slate-950">{formatAmount(overallTotal)}</p>
          </div>
        </div>
        <Button variant="secondary" className="h-11 justify-self-start lg:justify-self-end">
          How it works?
        </Button>
      </header>

      <div ref={entrySectionRef} className="scroll-mt-4">
        <RowCaptureWizard nextSerialNumber={nextSerialNumber} onRowCreated={handleRowCreated} />
      </div>

      <Card
        title="Saved Entries"
        subtitle={`${visibleRows.length} records - ${formatAmount(filteredTotal)} total`}
        className="scroll-mt-4"
      >
        <section ref={recordsSectionRef} className="border-b border-slate-200 pb-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="min-w-[260px] flex-1 md:max-w-sm">
              <Input
                aria-label="Search saved entries"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search..."
              />
            </div>

            <select
              aria-label="Duplicate filter"
              value={duplicateFilter}
              onChange={(event) => setDuplicateFilter(event.target.value as DuplicateFilter)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">All rows</option>
              <option value="cash">Cash</option>
              <option value="gift">Gift</option>
              <option value="cash_and_gift">Cash + Gift</option>
              <option value="unique">Unique only</option>
              <option value="duplicate">Duplicates only</option>
              <option value="possible">Possible duplicates</option>
            </select>

            <div className="relative">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setExportMenuOpen((value) => !value);
                  setColumnsMenuOpen(false);
                }}
              >
                Export
              </Button>
              {exportMenuOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                  {(["csv", "xlsx", "pdf"] as const).map((format) => (
                    <button
                      key={format}
                      type="button"
                      className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                      onClick={() => {
                        setExportMenuOpen(false);
                        window.open(buildExportUrl(format, search, exportFileName), "_blank");
                      }}
                    >
                      Export {format.toUpperCase()}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="relative">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setColumnsMenuOpen((value) => !value);
                  setExportMenuOpen(false);
                }}
              >
                Columns
              </Button>
              {columnsMenuOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                  <label className="mb-2 block text-xs font-semibold text-slate-600" htmlFor="column-select">
                    Select Columns
                  </label>
                  <select
                    id="column-select"
                    value={selectedColumnId ?? ""}
                    onChange={(event) => setSelectedColumnId(event.target.value)}
                    className="mb-2 h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
                  >
                    {tableColumns.map((column) => (
                      <option key={column.id} value={column.id}>
                        {column.label}
                      </option>
                    ))}
                  </select>
                  <button className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => addColumnRelativeToSelection("before")}>
                    Add Before
                  </button>
                  <button className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => addColumnRelativeToSelection("after")}>
                    Add After
                  </button>
                  <button className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={renameSelectedColumn}>
                    Rename Column
                  </button>
                  <button className="block w-full rounded-md px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50" onClick={deleteSelectedColumn} disabled={tableColumns.length <= 1}>
                    Delete Column
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {loading ? <p className="text-sm text-slate-600">Loading rows...</p> : null}
        {error ? (
          <p className="my-3 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        <div className="pt-4">
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
          <p className="mt-3 text-xs text-slate-500">{summaryText}</p>
        </div>
      </Card>

      <RowEditDialog
        row={editingRow}
        onClose={() => setEditingRow(null)}
        onRowUpdated={handleRowUpdated}
      />
      </main>
    </div>
  );
}
