const tokenInput = document.getElementById("tokenInput");
const saveBtn = document.getElementById("saveBtn");
const statusEl = document.getElementById("status");

function setStatus(text, ok) {
  statusEl.textContent = text;
  statusEl.className = `status ${ok ? "ok" : "off"}`;
}

chrome.storage.local.get(["kmpToken"], ({ kmpToken }) => {
  if (kmpToken) {
    tokenInput.value = kmpToken;
    setStatus("Token salvo — pronto pra usar.", true);
  } else {
    setStatus("Nenhum token salvo ainda.", false);
  }
});

saveBtn.addEventListener("click", () => {
  const value = tokenInput.value.trim();
  if (!value) {
    setStatus("Cole o token antes de salvar.", false);
    return;
  }
  chrome.storage.local.set({ kmpToken: value }, () => {
    setStatus("Token salvo — pronto pra usar.", true);
  });
});
