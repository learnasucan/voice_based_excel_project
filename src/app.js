import {
  areAllFieldsAccepted,
  buildSavePayload,
  getFieldDefinitions,
  getWizardSteps,
  validateFieldValue,
} from "./shared/contracts.js";
import { createSpeechRecognitionService } from "./services/speechService.js";
import { createSaveService } from "./services/saveService.js";

const fields = getFieldDefinitions();
const steps = getWizardSteps();
const speechService = createSpeechRecognitionService();
const saveService = createSaveService();

const stepperRoot = document.querySelector("#stepper");
const contentRoot = document.querySelector("#wizardContent");
const speechModeLabel = document.querySelector("#speechMode");

const state = {
  currentStepIndex: 0,
  activeListeningFieldId: null,
  reviewConfirmed: false,
  saveState: {
    pending: false,
    error: "",
    successMessage: "",
  },
  fields: fields.reduce((accumulator, field) => {
    accumulator[field.id] = {
      value: "",
      transcript: "",
      accepted: false,
      listening: false,
      helper: "Capture by voice or type manually, then press Accept.",
      error: "",
    };
    return accumulator;
  }, {}),
};

function mount() {
  speechModeLabel.textContent =
    speechService.getMode?.() === "mock"
      ? "Speech Mode: Mock (browser speech API unavailable)"
      : "Speech Mode: Live browser microphone";
  render();
}

function render() {
  renderStepper();
  renderCurrentStep();
}

function renderStepper() {
  stepperRoot.replaceChildren();

  steps.forEach((step, index) => {
    const item = document.createElement("li");
    item.className = "step";

    if (index < state.currentStepIndex) {
      item.classList.add("step-complete");
    }
    if (index === state.currentStepIndex) {
      item.classList.add("step-active");
    }

    const number = document.createElement("span");
    number.className = "step-index";
    number.textContent = String(index + 1);

    const label = document.createElement("span");
    label.className = "step-label";
    label.textContent = step.label;

    item.append(number, label);
    stepperRoot.append(item);
  });
}

function renderCurrentStep() {
  const currentStep = steps[state.currentStepIndex];
  if (!currentStep) {
    return;
  }

  if (currentStep.isReviewStep) {
    renderReviewStep();
    return;
  }

  renderFieldStep(currentStep, state.currentStepIndex);
}

