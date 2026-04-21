const DEFAULT_FIELD_DEFINITIONS = [
  {
    id: "nameMarathi",
    label: "Name Marathi",
    placeholder: "उदा. गणेश पाटील",
    speechLanguage: "mr-IN",
    voiceEnabled: true,
    required: true,
  },
  {
    id: "nameEnglish",
    label: "Name English Transliteration",
    placeholder: "e.g. Ganesh Patil",
    speechLanguage: "en-IN",
    voiceEnabled: true,
    required: true,
  },
  {
    id: "contributionAmount",
    label: "Contribution Amount",
    placeholder: "e.g. 500",
    speechLanguage: "en-IN",
    voiceEnabled: true,
    required: true,
    inputMode: "decimal",
  },
  {
    id: "placeMarathi",
    label: "Place Marathi",
    placeholder: "उदा. पुणे",
    speechLanguage: "mr-IN",
    voiceEnabled: true,
    required: true,
  },
  {
    id: "placeEnglish",
    label: "Place English Transliteration",
    placeholder: "e.g. Pune",
    speechLanguage: "en-IN",
    voiceEnabled: true,
    required: true,
  },
];

const REVIEW_STEP = {
  id: "reviewAndSave",
  label: "Review and Save",
  isReviewStep: true,
};

const transliterationPattern = /^[A-Za-z][A-Za-z .'-]*$/;

function normalizeWorkerAField(field, index) {
  const fallback = DEFAULT_FIELD_DEFINITIONS[index];
  if (!fallback) {
    return null;
  }

  return {
    ...fallback,
    ...field,
    id: field?.id || fallback.id,
    label: field?.label || fallback.label,
    placeholder: field?.placeholder || fallback.placeholder,
    speechLanguage: field?.speechLanguage || fallback.speechLanguage,
    voiceEnabled: field?.voiceEnabled ?? fallback.voiceEnabled,
    required: field?.required ?? fallback.required,
    inputMode: field?.inputMode || fallback.inputMode || "text",
  };
}

function getWorkerAContracts() {
  if (
    globalThis.WorkerAContracts &&
    Array.isArray(globalThis.WorkerAContracts.rowEntryFields)
  ) {
    return globalThis.WorkerAContracts.rowEntryFields
      .slice(0, DEFAULT_FIELD_DEFINITIONS.length)
      .map(normalizeWorkerAField)
      .filter(Boolean);
  }
  return null;
}

const fields = getWorkerAContracts() || DEFAULT_FIELD_DEFINITIONS;
const fieldMap = new Map(fields.map((field) => [field.id, field]));

export function getFieldDefinitions() {
  return fields.map((field) => ({ ...field }));
}

export function getWizardSteps() {
  return [...getFieldDefinitions(), REVIEW_STEP];
}

export function validateFieldValue(fieldId, value) {
  const field = fieldMap.get(fieldId);
  if (!field) {
    return "Field configuration not found.";
  }

  const trimmed = typeof value === "string" ? value.trim() : "";
  if (field.required && !trimmed) {
    return `${field.label} is required.`;
  }

  if (fieldId === "contributionAmount") {
    const amount = parseAmount(trimmed);
    if (!Number.isFinite(amount) || amount <= 0) {
      return "Contribution Amount must be a positive number.";
    }
  }

  if ((fieldId === "nameEnglish" || fieldId === "placeEnglish") && trimmed) {
    if (!transliterationPattern.test(trimmed)) {
      return "English transliteration should use roman letters and spaces.";
    }
  }

  if (typeof field.validator === "function") {
    return field.validator(trimmed) || "";
  }

  return "";
}

export function parseAmount(rawAmount) {
  if (typeof rawAmount !== "string") {
    return Number.NaN;
  }
  const normalized = rawAmount.replace(/,/g, "").trim();
  return Number.parseFloat(normalized);
}

export function buildSavePayload(fieldStateMap) {
  return {
    nameMarathi: fieldStateMap.nameMarathi?.value?.trim() || "",
    nameEnglish: fieldStateMap.nameEnglish?.value?.trim() || "",
    contributionAmount: parseAmount(fieldStateMap.contributionAmount?.value || ""),
    placeMarathi: fieldStateMap.placeMarathi?.value?.trim() || "",
    placeEnglish: fieldStateMap.placeEnglish?.value?.trim() || "",
  };
}

export function areAllFieldsAccepted(fieldStateMap) {
  return fields.every((field) => fieldStateMap[field.id]?.accepted);
}
