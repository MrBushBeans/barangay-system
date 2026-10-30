import { useEffect, useState } from 'react';

const api = async (url, method = 'GET', body) => {
  const res = await fetch('/api' + url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

const emptyResident = { firstName: '', lastName: '', birthdate: '', sex: 'Male', purok: '', address: '', contactNumber: '' };
const TYPES = ['Barangay Clearance', 'Certificate of Residency', 'Certificate of Indigency'];
const STATUSES = ['Pending', 'Approved', 'Released'];

export default function App() {
  const [residents, setResidents] = useState([]);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({});
  const [form, setForm] = useState(emptyResident);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const [reqForm, setReqForm] = useState({ resident: '', type: TYPES[0], purpose: '' });
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [r, q, s] = await Promise.all([
        api('/residents?q=' + encodeURIComponent(search)), api('/requests'), api('/stats'),
      ]);
      setResidents(r); setRequests(q); setStats(s);
    } catch (e) { setError(e.message); }
  };
  useEffect(() => { load(); }, [search]);

  // Runs an action, shows any error, then refreshes the data
  const run = async (action) => {
    setError('');
    try { await action(); await load(); } catch (e) { setError(e.message); }
  };

  const bind = (k) => ({ value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }) });

  const saveResident = (e) => {
    e.preventDefault();
    run(async () => {
      if (editId) await api('/residents/' + editId, 'PUT', form);
      else await api('/residents', 'POST', form);
      setForm(emptyResident); setEditId(null);
    });
  };

  const startEdit = (r) => {
    const { firstName, lastName, birthdate, sex, purok, address = '', contactNumber = '' } = r;
    setForm({ firstName, lastName, birthdate: birthdate.slice(0, 10), sex, purok, address, contactNumber });
    setEditId(r._id);
  };

  const removeResident = (r) => {
    if (confirm(`Delete ${r.firstName} ${r.lastName} and their requests?`)) run(() => api('/residents/' + r._id, 'DELETE'));
  };

  const saveRequest = (e) => {
    e.preventDefault();
    run(async () => {
      await api('/requests', 'POST', reqForm);
      setReqForm({ resident: '', type: TYPES[0], purpose: '' });
    });
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16, fontFamily: 'sans-serif' }}>
      <h1>Barangay Resident and Request System</h1>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      <h2>Dashboard</h2>
      <p>Total residents: {stats.residents} | Pending requests: {stats.pending} | Released requests: {stats.released}</p>

      <h2>{editId ? 'Edit resident' : 'Register resident'}</h2>
      <form onSubmit={saveResident}>
        <input placeholder="First name" required {...bind('firstName')} />{' '}
        <input placeholder="Last name" required {...bind('lastName')} />{' '}
        <input type="date" required {...bind('birthdate')} />{' '}
        <select {...bind('sex')}><option>Male</option><option>Female</option></select>{' '}
        <input placeholder="Purok" required {...bind('purok')} />{' '}
        <input placeholder="Address" {...bind('address')} />{' '}
        <input placeholder="Contact number" {...bind('contactNumber')} />{' '}
        <button type="submit">{editId ? 'Save changes' : 'Add resident'}</button>
        {editId && <button type="button" onClick={() => { setForm(emptyResident); setEditId(null); }}>Cancel</button>}
      </form>

      <h2>Residents</h2>
      <input placeholder="Search by name" value={search} onChange={(e) => setSearch(e.target.value)} />
      <table border="1" cellPadding="4" style={{ marginTop: 8, width: '100%' }}>
        <thead><tr><th>Name</th><th>Birthdate</th><th>Sex</th><th>Purok</th><th>Contact</th><th>Actions</th></tr></thead>
        <tbody>
          {residents.map((r) => (
            <tr key={r._id}>
              <td>{r.lastName}, {r.firstName}</td>
              <td>{r.birthdate.slice(0, 10)}</td><td>{r.sex}</td><td>{r.purok}</td><td>{r.contactNumber}</td>
              <td><button onClick={() => startEdit(r)}>Edit</button> <button onClick={() => removeResident(r)}>Delete</button></td>
            </tr>
          ))}
          {residents.length === 0 && <tr><td colSpan="6">No residents yet. Add one above.</td></tr>}
        </tbody>
      </table>

      <h2>New document request</h2>
      <form onSubmit={saveRequest}>
        <select required value={reqForm.resident} onChange={(e) => setReqForm({ ...reqForm, resident: e.target.value })}>
          <option value="">Select resident</option>
          {residents.map((r) => <option key={r._id} value={r._id}>{r.lastName}, {r.firstName}</option>)}
        </select>{' '}
        <select value={reqForm.type} onChange={(e) => setReqForm({ ...reqForm, type: e.target.value })}>
          {TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>{' '}
        <input placeholder="Purpose" value={reqForm.purpose} onChange={(e) => setReqForm({ ...reqForm, purpose: e.target.value })} />{' '}
        <button type="submit">Create request</button>
      </form>

      <h2>Requests</h2>
      <table border="1" cellPadding="4" style={{ width: '100%' }}>
        <thead><tr><th>Resident</th><th>Type</th><th>Purpose</th><th>Status</th></tr></thead>
        <tbody>
          {requests.map((q) => (
            <tr key={q._id}>
              <td>{q.resident ? `${q.resident.lastName}, ${q.resident.firstName}` : '(deleted)'}</td>
              <td>{q.type}</td><td>{q.purpose}</td>
              <td>
                <select value={q.status} onChange={(e) => run(() => api('/requests/' + q._id, 'PUT', { status: e.target.value }))}>
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </td>
            </tr>
          ))}
          {requests.length === 0 && <tr><td colSpan="4">No requests yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