function renderFieldStep(field, index) {
  const fieldState = state.fields[field.id];
  contentRoot.replaceChildren();

  const card = document.createElement("article");
  card.className = "card";

  const heading = document.createElement("h2");
  heading.textContent = `${index + 1}. ${field.label}`;

  const helper = document.createElement("p");
  helper.className = "muted";
  helper.textContent = fieldState.helper;

  const fieldGroup = document.createElement("div");
  fieldGroup.className = "field-group";

  const inputLabel = document.createElement("label");
  inputLabel.setAttribute("for", `input-${field.id}`);
  inputLabel.textContent = field.label;

  const input =
    field.id === "contributionAmount"
      ? document.createElement("input")
      : document.createElement("textarea");

  let continueButton = null;
  let errorMessage = null;

  input.id = `input-${field.id}`;
  input.className = "text-input";
  input.placeholder = field.placeholder || "";
  input.value = fieldState.value;
  input.autocomplete = "off";

  if (field.id === "contributionAmount") {
    input.type = "text";
    input.inputMode = field.inputMode || "decimal";
  } else {
    input.rows = 2;
  }

  input.addEventListener("input", (event) => {
    fieldState.value = event.target.value;
    fieldState.accepted = false;
    fieldState.error = "";
    fieldState.helper = "Review the value and press Accept to continue.";
    helper.textContent = fieldState.helper;
    if (errorMessage) {
      errorMessage.textContent = "";
      errorMessage.classList.add("hidden");
    }
    if (continueButton) {
      continueButton.disabled = true;
    }
  });

  const voiceRow = document.createElement("div");
  voiceRow.className = "voice-row";

  const micButton = document.createElement("button");
  micButton.type = "button";
  micButton.className = "btn btn-secondary";
  micButton.textContent = fieldState.listening ? "Stop Listening" : "Use Microphone";
  micButton.disabled = !field.voiceEnabled || state.saveState.pending;
  micButton.addEventListener("click", () => {
    if (fieldState.listening) {
      stopListening(field.id);
      return;
    }
    startListening(field);
  });

  const listeningIndicator = document.createElement("div");
  listeningIndicator.className = `listening-indicator ${
    fieldState.listening ? "listening-on" : ""
  }`;
  listeningIndicator.innerHTML = `
    <span class="pulse" aria-hidden="true"></span>
    <span>${fieldState.listening ? "Listening..." : "Mic idle"}</span>
  `;

  voiceRow.append(micButton, listeningIndicator);

  const transcriptLabel = document.createElement("label");
  transcriptLabel.setAttribute("for", `transcript-${field.id}`);
  transcriptLabel.textContent = "Transcript Preview";

  const transcriptPreview = document.createElement("textarea");
  transcriptPreview.id = `transcript-${field.id}`;
  transcriptPreview.className = "transcript";
  transcriptPreview.rows = 2;
  transcriptPreview.readOnly = true;
  transcriptPreview.value = fieldState.transcript || "";
  transcriptPreview.placeholder = "Transcript will appear here after recording.";

  const actions = document.createElement("div");
  actions.className = "action-row";

  const acceptButton = document.createElement("button");
  acceptButton.type = "button";
  acceptButton.className = "btn btn-primary";
  acceptButton.textContent = "Accept";
  acceptButton.addEventListener("click", () => {
    const error = validateFieldValue(field.id, fieldState.value);
    fieldState.error = error;
    if (error) {
      fieldState.accepted = false;
      fieldState.helper = "Fix validation issues, then accept again.";
      render();
      return;
    }
    fieldState.accepted = true;
    fieldState.helper = "Accepted. You can continue to the next field.";
    render();
  });

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "btn btn-tertiary";
  editButton.textContent = "Edit Manually";
  editButton.addEventListener("click", () => {
    fieldState.accepted = false;
    fieldState.error = "";
    fieldState.helper = "Make edits, then press Accept.";
    render();
    requestAnimationFrame(() => {
      document.querySelector(`#input-${field.id}`)?.focus();
    });
  });

  const rerecordButton = document.createElement("button");
  rerecordButton.type = "button";
  rerecordButton.className = "btn btn-tertiary";
  rerecordButton.textContent = "Re-record";
  rerecordButton.disabled = state.saveState.pending;
  rerecordButton.addEventListener("click", () => {
    fieldState.transcript = "";
    fieldState.value = "";
    fieldState.accepted = false;
    fieldState.error = "";
    fieldState.helper = "Recording restarted. Speak clearly and verify transcript.";
    startListening(field);
  });

  actions.append(acceptButton, editButton, rerecordButton);

  errorMessage = document.createElement("p");
  errorMessage.className = "error-text";
  errorMessage.textContent = fieldState.error;
  if (!fieldState.error) {
    errorMessage.classList.add("hidden");
  }

  const navRow = document.createElement("div");
  navRow.className = "nav-row";

  const backButton = document.createElement("button");
  backButton.type = "button";
  backButton.className = "btn btn-secondary";
  backButton.textContent = "Back";
  backButton.disabled = index === 0 || state.saveState.pending;
  backButton.addEventListener("click", () => {
    moveToStep(index - 1);
  });

  continueButton = document.createElement("button");
  continueButton.type = "button";
  continueButton.className = "btn btn-primary";
  continueButton.textContent = "Continue";
  continueButton.disabled = !fieldState.accepted || state.saveState.pending;
  continueButton.addEventListener("click", () => {
    moveToStep(index + 1);
  });

  navRow.append(backButton, continueButton);
  fieldGroup.append(
    inputLabel,
    input,
    voiceRow,
    transcriptLabel,
    transcriptPreview,
    actions,
    errorMessage
  );
  card.append(heading, helper, fieldGroup, navRow);
  contentRoot.append(card);
}

