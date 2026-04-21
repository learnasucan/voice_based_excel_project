import type { ContributionRow } from "@/lib/contracts/row";

export type DuplicateFilter = "all" | "duplicate" | "unique";

export type RowEditDraft = {
  nameMr: string;
  nameEn: string;
  contributionAmount: string;
  placeMr: string;
  placeEn: string;
};

export type RowsTableState = {
  phase: "loading" | "ready" | "error";
  rows: ContributionRow[];
  searchTerm: string;
  duplicateFilter: DuplicateFilter;
  editingRowId: string | null;
  draft: RowEditDraft | null;
  saving: boolean;
  deletingRowId: string | null;
  loadError: string | null;
  mutationError: string | null;
  duplicateWarning: string | null;
};

export const initialRowsTableState: RowsTableState = {
  phase: "loading",
  rows: [],
  searchTerm: "",
  duplicateFilter: "all",
  editingRowId: null,
  draft: null,
  saving: false,
  deletingRowId: null,
  loadError: null,
  mutationError: null,
  duplicateWarning: null
};

export type RowsTableAction =
  | { type: "LOAD_START" }
  | { type: "LOAD_SUCCESS"; payload: { rows: ContributionRow[] } }
  | { type: "LOAD_FAILURE"; payload: { message: string } }
  | { type: "SET_SEARCH"; payload: { value: string } }
  | { type: "SET_DUPLICATE_FILTER"; payload: { value: DuplicateFilter } }
  | { type: "START_EDIT"; payload: { row: ContributionRow } }
  | { type: "CHANGE_DRAFT"; payload: { field: keyof RowEditDraft; value: string } }
  | { type: "CANCEL_EDIT" }
  | { type: "SAVE_START" }
  | {
      type: "SAVE_FAILURE";
      payload: { message: string | null; duplicateWarning: string | null };
    }
  | { type: "SAVE_SUCCESS"; payload: { row: ContributionRow } }
  | { type: "DELETE_START"; payload: { rowId: string } }
  | { type: "DELETE_FAILURE"; payload: { message: string } }
  | { type: "DELETE_SUCCESS"; payload: { rowId: string } }
  | { type: "CLEAR_NOTICES" };

export const createDraftFromRow = (row: ContributionRow): RowEditDraft => ({
  nameMr: row.nameMr,
  nameEn: row.nameEn,
  contributionAmount: String(row.contributionAmount),
  placeMr: row.placeMr,
  placeEn: row.placeEn
});

export const rowsTableReducer = (
  state: RowsTableState,
  action: RowsTableAction
): RowsTableState => {
  switch (action.type) {
    case "LOAD_START":
      return {
        ...state,
        phase: "loading",
        loadError: null,
        mutationError: null,
        duplicateWarning: null
      };
    case "LOAD_SUCCESS":
      return {
        ...state,
        phase: "ready",
        rows: action.payload.rows,
        loadError: null
      };
    case "LOAD_FAILURE":
      return {
        ...state,
        phase: "error",
        loadError: action.payload.message,
        rows: []
      };
    case "SET_SEARCH":
      return {
        ...state,
        searchTerm: action.payload.value
      };
    case "SET_DUPLICATE_FILTER":
      return {
        ...state,
        duplicateFilter: action.payload.value
      };
    case "START_EDIT":
      return {
        ...state,
        editingRowId: action.payload.row.id,
        draft: createDraftFromRow(action.payload.row),
        mutationError: null,
        duplicateWarning: null
      };
    case "CHANGE_DRAFT":
      if (!state.draft) {
        return state;
      }

      return {
        ...state,
        draft: {
          ...state.draft,
          [action.payload.field]: action.payload.value
        }
      };
    case "CANCEL_EDIT":
      return {
        ...state,
        editingRowId: null,
        draft: null,
        saving: false
      };
    case "SAVE_START":
      return {
        ...state,
        saving: true,
        mutationError: null,
        duplicateWarning: null
      };
    case "SAVE_FAILURE":
      return {
        ...state,
        saving: false,
        mutationError: action.payload.message,
        duplicateWarning: action.payload.duplicateWarning
      };
    case "SAVE_SUCCESS":
      return {
        ...state,
        rows: state.rows.map((row) => (row.id === action.payload.row.id ? action.payload.row : row)),
        editingRowId: null,
        draft: null,
        saving: false,
        mutationError: null,
        duplicateWarning: null
      };
    case "DELETE_START":
      return {
        ...state,
        deletingRowId: action.payload.rowId,
        mutationError: null
      };
    case "DELETE_FAILURE":
      return {
        ...state,
        deletingRowId: null,
        mutationError: action.payload.message
      };
    case "DELETE_SUCCESS":
      return {
        ...state,
        rows: state.rows.filter((row) => row.id !== action.payload.rowId),
        deletingRowId: null
      };
    case "CLEAR_NOTICES":
      return {
        ...state,
        mutationError: null,
        duplicateWarning: null
      };
    default:
      return state;
  }
};
