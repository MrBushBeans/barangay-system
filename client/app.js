const API = 'http://localhost:5000/api';
const STATUSES = ['Pending', 'Approved', 'Released'];
const $ = (id) => document.getElementById(id);
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let residents = [];
let requests = [];
let editId = null;

async function api(url, method = 'GET', body) {
  const res = await fetch(API + url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const showError = (msg) => { $('error').textContent = msg ? 'Error: ' + msg : ''; };

// ---------- Loading and rendering ----------
async function load() {
  try {
    const [r, q, s] = await Promise.all([api('/residents'), api('/requests'), api('/stats')]);
    residents = r;
    requests = q;
    $('stat-residents').textContent = s.residents;
    $('stat-pending').textContent = s.pending;
    $('stat-released').textContent = s.released;
    renderResidents();
    renderResidentOptions();
    renderRequests();
  } catch (e) { showError(e.message); }
}

function renderResidents() {
  const q = $('search').value.trim().toLowerCase();
  const shown = residents.filter((r) => (r.firstName + ' ' + r.lastName).toLowerCase().includes(q));
  $('resident-rows').innerHTML = shown.length ? shown.map((r) => `
    <tr>
      <td>${esc(r.lastName)}, ${esc(r.firstName)}</td>
      <td>${r.birthdate.slice(0, 10)}</td><td>${r.sex}</td><td>${esc(r.purok)}</td><td>${esc(r.contactNumber)}</td>
      <td><button data-action="edit" data-id="${r._id}">Edit</button>
          <button data-action="delete" data-id="${r._id}">Delete</button></td>
    </tr>`).join('') : '<tr><td colspan="6">No residents found.</td></tr>';
}

function renderResidentOptions() {
  const select = $('request-resident');
  const current = select.value;
  select.innerHTML = '<option value="">Select resident</option>' + residents.map((r) =>
    `<option value="${r._id}">${esc(r.lastName)}, ${esc(r.firstName)}</option>`).join('');
  select.value = current;
}

function renderRequests() {
  $('request-rows').innerHTML = requests.length ? requests.map((q) => `
    <tr>
      <td>${q.resident ? esc(q.resident.lastName) + ', ' + esc(q.resident.firstName) : '(deleted)'}</td>
      <td>${q.type}</td><td>${esc(q.purpose)}</td>
      <td><select data-id="${q._id}">${STATUSES.map((s) =>
        `<option ${s === q.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
    </tr>`).join('') : '<tr><td colspan="4">No requests yet.</td></tr>';
}

// ---------- Residents: add / edit / delete ----------
function resetResidentForm() {
  $('resident-form').reset();
  editId = null;
  $('resident-heading').textContent = 'Register resident';
  $('resident-submit').textContent = 'Add resident';
  $('resident-cancel').classList.add('hidden');
}

$('resident-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  showError('');
  const data = Object.fromEntries(new FormData(e.target));
  try {
    if (editId) await api('/residents/' + editId, 'PUT', data);
    else await api('/residents', 'POST', data);
    resetResidentForm();
    await load();
  } catch (err) { showError(err.message); }
});

$('resident-cancel').addEventListener('click', resetResidentForm);
$('search').addEventListener('input', renderResidents);

$('resident-rows').addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const r = residents.find((x) => x._id === btn.dataset.id);
  if (btn.dataset.action === 'edit') {
    const form = $('resident-form');
    for (const key of ['firstName', 'lastName', 'birthdate', 'sex', 'purok', 'address', 'contactNumber']) {
      form.elements[key].value = key === 'birthdate' ? r.birthdate.slice(0, 10) : (r[key] || '');
    }
    editId = r._id;
    $('resident-heading').textContent = 'Edit resident';
    $('resident-submit').textContent = 'Save changes';
    $('resident-cancel').classList.remove('hidden');
  }
  if (btn.dataset.action === 'delete' && confirm(`Delete ${r.firstName} ${r.lastName} and their requests?`)) {
    try { await api('/residents/' + r._id, 'DELETE'); await load(); }
    catch (err) { showError(err.message); }
  }
});

// ---------- Requests: create / change status ----------
$('request-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  showError('');
  try {
    await api('/requests', 'POST', Object.fromEntries(new FormData(e.target)));
    e.target.reset();
    await load();
  } catch (err) { showError(err.message); }
});

$('request-rows').addEventListener('change', async (e) => {
  if (e.target.tagName !== 'SELECT') return;
  try { await api('/requests/' + e.target.dataset.id, 'PUT', { status: e.target.value }); await load(); }
  catch (err) { showError(err.message); }
});

load();