function renderReviewStep() {
  contentRoot.replaceChildren();

  const card = document.createElement("article");
  card.className = "card";

  const heading = document.createElement("h2");
  heading.textContent = "6. Review and Save";

  const helper = document.createElement("p");
  helper.className = "muted";
  helper.textContent =
    "Visually verify every field. You can jump back and edit any step before saving.";

  const rows = document.createElement("div");
  rows.className = "review-rows";

  fields.forEach((field, index) => {
    const row = document.createElement("div");
    row.className = "review-row";

    const title = document.createElement("p");
    title.className = "review-title";
    title.textContent = field.label;

    const value = document.createElement("p");
    value.className = "review-value";
    value.textContent = state.fields[field.id].value || "Not provided";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "btn btn-secondary";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => {
      moveToStep(index);
    });

    row.append(title, value, editButton);
    rows.append(row);
  });

  const reviewFlagRow = document.createElement("label");
  reviewFlagRow.className = "checkbox-row";
  const reviewCheckbox = document.createElement("input");
  reviewCheckbox.type = "checkbox";
  reviewCheckbox.checked = state.reviewConfirmed;
  reviewCheckbox.addEventListener("change", (event) => {
    state.reviewConfirmed = Boolean(event.target.checked);
    render();
  });
  const reviewCopy = document.createElement("span");
  reviewCopy.textContent = "I have reviewed all fields and they are correct.";
  reviewFlagRow.append(reviewCheckbox, reviewCopy);

  const statusMessage = document.createElement("p");
  statusMessage.className = "status-text";
  statusMessage.textContent = state.saveState.successMessage || state.saveState.error;
  if (state.saveState.error) {
    statusMessage.classList.add("error-text");
  }
  if (!state.saveState.successMessage && !state.saveState.error) {
    statusMessage.classList.add("hidden");
  }

  const navRow = document.createElement("div");
  navRow.className = "nav-row";

  const backButton = document.createElement("button");
  backButton.type = "button";
  backButton.className = "btn btn-secondary";
  backButton.textContent = "Back";
  backButton.disabled = state.saveState.pending;
  backButton.addEventListener("click", () => {
    moveToStep(steps.length - 2);
  });

  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.className = "btn btn-primary";
  saveButton.textContent = state.saveState.pending ? "Saving..." : "Save Row";
  saveButton.disabled =
    state.saveState.pending ||
    !areAllFieldsAccepted(state.fields) ||
    !state.reviewConfirmed;
  saveButton.addEventListener("click", handleSave);

  navRow.append(backButton, saveButton);
  card.append(heading, helper, rows, reviewFlagRow, statusMessage, navRow);
  contentRoot.append(card);
}

function moveToStep(nextIndex) {
  if (nextIndex < 0 || nextIndex >= steps.length) {
    return;
  }

  if (state.activeListeningFieldId) {
    stopListening(state.activeListeningFieldId);
  }

  state.currentStepIndex = nextIndex;
  state.saveState.error = "";
  state.saveState.successMessage = "";
  render();
}

function startListening(field) {
  const fieldState = state.fields[field.id];

  if (state.activeListeningFieldId && state.activeListeningFieldId !== field.id) {
    stopListening(state.activeListeningFieldId);
  }

  fieldState.listening = true;
  fieldState.accepted = false;
  fieldState.error = "";
  fieldState.helper = "Listening... stop or wait for transcript.";
  state.activeListeningFieldId = field.id;
  render();

  try {
    speechService.startListening({
      fieldId: field.id,
      language: field.speechLanguage,
      onResult: (transcript) => {
        const activeFieldState = state.fields[field.id];
        activeFieldState.transcript = transcript;
        activeFieldState.value = transcript;
        activeFieldState.accepted = false;
        activeFieldState.error = "";
        activeFieldState.helper = "Transcript captured. Verify and press Accept.";
        render();
      },
      onStateChange: (status) => {
        const activeFieldState = state.fields[field.id];
        activeFieldState.listening = status === "listening";
        if (status === "ended") {
          state.activeListeningFieldId = null;
        }
        render();
      },
      onError: (message) => {
        const activeFieldState = state.fields[field.id];
        activeFieldState.listening = false;
        activeFieldState.error = message;
        activeFieldState.helper = "Recording failed. Re-record or type manually.";
        state.activeListeningFieldId = null;
        render();
      },
    });
  } catch (error) {
    fieldState.listening = false;
    fieldState.error = error?.message || "Unable to start microphone.";
    fieldState.helper = "Use keyboard fallback and press Accept.";
    state.activeListeningFieldId = null;
    render();
  }
}

function stopListening(fieldId) {
  const fieldState = state.fields[fieldId];
  if (fieldState) {
    fieldState.listening = false;
    fieldState.helper = "Recording stopped. You can re-record or edit manually.";
  }
  state.activeListeningFieldId = null;
  speechService.stopListening();
  render();
}

async function handleSave() {
  if (!areAllFieldsAccepted(state.fields)) {
    state.saveState.error = "Please accept all steps before saving.";
    render();
    return;
  }
  if (!state.reviewConfirmed) {
    state.saveState.error = "Please confirm review before saving.";
    render();
    return;
  }

  state.saveState.pending = true;
  state.saveState.error = "";
  state.saveState.successMessage = "";
  render();

  try {
    const payload = buildSavePayload(state.fields);
    const result = await saveService.saveContributionEntry(payload);
    state.saveState.successMessage = `Saved successfully (ID: ${result.id}).`;
  } catch (error) {
    state.saveState.error = error?.message || "Save failed. Try again.";
  } finally {
    state.saveState.pending = false;
    render();
  }
}

mount();
