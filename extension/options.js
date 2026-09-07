import { getConfig, setConfig } from "./lib/supabase-rest.js";

const form = document.getElementById("config-form");
const urlInput = document.getElementById("url");
const keyInput = document.getElementById("key");
const saved = document.getElementById("saved");

async function load() {
  const config = await getConfig();
  if (config) {
    urlInput.value = config.supabaseUrl ?? "";
    keyInput.value = config.supabaseAnonKey ?? "";
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  await setConfig({
    supabaseUrl: urlInput.value.trim().replace(/\/$/, ""),
    supabaseAnonKey: keyInput.value.trim(),
  });
  saved.style.display = "inline";
  setTimeout(() => {
    saved.style.display = "none";
  }, 2000);
});

load();
