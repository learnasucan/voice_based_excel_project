import type { ApiEnvelope } from "@/lib/contracts/api";
import type { ContributionRow, CreateRowInput } from "@/lib/contracts/row";

type RowsListData = {
  rows: ContributionRow[];
  totalAmount: number;
  nextSerialNumber: number;
};

type ApiErrorShape = {
  code: string;
  message: string;
  details?: unknown;
};

export class RowsClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, options: { code: string; status: number; details?: unknown }) {
    super(message);
    this.name = "RowsClientError";
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
  }
}

const parseEnvelopeError = (error: ApiErrorShape, status: number): never => {
  throw new RowsClientError(error.message, {
    code: error.code,
    status,
    details: error.details
  });
};

const parseJson = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return response.json();
};

const parseEnvelope = <T>(payload: unknown, status: number): T => {
  if (!payload || typeof payload !== "object") {
    throw new RowsClientError("Unexpected API response", {
      code: "INVALID_RESPONSE",
      status
    });
  }

  const envelope = payload as ApiEnvelope<T>;
  if (envelope.success === true) {
    return envelope.data;
  }

  if (envelope.success === false) {
    parseEnvelopeError(envelope.error, status);
  }

  throw new RowsClientError("Unexpected API response", {
    code: "INVALID_RESPONSE",
    status
  });
};

const parseApiResponse = async <T>(response: Response): Promise<T> => {
  const payload = await parseJson(response);

  if (!response.ok) {
    if (
      payload &&
      typeof payload === "object" &&
      "success" in payload &&
      (payload as { success?: boolean }).success === false
    ) {
      return parseEnvelope<T>(payload, response.status);
    }

    throw new RowsClientError(`Request failed with status ${response.status}`, {
      code: "HTTP_ERROR",
      status: response.status,
      details: payload
    });
  }

  return parseEnvelope<T>(payload, response.status);
};

export async function fetchRows(search = ""): Promise<RowsListData> {
  const params = new URLSearchParams();
  if (search.trim()) {
    params.set("search", search.trim());
  }

  const query = params.toString();
  const response = await fetch(`/api/v1/records${query ? `?${query}` : ""}`, {
    method: "GET",
    cache: "no-store"
  });

  return parseApiResponse<RowsListData>(response);
}

export async function updateRow(
  rowId: string,
  input: CreateRowInput
): Promise<ContributionRow> {
  const response = await fetch(`/api/v1/records/${rowId}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(input)
  });

  return parseApiResponse<ContributionRow>(response);
}

export async function deleteRow(rowId: string): Promise<void> {
  const response = await fetch(`/api/v1/records/${rowId}`, {
    method: "DELETE"
  });

  await parseApiResponse<{ id: string }>(response);
}
