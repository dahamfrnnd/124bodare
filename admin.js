const $ = (id) => document.getElementById(id);
const overlay = $("adminOverlay"), bar = $("adminBar");
let original = null;

function notify(message) { const status = $("saveStatus"); if (status) status.textContent = message; }
async function community(payload) {
  const response = await fetch('/.netlify/functions/community', { method: payload ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' }, body: payload ? JSON.stringify(payload) : undefined });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Community request failed');
  return data;
}
function safe(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function renderAdminList(targetId, items, kind) {
  const target = $(targetId);
  if (!items.length) { target.innerHTML = '<p class="adminEmpty">No submissions yet.</p>'; return; }
  target.innerHTML = items.slice().reverse().map(item => `<article class="adminEntry"><div><strong>${safe(item.name)}</strong> <span class="adminPending">${safe(item.status || 'pending')}</span><p>${kind === 'guest' ? `${safe(item.room)} · ${safe(item.purpose)}${item.note ? ` · ${safe(item.note)}` : ''}` : `${'★'.repeat(item.rating || 5)} · ${safe(item.text)}`}</p><small>${item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</small></div><div class="adminEntryActions">${item.status !== 'approved' ? `<button class="mini" data-community-action="approve" data-kind="${kind}" data-id="${safe(item.id)}">Approve</button>` : ''}<button class="mini" data-community-action="delete" data-kind="${kind}" data-id="${safe(item.id)}">Delete</button></div></article>`).join('');
}
async function refreshCommunity() {
  try { const data = await community(); renderAdminList('adminGuests', data.guests || [], 'guest'); renderAdminList('adminReviews', data.reviews || [], 'review'); }
  catch (error) { notify('Could not load visitor submissions: ' + error.message); }
}
$('refreshCommunityBtn').addEventListener('click', refreshCommunity);
document.getElementById('adminDashboard').addEventListener('click', async e => {
  const button = e.target.closest('[data-community-action]'); if (!button) return;
  button.disabled = true;
  try { await community({ action: 'moderate', kind: button.dataset.kind, operation: button.dataset.communityAction, id: button.dataset.id }); await refreshCommunity(); notify('Visitor submissions updated.'); }
  catch (error) { notify(error.message); button.disabled = false; }
});
function showLogin() { overlay.classList.add("open"); overlay.setAttribute("aria-hidden", "false"); }
function hideLogin() { overlay.classList.remove("open"); overlay.setAttribute("aria-hidden", "true"); }
$("adminLoginBtn").addEventListener("click", showLogin);
$("adminClose").addEventListener("click", hideLogin);
overlay.addEventListener("click", e => { if (e.target === overlay) hideLogin(); });

function editableElements() {
  // Text is read-only in Admin Mode. Dedicated controls remain enabled.
  return [];
}
function snapshot() {
  const text = editableElements().map((el, i) => [i, el.innerHTML]);
  const images = [...document.querySelectorAll("img")].map((el, i) => [i, el.getAttribute("src") || ""]);
  return { text, images };
}
function applySnapshot(data) {
  if (!data) return;
  const els = editableElements();
  (data.text || []).forEach(([i, html]) => { if (els[i] && typeof html === "string") els[i].innerHTML = html; });
  const imgs = [...document.querySelectorAll("img")];
  (data.images || []).forEach(([i, src]) => { if (imgs[i] && typeof src === "string") imgs[i].setAttribute("src", src); });
}
async function api(path, options = {}) {
  const response = await fetch(`/.netlify/functions/${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}
async function loadSavedContent() {
  try { const data = await api("site-content"); if (data.content) applySnapshot(data.content); }
  catch (error) { console.error("Could not load saved site content:", error); }
}
function turnOnEditing() {
  document.body.classList.add("admin-editing");
  editableElements().forEach(el => { el.dataset.adminEditable = "true"; el.contentEditable = "true"; el.spellcheck = true; });
  bar.hidden = false; $("adminLoginBtn").textContent = "Admin Active"; $("adminDashboard").hidden = false; document.dispatchEvent(new Event("124-admin-state")); refreshCommunity();
}
function turnOffEditing() {
  document.body.classList.remove("admin-editing");
  document.querySelectorAll('[data-admin-editable="true"]').forEach(el => { el.contentEditable = "false"; delete el.dataset.adminEditable; });
  bar.hidden = true; $("adminLoginBtn").textContent = "Admin Login"; $("adminDashboard").hidden = true; document.dispatchEvent(new Event("124-admin-state"));
}
async function checkSession() {
  try { const result = await api("auth", { method: "GET" }); if (result.loggedIn) { await loadSavedContent(); original = snapshot(); turnOnEditing(); notify("Admin active. Text is read-only; dropdowns, moderation, supplies and photo uploads remain available."); } }
  catch (_) { /* public visitor */ }
}
$("adminLoginForm").addEventListener("submit", async e => {
  e.preventDefault(); $("adminError").textContent = "Checking login…";
  try {
    await api("auth", { method: "POST", body: JSON.stringify({ password: $("adminPassword").value }) });
    $("adminPassword").value = ""; $("adminError").textContent = ""; hideLogin();
    await loadSavedContent(); original = snapshot(); turnOnEditing(); notify("Admin active. Text is read-only; dropdowns, moderation, supplies and photo uploads remain available.");
  } catch (error) { $("adminError").textContent = error.message || "Login failed."; }
});
$("saveSiteBtn").addEventListener("click", async () => {
  notify("Saving…");
  try { await api("site-content", { method: "POST", body: JSON.stringify({ content: snapshot() }) }); original = snapshot(); notify("Saved successfully. Everyone will see the changes after refresh."); }
  catch (error) { notify("Save failed: " + error.message); }
});
$("cancelEditBtn").addEventListener("click", () => { if (original) applySnapshot(original); notify("Unsaved edits cancelled."); });
$("logoutBtn").addEventListener("click", async () => { try { await api("auth", { method: "DELETE" }); } catch (_) {} turnOffEditing(); notify(""); });

await loadSavedContent();
await checkSession();
