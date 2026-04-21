import { createRecordsApi } from "./api.js";

const api = createRecordsApi();

const initialState = {
  loading: true,
  error: null,
  records: [],
  query: "",
  duplicateFilter: "all",
  duplicateWarning: null,
  editingId: null,
  deletingId: null,
};

let state = { ...initialState };

const ACTIONS = {
  LOAD_START: "LOAD_START",
  LOAD_SUCCESS: "LOAD_SUCCESS",
  LOAD_ERROR: "LOAD_ERROR",
  SET_QUERY: "SET_QUERY",
  SET_DUPLICATE_FILTER: "SET_DUPLICATE_FILTER",
  EDIT_START: "EDIT_START",
  EDIT_SUCCESS: "EDIT_SUCCESS",
  EDIT_ERROR: "EDIT_ERROR",
  DELETE_START: "DELETE_START",
  DELETE_SUCCESS: "DELETE_SUCCESS",
  DELETE_ERROR: "DELETE_ERROR",
};

const elements = {
  duplicateWarning: document.querySelector("#duplicate-warning"),
  searchInput: document.querySelector("#search-input"),
  duplicateFilter: document.querySelector("#duplicate-filter"),
  recordCount: document.querySelector("#record-count"),
  filteredTotal: document.querySelector("#filtered-total"),
  overallTotal: document.querySelector("#overall-total"),
  loadingState: document.querySelector("#loading-state"),
  errorState: document.querySelector("#error-state"),
  errorMessage: document.querySelector("#error-message"),
  retryBtn: document.querySelector("#retry-btn"),
  emptyState: document.querySelector("#empty-state"),
  tableState: document.querySelector("#table-state"),
  recordsBody: document.querySelector("#records-body"),
};

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function escapeHtml(value) {
  const asText = String(value ?? "");
  return asText
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function totalAmount(records) {
  return records.reduce((sum, record) => sum + (Number(record.amount) || 0), 0);
}

function findVisibleRecords() {
  const query = state.query.trim().toLowerCase();
  return state.records.filter((record) => {
    if (state.duplicateFilter !== "all" && record.duplicateStatus !== state.duplicateFilter) {
      return false;
    }

    if (!query) {
      return true;
    }

    return (
      record.name.toLowerCase().includes(query) ||
      (record.note || "").toLowerCase().includes(query)
    );
  });
}

function reducer(currentState, action) {
  switch (action.type) {
    case ACTIONS.LOAD_START:
      return {
        ...currentState,
        loading: true,
        error: null,
      };
    case ACTIONS.LOAD_SUCCESS:
      return {
        ...currentState,
        loading: false,
        error: null,
        records: action.payload.records,
        duplicateWarning: null,
      };
    case ACTIONS.LOAD_ERROR:
      return {
        ...currentState,
        loading: false,
        editingId: null,
        deletingId: null,
        error: action.payload.error,
      };
    case ACTIONS.SET_QUERY:
      return {
        ...currentState,
        query: action.payload.query,
      };
    case ACTIONS.SET_DUPLICATE_FILTER:
      return {
        ...currentState,
        duplicateFilter: action.payload.duplicateFilter,
      };
    case ACTIONS.EDIT_START:
      return {
        ...currentState,
        editingId: action.payload.recordId,
        error: null,
      };
    case ACTIONS.EDIT_SUCCESS:
      return {
        ...currentState,
        editingId: null,
        error: null,
        duplicateWarning: action.payload.duplicateWarning,
        records: currentState.records.map((record) =>
          record.id === action.payload.record.id ? action.payload.record : record,
        ),
      };
    case ACTIONS.EDIT_ERROR:
      return {
        ...currentState,
        editingId: null,
        error: action.payload.error,
      };
    case ACTIONS.DELETE_START:
      return {
        ...currentState,
        deletingId: action.payload.recordId,
        error: null,
      };
    case ACTIONS.DELETE_SUCCESS:
      return {
        ...currentState,
        deletingId: null,
        error: null,
        records: currentState.records.filter((record) => record.id !== action.payload.recordId),
      };
    case ACTIONS.DELETE_ERROR:
      return {
        ...currentState,
        deletingId: null,
        error: action.payload.error,
      };
    default:
      return currentState;
  }
}

function dispatch(action) {
  state = reducer(state, action);
  render();
}

function renderSummary(visibleRecords) {
  elements.recordCount.textContent = `${visibleRecords.length} / ${state.records.length}`;
  elements.filteredTotal.textContent = formatCurrency(totalAmount(visibleRecords));
  elements.overallTotal.textContent = formatCurrency(totalAmount(state.records));
}

function renderBanner() {
  if (state.duplicateWarning) {
    elements.duplicateWarning.classList.remove("hidden");
    elements.duplicateWarning.textContent = state.duplicateWarning;
    return;
  }

  elements.duplicateWarning.classList.add("hidden");
  elements.duplicateWarning.textContent = "";
}

function renderTableRows(records) {
  elements.recordsBody.innerHTML = records
    .map((record) => {
      const isBusy = state.editingId === record.id || state.deletingId === record.id;
      const duplicateLabel =
        record.duplicateStatus === "duplicate"
          ? `<span class="tag duplicate">Duplicate${
              record.duplicateOfId ? ` of #${escapeHtml(record.duplicateOfId)}` : ""
            }</span>`
          : '<span class="tag">Unique</span>';

      return `
        <tr data-row-id="${escapeHtml(record.id)}">
          <td>${escapeHtml(record.name)}</td>
          <td class="right">${formatCurrency(Number(record.amount) || 0)}</td>
          <td>${escapeHtml(record.note || "-")}</td>
          <td>${duplicateLabel}</td>
          <td class="actions">
            <button type="button" data-action="edit" data-id="${escapeHtml(record.id)}" ${
              isBusy ? "disabled" : ""
            }>Edit</button>
            <button type="button" class="danger" data-action="delete" data-id="${escapeHtml(record.id)}" ${
              isBusy ? "disabled" : ""
            }>Delete</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function render() {
  const visibleRecords = findVisibleRecords();

  renderBanner();
  renderSummary(visibleRecords);

  if (state.loading) {
    elements.loadingState.classList.remove("hidden");
    elements.errorState.classList.add("hidden");
    elements.emptyState.classList.add("hidden");
    elements.tableState.classList.add("hidden");
    return;
  }

  elements.loadingState.classList.add("hidden");

  if (state.error) {
    elements.errorState.classList.remove("hidden");
    elements.errorMessage.textContent = state.error;
    elements.emptyState.classList.add("hidden");
    elements.tableState.classList.add("hidden");
    return;
  }

  elements.errorState.classList.add("hidden");

  if (visibleRecords.length === 0) {
    elements.emptyState.classList.remove("hidden");
    elements.emptyState.textContent =
      state.records.length === 0
        ? "No saved records yet."
        : "No records match your current filters.";
    elements.tableState.classList.add("hidden");
    return;
  }

  elements.emptyState.classList.add("hidden");
  elements.tableState.classList.remove("hidden");
  renderTableRows(visibleRecords);
}

async function loadRecords() {
  dispatch({ type: ACTIONS.LOAD_START });
  try {
    const result = await api.listRecords();
    dispatch({
      type: ACTIONS.LOAD_SUCCESS,
      payload: { records: result.records || [] },
    });
  } catch (error) {
    dispatch({
      type: ACTIONS.LOAD_ERROR,
      payload: {
        error: error instanceof Error ? error.message : "Unable to fetch records.",
      },
    });
  }
}

function promptRowEdit(record) {
  const nextName = window.prompt("Edit name", record.name);
  if (nextName === null) {
    return null;
  }

  const nextAmountRaw = window.prompt("Edit amount", String(record.amount ?? 0));
  if (nextAmountRaw === null) {
    return null;
  }

  const nextAmount = Number(nextAmountRaw);
  if (!Number.isFinite(nextAmount) || nextAmount < 0) {
    window.alert("Please enter a valid non-negative number.");
    return null;
  }

  const nextNote = window.prompt("Edit note", record.note || "");
  if (nextNote === null) {
    return null;
  }

  return {
    name: nextName.trim(),
    amount: nextAmount,
    note: nextNote.trim(),
  };
}

async function handleEdit(recordId) {
  const record = state.records.find((candidate) => candidate.id === recordId);
  if (!record) {
    return;
  }

  const patch = promptRowEdit(record);
  if (!patch) {
    return;
  }

  dispatch({
    type: ACTIONS.EDIT_START,
    payload: { recordId },
  });

  try {
    const result = await api.updateRecord(recordId, patch);
    const updatedRecord = result.record;

    let duplicateWarning = null;
    if (result.status === "duplicate") {
      duplicateWarning = result.duplicateOfId
        ? `Duplicate detected: row #${recordId} matches existing row #${result.duplicateOfId}.`
        : `Duplicate detected: row #${recordId} matches an existing record.`;
    }

    dispatch({
      type: ACTIONS.EDIT_SUCCESS,
      payload: { record: updatedRecord, duplicateWarning },
    });
  } catch (error) {
    dispatch({
      type: ACTIONS.EDIT_ERROR,
      payload: {
        error: error instanceof Error ? error.message : "Failed to update record.",
      },
    });
  }
}

async function handleDelete(recordId) {
  const record = state.records.find((candidate) => candidate.id === recordId);
  if (!record) {
    return;
  }

  const confirmed = window.confirm(`Delete record \"${record.name}\"?`);
  if (!confirmed) {
    return;
  }

  dispatch({
    type: ACTIONS.DELETE_START,
    payload: { recordId },
  });

  try {
    await api.deleteRecord(recordId);
    dispatch({
      type: ACTIONS.DELETE_SUCCESS,
      payload: { recordId },
    });
  } catch (error) {
    dispatch({
      type: ACTIONS.DELETE_ERROR,
      payload: {
        error: error instanceof Error ? error.message : "Failed to delete record.",
      },
    });
  }
}

function wireEvents() {
  elements.searchInput.addEventListener("input", (event) => {
    dispatch({
      type: ACTIONS.SET_QUERY,
      payload: { query: event.target.value },
    });
  });

  elements.duplicateFilter.addEventListener("change", (event) => {
    dispatch({
      type: ACTIONS.SET_DUPLICATE_FILTER,
      payload: { duplicateFilter: event.target.value },
    });
  });

  elements.retryBtn.addEventListener("click", () => {
    void loadRecords();
  });

  elements.recordsBody.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }

    const { action, id } = button.dataset;
    if (!id) {
      return;
    }

    if (action === "edit") {
      void handleEdit(id);
      return;
    }

    if (action === "delete") {
      void handleDelete(id);
    }
  });
}

wireEvents();
render();
void loadRecords();
