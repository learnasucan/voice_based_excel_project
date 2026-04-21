let fallbackIdCounter = 1000;

function nextFallbackId() {
  fallbackIdCounter += 1;
  return String(fallbackIdCounter);
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeDuplicateStatus(value, isDuplicateFlag) {
  if (value === "duplicate" || isDuplicateFlag === true) {
    return "duplicate";
  }
  return "unique";
}

function normalizeRecord(input) {
  const source = input || {};
  const id = source.id ?? source.recordId ?? source.uuid ?? nextFallbackId();
  return {
    id: String(id),
    name: String(source.name ?? source.title ?? source.personName ?? "").trim(),
    amount: toNumber(source.amount ?? source.total ?? source.value),
    note: String(source.note ?? source.notes ?? source.description ?? "").trim(),
    duplicateStatus: normalizeDuplicateStatus(source.duplicateStatus, source.isDuplicate),
    duplicateOfId: source.duplicateOfId ? String(source.duplicateOfId) : null,
    updatedAt: source.updatedAt ?? source.modifiedAt ?? null,
  };
}

function normalizeRecordArray(list) {
  if (!Array.isArray(list)) {
    return [];
  }
  return list.map(normalizeRecord);
}

function findDuplicateOf(updatedRecord, records) {
  const normalizedName = updatedRecord.name.trim().toLowerCase();
  if (!normalizedName) {
    return null;
  }
  return (
    records.find(
      (record) =>
        record.id !== updatedRecord.id &&
        record.name.trim().toLowerCase() === normalizedName &&
        record.amount === updatedRecord.amount,
    ) || null
  );
}

function parseListResult(result) {
  if (Array.isArray(result)) {
    return normalizeRecordArray(result);
  }
  if (result && Array.isArray(result.records)) {
    return normalizeRecordArray(result.records);
  }
  if (result && Array.isArray(result.data)) {
    return normalizeRecordArray(result.data);
  }
  return [];
}

function parseUpdateResult(result, fallbackRecord) {
  const status =
    result?.status === "duplicate" ||
    result?.duplicate === true ||
    result?.code === "DUPLICATE"
      ? "duplicate"
      : "ok";

  const normalizedRecord = normalizeRecord(
    result?.record ?? result?.data ?? fallbackRecord,
  );

  return {
    status,
    record: normalizedRecord,
    duplicateOfId: result?.duplicateOfId ? String(result.duplicateOfId) : null,
    message: result?.message ?? null,
  };
}

function buildMockApi() {
  let records = [
    {
      id: "1",
      name: "Aarav Kulkarni",
      amount: 1200,
      note: "Annual fee",
      duplicateStatus: "unique",
      duplicateOfId: null,
      updatedAt: "2026-04-19T11:00:00.000Z",
    },
    {
      id: "2",
      name: "Ira Joshi",
      amount: 1850,
      note: "Pending verification",
      duplicateStatus: "unique",
      duplicateOfId: null,
      updatedAt: "2026-04-19T11:15:00.000Z",
    },
    {
      id: "3",
      name: "Rahul Patil",
      amount: 1200,
      note: "Potential duplicate",
      duplicateStatus: "duplicate",
      duplicateOfId: "1",
      updatedAt: "2026-04-19T11:21:00.000Z",
    },
  ];

  function wait(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  return {
    async listRecords() {
      await wait(250);
      return { records: [...records] };
    },

    async updateRecord(id, patch) {
      await wait(180);
      const index = records.findIndex((record) => record.id === String(id));
      if (index < 0) {
        throw new Error("Record not found");
      }

      const nextRecord = normalizeRecord({
        ...records[index],
        ...patch,
        id: String(id),
        updatedAt: new Date().toISOString(),
      });

      const duplicateMatch = findDuplicateOf(nextRecord, records);
      if (duplicateMatch) {
        nextRecord.duplicateStatus = "duplicate";
        nextRecord.duplicateOfId = duplicateMatch.id;
      } else {
        nextRecord.duplicateStatus = "unique";
        nextRecord.duplicateOfId = null;
      }

      records[index] = nextRecord;

      return {
        status: duplicateMatch ? "duplicate" : "ok",
        duplicateOfId: duplicateMatch ? duplicateMatch.id : null,
        record: nextRecord,
      };
    },

    async deleteRecord(id) {
      await wait(180);
      records = records.filter((record) => record.id !== String(id));
      return { status: "ok" };
    },
  };
}

function resolveMethod(api, names) {
  for (const name of names) {
    if (typeof api?.[name] === "function") {
      return api[name].bind(api);
    }
  }
  return null;
}

export function createRecordsApi(externalApi) {
  const workerApi = externalApi ?? globalThis.workerBApi ?? globalThis.recordsApi;
  if (!workerApi) {
    return buildMockApi();
  }

  const listMethod = resolveMethod(workerApi, ["listRecords", "getRecords", "fetchRecords"]);
  const updateMethod = resolveMethod(workerApi, ["updateRecord", "editRecord", "saveRecord"]);
  const deleteMethod = resolveMethod(workerApi, ["deleteRecord", "removeRecord"]);

  if (!listMethod || !updateMethod || !deleteMethod) {
    return buildMockApi();
  }

  return {
    async listRecords() {
      const result = await listMethod();
      return { records: parseListResult(result) };
    },

    async updateRecord(id, patch) {
      const fallbackRecord = { id, ...patch };
      const result = await updateMethod(String(id), patch);
      return parseUpdateResult(result, fallbackRecord);
    },

    async deleteRecord(id) {
      await deleteMethod(String(id));
      return { status: "ok" };
    },
  };
}
