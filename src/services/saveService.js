function wait(ms) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

class MockSaveService {
  constructor() {
    this.records = [];
  }

  async saveContributionEntry(payload) {
    await wait(600);
    const savedRecord = {
      id: `mock-${Date.now()}`,
      savedAt: new Date().toISOString(),
      ...payload,
    };
    this.records.push(savedRecord);

    return {
      ok: true,
      id: savedRecord.id,
      savedAt: savedRecord.savedAt,
      record: savedRecord,
    };
  }
}

export function createSaveService() {
  const injectedService = globalThis.WorkerCAdapters?.saveService;
  if (
    injectedService &&
    typeof injectedService.saveContributionEntry === "function"
  ) {
    return injectedService;
  }

  return new MockSaveService();
}
