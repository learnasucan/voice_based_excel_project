"use client";

import { useCallback, useEffect, useMemo, useReducer } from "react";
import type { ContributionRow, CreateRowInput } from "@/lib/contracts/row";
import {
  deleteRow,
  fetchRows,
  RowsClientError,
  updateRow
} from "@/modules/records/services/rows-client";
import {
  initialRowsTableState,
  rowsTableReducer,
  type DuplicateFilter,
  type RowEditDraft
} from "@/modules/records/components/rows-table.reducer";

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number.isFinite(value) ? value : 0);

const normalizeText = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, " ");

const buildDuplicateKey = (row: ContributionRow): string =>
  `${row.nameMrKey}|${row.contributionAmount}|${row.placeMrKey}`;

const getDuplicateWarningMessage = (error: RowsClientError): string | null => {
  if (error.code !== "DUPLICATE_ROW") {
    return null;
  }

  const details = error.details as { matchedRow?: ContributionRow } | undefined;
  if (details?.matchedRow) {
    return `Duplicate detected. This row matches #${details.matchedRow.serialNumber} (${details.matchedRow.nameMr}).`;
  }

  return "Duplicate detected. Please change name/place/amount before saving.";
};

const toMutationError = (error: unknown): string => {
  if (error instanceof RowsClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected request failure.";
};

const validateDraft = (draft: RowEditDraft): string | null => {
  if (!draft.nameMr.trim()) {
    return "Name (MR) is required.";
  }

  if (!draft.nameEn.trim()) {
    return "Name (EN) is required.";
  }

  if (!draft.placeMr.trim()) {
    return "Place (MR) is required.";
  }

  if (!draft.placeEn.trim()) {
    return "Place (EN) is required.";
  }

  const amount = Number(draft.contributionAmount);
  if (!Number.isInteger(amount) || amount <= 0) {
    return "Amount must be a positive whole number.";
  }

  return null;
};

const draftToUpdateInput = (draft: RowEditDraft): CreateRowInput => ({
  nameMr: draft.nameMr.trim(),
  nameEn: draft.nameEn.trim(),
  contributionAmount: Number(draft.contributionAmount),
  placeMr: draft.placeMr.trim(),
  placeEn: draft.placeEn.trim()
});

export function RecordsTablePage() {
  const [state, dispatch] = useReducer(rowsTableReducer, initialRowsTableState);

  const loadRows = useCallback(async () => {
    dispatch({ type: "LOAD_START" });

    try {
      const result = await fetchRows();
      dispatch({ type: "LOAD_SUCCESS", payload: { rows: result.rows } });
    } catch (error) {
      dispatch({
        type: "LOAD_FAILURE",
        payload: { message: toMutationError(error) }
      });
    }
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const duplicateRowIds = useMemo(() => {
    const grouped = new Map<string, string[]>();

    state.rows.forEach((row) => {
      const key = buildDuplicateKey(row);
      const ids = grouped.get(key) ?? [];
      ids.push(row.id);
      grouped.set(key, ids);
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
  }, [state.rows]);

  const visibleRows = useMemo(() => {
    const search = normalizeText(state.searchTerm);

    return state.rows.filter((row) => {
      const isDuplicate = duplicateRowIds.has(row.id);

      if (state.duplicateFilter === "duplicate" && !isDuplicate) {
        return false;
      }

      if (state.duplicateFilter === "unique" && isDuplicate) {
        return false;
      }

      if (!search) {
        return true;
      }

      const haystack = [
        String(row.serialNumber),
        row.nameMr,
        row.nameEn,
        String(row.contributionAmount),
        row.placeMr,
        row.placeEn
      ]
        .map(normalizeText)
        .join(" ");

      return haystack.includes(search);
    });
  }, [duplicateRowIds, state.duplicateFilter, state.rows, state.searchTerm]);

  const overallTotal = useMemo(
    () => state.rows.reduce((sum, row) => sum + row.contributionAmount, 0),
    [state.rows]
  );

  const filteredTotal = useMemo(
    () => visibleRows.reduce((sum, row) => sum + row.contributionAmount, 0),
    [visibleRows]
  );

  const onChangeFilter = (value: string) => {
    dispatch({
      type: "SET_DUPLICATE_FILTER",
      payload: { value: value as DuplicateFilter }
    });
  };

  const onSaveEdit = async () => {
    if (!state.editingRowId || !state.draft) {
      return;
    }

    const validationError = validateDraft(state.draft);
    if (validationError) {
      dispatch({
        type: "SAVE_FAILURE",
        payload: {
          message: validationError,
          duplicateWarning: null
        }
      });
      return;
    }

    dispatch({ type: "SAVE_START" });

    try {
      const updated = await updateRow(state.editingRowId, draftToUpdateInput(state.draft));
      dispatch({ type: "SAVE_SUCCESS", payload: { row: updated } });
    } catch (error) {
      if (error instanceof RowsClientError) {
        dispatch({
          type: "SAVE_FAILURE",
          payload: {
            message: error.code === "DUPLICATE_ROW" ? null : error.message,
            duplicateWarning: getDuplicateWarningMessage(error)
          }
        });
        return;
      }

      dispatch({
        type: "SAVE_FAILURE",
        payload: {
          message: toMutationError(error),
          duplicateWarning: null
        }
      });
    }
  };

  const onDeleteRow = async (row: ContributionRow) => {
    const confirmed = window.confirm(`Delete row #${row.serialNumber}?`);
    if (!confirmed) {
      return;
    }

    dispatch({ type: "DELETE_START", payload: { rowId: row.id } });

    try {
      await deleteRow(row.id);
      dispatch({ type: "DELETE_SUCCESS", payload: { rowId: row.id } });
    } catch (error) {
      dispatch({
        type: "DELETE_FAILURE",
        payload: {
          message: toMutationError(error)
        }
      });
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Saved Records</h1>
        <p className="text-sm text-slate-600">Review rows, update values, and remove incorrect entries.</p>
      </header>

      <section className="mt-5 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Record count</p>
          <p className="text-xl font-semibold text-slate-900">
            {visibleRows.length} <span className="text-sm font-medium text-slate-500">/ {state.rows.length}</span>
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Filtered total</p>
          <p className="text-xl font-semibold text-slate-900">{formatCurrency(filteredTotal)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Overall total</p>
          <p className="text-xl font-semibold text-slate-900">{formatCurrency(overallTotal)}</p>
        </div>
      </section>

      <section className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm text-slate-700" htmlFor="record-search">
          <span>Search</span>
          <input
            id="record-search"
            type="search"
            placeholder="Search by name, place, amount, or serial"
            value={state.searchTerm}
            onChange={(event) => {
              dispatch({ type: "SET_SEARCH", payload: { value: event.target.value } });
            }}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <label className="space-y-1 text-sm text-slate-700" htmlFor="duplicate-filter">
          <span>Duplicate filter</span>
          <select
            id="duplicate-filter"
            value={state.duplicateFilter}
            onChange={(event) => {
              onChangeFilter(event.target.value);
            }}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            <option value="all">All rows</option>
            <option value="duplicate">Potential duplicates</option>
            <option value="unique">Unique rows</option>
          </select>
        </label>
      </section>

      {state.duplicateWarning ? (
        <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
          {state.duplicateWarning}
        </div>
      ) : null}

      {state.mutationError ? (
        <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900" role="alert">
          {state.mutationError}
        </div>
      ) : null}

      {state.phase === "loading" ? (
        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading records...
        </section>
      ) : null}

      {state.phase === "error" ? (
        <section className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-6">
          <p className="text-sm text-rose-900">{state.loadError ?? "Unable to load records."}</p>
          <button
            type="button"
            onClick={() => {
              void loadRows();
            }}
            className="mt-3 inline-flex items-center rounded-md border border-rose-300 bg-white px-3 py-2 text-sm font-medium text-rose-900 hover:bg-rose-100"
          >
            Retry
          </button>
        </section>
      ) : null}

      {state.phase === "ready" && visibleRows.length === 0 ? (
        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          {state.rows.length === 0
            ? "No saved records yet."
            : "No rows match your current search or filter."}
        </section>
      ) : null}

      {state.phase === "ready" && visibleRows.length > 0 ? (
        <section className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-[980px] divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-3">#</th>
                <th className="px-3 py-3">Name (MR)</th>
                <th className="px-3 py-3">Name (EN)</th>
                <th className="px-3 py-3 text-right">Amount</th>
                <th className="px-3 py-3">Place (MR)</th>
                <th className="px-3 py-3">Place (EN)</th>
                <th className="px-3 py-3">Duplicate</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {visibleRows.map((row) => {
                const draft = state.editingRowId === row.id ? state.draft : null;
                const isEditing = Boolean(draft);
                const isDeleting = state.deletingRowId === row.id;
                const duplicateTag = duplicateRowIds.has(row.id);

                return (
                  <tr key={row.id}>
                    <td className="px-3 py-3 align-top font-medium text-slate-700">{row.serialNumber}</td>

                    <td className="px-3 py-3 align-top">
                      {isEditing ? (
                        <input
                          value={draft?.nameMr ?? ""}
                          onChange={(event) => {
                            dispatch({
                              type: "CHANGE_DRAFT",
                              payload: { field: "nameMr", value: event.target.value }
                            });
                          }}
                          className="w-full rounded-md border border-slate-300 px-2 py-1.5"
                        />
                      ) : (
                        row.nameMr
                      )}
                    </td>

                    <td className="px-3 py-3 align-top">
                      {isEditing ? (
                        <input
                          value={draft?.nameEn ?? ""}
                          onChange={(event) => {
                            dispatch({
                              type: "CHANGE_DRAFT",
                              payload: { field: "nameEn", value: event.target.value }
                            });
                          }}
                          className="w-full rounded-md border border-slate-300 px-2 py-1.5"
                        />
                      ) : (
                        row.nameEn
                      )}
                    </td>

                    <td className="px-3 py-3 text-right align-top">
                      {isEditing ? (
                        <input
                          value={draft?.contributionAmount ?? ""}
                          onChange={(event) => {
                            dispatch({
                              type: "CHANGE_DRAFT",
                              payload: { field: "contributionAmount", value: event.target.value }
                            });
                          }}
                          className="w-28 rounded-md border border-slate-300 px-2 py-1.5 text-right"
                          inputMode="numeric"
                        />
                      ) : (
                        formatCurrency(row.contributionAmount)
                      )}
                    </td>

                    <td className="px-3 py-3 align-top">
                      {isEditing ? (
                        <input
                          value={draft?.placeMr ?? ""}
                          onChange={(event) => {
                            dispatch({
                              type: "CHANGE_DRAFT",
                              payload: { field: "placeMr", value: event.target.value }
                            });
                          }}
                          className="w-full rounded-md border border-slate-300 px-2 py-1.5"
                        />
                      ) : (
                        row.placeMr
                      )}
                    </td>

                    <td className="px-3 py-3 align-top">
                      {isEditing ? (
                        <input
                          value={draft?.placeEn ?? ""}
                          onChange={(event) => {
                            dispatch({
                              type: "CHANGE_DRAFT",
                              payload: { field: "placeEn", value: event.target.value }
                            });
                          }}
                          className="w-full rounded-md border border-slate-300 px-2 py-1.5"
                        />
                      ) : (
                        row.placeEn
                      )}
                    </td>

                    <td className="px-3 py-3 align-top">
                      {duplicateTag ? (
                        <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900">
                          Potential duplicate
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                          Unique
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-3 align-top">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={state.saving}
                            onClick={() => {
                              void onSaveEdit();
                            }}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {state.saving ? "Saving..." : "Save"}
                          </button>
                          <button
                            type="button"
                            disabled={state.saving}
                            onClick={() => {
                              dispatch({ type: "CANCEL_EDIT" });
                            }}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={Boolean(state.deletingRowId) || state.saving}
                            onClick={() => {
                              dispatch({ type: "START_EDIT", payload: { row } });
                            }}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={isDeleting || state.saving}
                            onClick={() => {
                              void onDeleteRow(row);
                            }}
                            className="rounded-md border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isDeleting ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : null}
    </main>
  );
}
