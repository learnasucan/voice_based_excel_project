import {
  ApiEnvelope,
  DuplicateCheckResponseDataSchema,
  RowsListDataSchema
} from "@/lib/contracts/api";
import {
  ContributionRow,
  CreateRowInput,
  DuplicateCheckInput,
  FieldProcessInput,
  FieldProcessResult,
  FieldProcessResultSchema,
  TopUpVoiceInput,
  TopUpVoiceResult,
  TopUpVoiceResultSchema
} from "@/lib/contracts/row";

type FetchOptions = RequestInit & {
  expectedStatus?: number;
};

export class ApiClientError extends Error {
  code: string;
  details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.details = details;
  }
}

const parseJson = async <T>(response: Response): Promise<ApiEnvelope<T>> => {
  return (await response.json()) as ApiEnvelope<T>;
};

const assertSuccess = <T>(payload: ApiEnvelope<T>): T => {
  if (!payload.success) {
    throw new ApiClientError(payload.error.code, payload.error.message, payload.error.details);
  }

  return payload.data;
};

export const fetchRows = async (search: string) => {
  const response = await fetch(`/api/rows?search=${encodeURIComponent(search)}`);
  const payload = await parseJson<unknown>(response);
  const data = assertSuccess(payload);
  return RowsListDataSchema.parse(data);
};

export const createRow = async (input: CreateRowInput): Promise<ContributionRow> => {
  const response = await fetch("/api/rows", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  const payload = await parseJson<ContributionRow>(response);
  return assertSuccess(payload);
};

export const updateRow = async (
  id: string,
  input: CreateRowInput
): Promise<ContributionRow> => {
  const response = await fetch(`/api/rows/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  const payload = await parseJson<ContributionRow>(response);
  return assertSuccess(payload);
};

export const deleteRow = async (id: string, options?: FetchOptions): Promise<void> => {
  const response = await fetch(`/api/rows/${id}`, {
    method: "DELETE",
    ...options
  });

  const payload = await parseJson<{ id: string }>(response);
  assertSuccess(payload);
};

export const checkDuplicate = async (
  input: DuplicateCheckInput
): Promise<{ isDuplicate: boolean; matchedRow?: ContributionRow }> => {
  const response = await fetch("/api/rows/duplicate-check", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  const payload = await parseJson<unknown>(response);
  const data = assertSuccess(payload);

  return DuplicateCheckResponseDataSchema.parse(data);
};

export const processVoiceField = async (
  input: FieldProcessInput
): Promise<FieldProcessResult> => {
  const response = await fetch("/api/ai/process-field", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  const payload = await parseJson<unknown>(response);
  const data = assertSuccess(payload);
  return FieldProcessResultSchema.parse(data);
};

export const processVoiceTopUp = async (
  input: TopUpVoiceInput
): Promise<TopUpVoiceResult> => {
  const response = await fetch("/api/ai/process-top-up", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  const payload = await parseJson<unknown>(response);
  const data = assertSuccess(payload);
  return TopUpVoiceResultSchema.parse(data);
};
