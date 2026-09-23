const API_HOST = (typeof window !== 'undefined' && window.location && window.location.hostname && window.location.hostname !== '') ? window.location.hostname : 'localhost';
const API_ROOT = (typeof window !== 'undefined' && window.location && (window.location.protocol === 'http:' || window.location.protocol === 'https:'))
  ? '/api'
  : `http://${API_HOST}:3001/api`;
const API_BASE = `${API_ROOT}/grievances`;
let authToken=localStorage.getItem('wcaAuthToken');

function authHeaders(extra={}){ return {...extra, ...(authToken?{Authorization:`Bearer ${authToken}`}:{})}; }
function setUser(user){
  if (!user) return;
  document.body.classList.add('authenticated');
  document.body.dataset.role=user.role || 'USER';
  const displayName=user.fullName||user.full_name||user.email||'User';
  if($('#userName')) $('#userName').textContent=displayName;
  if($('#userRole')) $('#userRole').textContent=user.role||'USER';
  const matches = String(displayName).match(/\b\w/g);
  const initials=matches ? matches.slice(0,2).join('').toUpperCase() : 'U';
  if($('#userAvatar')) $('#userAvatar').textContent=initials;
  if($('#profileDisplayName')) $('#profileDisplayName').textContent=displayName;
  if($('#profileAvatar')) $('#profileAvatar').textContent=initials;

  const isAdmin = (user.role === 'ADMIN');

  // Both Admin & User can Register a Grievance
  $$('[data-go="register"],[data-page="register"]').forEach(control=>control.hidden=false);

  // Hide Email Settings for non-Admin users
  ['#openSmtpBtn','#openSmtpFromDispatchBtn','#openSmtpFromDeptSummaryBtn'].forEach(sel => {
    const el = $(sel);
    if (el) el.style.display = isAdmin ? 'inline-block' : 'none';
  });

  // Restrict editing controls in details dialog to ADMIN only
  if ($('#dialogStatus')) $('#dialogStatus').disabled = !isAdmin;
  if ($('#dialogPriority')) $('#dialogPriority').disabled = !isAdmin;
  if ($('#dialogAssignee')) $('#dialogAssignee').disabled = !isAdmin;
  if ($('#dialogRecipientEmail')) $('#dialogRecipientEmail').disabled = !isAdmin;
  if ($('#saveStatus')) $('#saveStatus').hidden = !isAdmin;
  if ($('#editCaseBtn')) $('#editCaseBtn').hidden = !isAdmin;
  if ($('#deleteCase')) $('#deleteCase').hidden = !isAdmin;
  if ($('#sendEmailBtn')) $('#sendEmailBtn').hidden = !isAdmin;
  if ($('#sendReminderBtn')) $('#sendReminderBtn').hidden = !isAdmin;
}

const defaultPasswords = {
  'admin@mwca.gov': 'Admin@123',
  'admin': 'Admin@123',
  'user@mwca.gov': 'User@123',
  'user': 'User@123',
  'officer@mwca.gov': 'Officer@123',
  'officer': 'Officer@123',
  'reviewer@mwca.gov': 'Reviewer@123',
  'reviewer': 'Reviewer@123',
  'viewer@mwca.gov': 'Viewer@123',
  'viewer': 'Viewer@123'
};

function getSavedUserPassword(emailKey) {
  if (!emailKey) return null;
  const lower = String(emailKey).trim().toLowerCase();
  try {
    const custom = JSON.parse(localStorage.getItem('wcaUserPasswords') || '{}');
    if (custom[lower]) return custom[lower];
    const shortName = lower.includes('@') ? lower.split('@')[0] : lower;
    if (custom[shortName]) return custom[shortName];
  } catch(e){}
  return defaultPasswords[lower] || defaultPasswords[lower.includes('@') ? lower.split('@')[0] : `${lower}@mwca.gov`] || null;
}

function syncDemoButtons() {
  document.querySelectorAll('.demo-btn').forEach(btn => {
    const email = btn.dataset.email;
    if (email) {
      const saved = getSavedUserPassword(email);
      if (saved) {
        btn.dataset.pass = saved;
        const passSpan = btn.querySelector('span:last-child');
        if (passSpan) passSpan.textContent = saved;
      }
    }
  });
}

function saveUserPassword(emailKey, newPassword) {
  if (!emailKey || !newPassword) return;
  const lower = String(emailKey).trim().toLowerCase();
  try {
    const custom = JSON.parse(localStorage.getItem('wcaUserPasswords') || '{}');
    const shortName = lower.includes('@') ? lower.split('@')[0] : lower;
    const fullEmail = lower.includes('@') ? lower : `${lower}@mwca.gov`;

    custom[lower] = newPassword;
    custom[shortName] = newPassword;
    custom[fullEmail] = newPassword;
    localStorage.setItem('wcaUserPasswords', JSON.stringify(custom));

    defaultPasswords[lower] = newPassword;
    defaultPasswords[shortName] = newPassword;
    defaultPasswords[fullEmail] = newPassword;

    if (typeof demoAccountsFallback !== 'undefined') {
      if (demoAccountsFallback[lower]) demoAccountsFallback[lower].pass = newPassword;
      if (demoAccountsFallback[shortName]) demoAccountsFallback[shortName].pass = newPassword;
      if (demoAccountsFallback[fullEmail]) demoAccountsFallback[fullEmail].pass = newPassword;
    }

    syncDemoButtons();
  } catch(e){}
}

let currentUser=null;
function setCurrentUser(user){ currentUser=user; setUser(user); }

$('#profileBtn').onclick=()=>{
  if(!currentUser) return;
  const form=$('#profileForm');
  form.fullName.value=currentUser.fullName||currentUser.full_name||'';
  form.email.value=currentUser.email||'';
  form.division.value=currentUser.division||'';
  form.password.value='';
  $('#profileError').textContent='';
  $('#profileDialog').showModal();
};
$('#closeProfile').onclick=()=>$('#profileDialog').close();
$('#cancelProfile').onclick=()=>$('#profileDialog').close();

$('#profileForm').onsubmit=async event=>{
  event.preventDefault();
  const data=new FormData(event.target);
  const fullName = String(data.get('fullName') || '').trim();
  const email = String(data.get('email') || '').trim().toLowerCase();
  const division = String(data.get('division') || '').trim();
  const password = String(data.get('password') || '').trim();

  $('#profileError').textContent='Saving profile update…';
  try{
    const response=await fetch(`${API_ROOT}/auth/me`,{
      method:'PATCH',
      headers:authHeaders({'Content-Type':'application/json'}),
      body:JSON.stringify({ fullName, email, division, password: password || undefined })
    });
    const result=await response.json();
    if(!response.ok) throw new Error(result.message||'Profile update failed');
    if (password) {
      saveUserPassword(email, password);
      if (currentUser?.email) saveUserPassword(currentUser.email, password);
    }
    setCurrentUser(result.user);
    $('#profileDialog').close();
    notify('Profile and account security updated successfully');
  }catch(error){
    if (error.message === 'Failed to fetch') {
      if (currentUser) {
        currentUser.fullName = fullName;
        currentUser.email = email;
        currentUser.division = division;
        if (password) {
          saveUserPassword(email, password);
          saveUserPassword(currentUser.email, password);
        }
        setCurrentUser(currentUser);
        $('#profileDialog').close();
        notify('Profile updated successfully');
        return;
      }
    }
    $('#profileError').textContent=error.message;
  }
};

const demoAccountsFallback = {
  'admin@mwca.gov': { pass: 'Admin@123', user: { id: 1, fullName: 'System Administrator', email: 'admin@mwca.gov', role: 'ADMIN', division: 'MWCA' } },
  'admin': { pass: 'Admin@123', user: { id: 1, fullName: 'System Administrator', email: 'admin@mwca.gov', role: 'ADMIN', division: 'MWCA' } },
  'user@mwca.gov': { pass: 'User@123', user: { id: 2, fullName: 'Standard User', email: 'user@mwca.gov', role: 'USER', division: 'MWCA' } },
  'user': { pass: 'User@123', user: { id: 2, fullName: 'Standard User', email: 'user@mwca.gov', role: 'USER', division: 'MWCA' } },
  'officer@mwca.gov': { pass: 'Officer@123', user: { id: 3, fullName: 'Case Officer', email: 'officer@mwca.gov', role: 'OFFICER', division: 'MWCA' } },
  'officer': { pass: 'Officer@123', user: { id: 3, fullName: 'Case Officer', email: 'officer@mwca.gov', role: 'OFFICER', division: 'MWCA' } },
  'reviewer@mwca.gov': { pass: 'Reviewer@123', user: { id: 4, fullName: 'Case Reviewer', email: 'reviewer@mwca.gov', role: 'REVIEWER', division: 'MWCA' } },
  'reviewer': { pass: 'Reviewer@123', user: { id: 4, fullName: 'Case Reviewer', email: 'reviewer@mwca.gov', role: 'REVIEWER', division: 'MWCA' } },
  'viewer@mwca.gov': { pass: 'Viewer@123', user: { id: 5, fullName: 'Read Only User', email: 'viewer@mwca.gov', role: 'VIEWER', division: 'MWCA' } },
  'viewer': { pass: 'Viewer@123', user: { id: 5, fullName: 'Read Only User', email: 'viewer@mwca.gov', role: 'VIEWER', division: 'MWCA' } }
};

async function doLogin(emailInput, passwordInput) {
  let rawEmail = String(emailInput || '').trim().toLowerCase();
  const password = String(passwordInput || '').trim();
  if (!rawEmail || !password) {
    if ($('#loginError')) $('#loginError').textContent = 'Please enter both email and password.';
    return false;
  }

  const email = (rawEmail && !rawEmail.includes('@')) ? `${rawEmail}@mwca.gov` : rawEmail;
  const errorEl = $('#loginError');
  if (errorEl) errorEl.textContent = 'Signing in…';

  try {
    const response = await fetch(`${API_ROOT}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const result = await response.json();
    if (response.ok && result.token && result.user) {
      authToken = result.token;
      localStorage.setItem('wcaAuthToken', authToken);
      setCurrentUser(result.user);
      if (errorEl) errorEl.textContent = '';
      try { await loadDatabaseGrievances(); } catch(e){}
      try { checkSmtpStatus(); } catch(e){}
      return true;
    }

    // Explicit rejection for invalid email or incorrect password
    if (errorEl) errorEl.textContent = result.message || 'Invalid email or password.';
    return false;
  } catch (error) {
    // Offline verification strictly matching saved password
    const expectedPass = getSavedUserPassword(email) || getSavedUserPassword(rawEmail);
    if (expectedPass && password === expectedPass) {
      const fallbackUser = demoAccountsFallback[email] || demoAccountsFallback[rawEmail] || demoAccountsFallback['admin@mwca.gov'];
      authToken = `demo-token-${Date.now()}`;
      localStorage.setItem('wcaAuthToken', authToken);
      setCurrentUser({
        ...fallbackUser.user,
        email: email
      });
      if (errorEl) errorEl.textContent = '';
      try { await loadDatabaseGrievances(); } catch(e){}
      try { checkSmtpStatus(); } catch(e){}
      return true;
    }
    if (errorEl) errorEl.textContent = 'Invalid email or password.';
    return false;
  }
}

$('#loginForm').onsubmit = (event) => {
  if (event) event.preventDefault();
  const emailVal = $('#loginEmail')?.value;
  const passVal = $('#loginPassword')?.value;
  doLogin(emailVal, passVal);
  return false;
};

const signInSubmitBtn = $('#signInSubmitBtn');
if (signInSubmitBtn) {
  signInSubmitBtn.onclick = (event) => {
    if (event) event.preventDefault();
    const emailVal = $('#loginEmail')?.value;
    const passVal = $('#loginPassword')?.value;
    doLogin(emailVal, passVal);
    return false;
  };
}

document.querySelectorAll('.demo-btn').forEach(btn => {
  btn.onclick = (e) => {
    if (e) e.preventDefault();
    const email = btn.dataset.email;
    const pass = btn.dataset.pass;
    if ($('#loginEmail')) $('#loginEmail').value = email;
    if ($('#loginPassword')) $('#loginPassword').value = pass;
    doLogin(email, pass);
    return false;
  };
});

$('#logoutBtn').onclick=()=>{authToken=null;localStorage.removeItem('wcaAuthToken');document.body.classList.remove('authenticated');};

async function parseJsonResponse(res) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return await res.json();
  }
  const text = await res.text();
  if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
    return { ok: false, isHtml: true, message: 'HTML response' };
  }
  return { ok: false, message: text || `HTTP ${res.status}` };
}

async function checkSmtpStatus() {
  if (!authToken) return;
  try {
    let res = await fetch(`${API_BASE}/smtp`, { headers: authHeaders() });
    if (!res.ok) {
      res = await fetch(`${API_ROOT}/settings/smtp`, { headers: authHeaders() });
    }
    if (res.ok) {
      const data = await parseJsonResponse(res);
      if (data && data.user) {
        if ($('#smtpHost')) $('#smtpHost').value = data.host || 'smtp.gmail.com';
        if ($('#smtpPort')) $('#smtpPort').value = data.port || 465;
        if ($('#smtpUser')) $('#smtpUser').value = data.user || '';
        if ($('#smtpMailFrom')) $('#smtpMailFrom').value = data.mailFrom || '';

        const badge = $('#smtpStatusBadge');
        if (badge) {
          badge.style.background = '#e5f5ef';
          badge.style.borderLeft = '4px solid #2f9d75';
          badge.innerHTML = `<strong>🟢 SMTP Configured (${data.user})</strong><p style="margin:4px 0 0;font-size:12px;color:#278261">Gmail SMTP email referral dispatch is ready and enabled.</p>`;
        }
        return;
      }
    }
  } catch (err) {}

  const badge = $('#smtpStatusBadge');
  if (badge) {
    badge.style.background = '#eef0f8';
    badge.style.borderLeft = '4px solid #6758d8';
    badge.innerHTML = `<strong>✉ Gmail Referral Engine Settings</strong><p style="margin:4px 0 0;font-size:12px;color:#444">Configure your Gmail address & 16-character App Password below for direct delivery.</p>`;
  }
}

const openSmtpBtn = $('#openSmtpBtn');
if (openSmtpBtn) {
  openSmtpBtn.onclick = () => {
    checkSmtpStatus();
    if ($('#smtpNotice')) $('#smtpNotice').textContent = '';
    $('#smtpDialog').showModal();
  };
}

const openSmtpFromDispatchBtn = $('#openSmtpFromDispatchBtn');
if (openSmtpFromDispatchBtn) {
  openSmtpFromDispatchBtn.onclick = () => {
    $('#emailDialog').close();
    checkSmtpStatus();
    if ($('#smtpNotice')) $('#smtpNotice').textContent = '';
    $('#smtpDialog').showModal();
  };
}

if ($('#closeSmtpDialog')) $('#closeSmtpDialog').onclick = () => $('#smtpDialog').close();
if ($('#cancelSmtp')) $('#cancelSmtp').onclick = () => $('#smtpDialog').close();

const smtpForm = $('#smtpForm');
if (smtpForm) {
  smtpForm.onsubmit = async event => {
    event.preventDefault();
    const data = new FormData(event.target);
    const notice = $('#smtpNotice');
    notice.style.color = '#5546c2';
    notice.textContent = 'Saving SMTP settings…';

    try {
      let response = await fetch(`${API_BASE}/smtp`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(Object.fromEntries(data))
      });
      if (!response.ok) {
        response = await fetch(`${API_ROOT}/settings/smtp`, {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(Object.fromEntries(data))
        });
      }
      const result = await parseJsonResponse(response);
      if (response.ok && result.message) {
        notice.style.color = '#2f9d75';
        notice.textContent = result.message;
        notify('SMTP settings saved successfully');
        setTimeout(() => $('#smtpDialog').close(), 1200);
      } else {
        notice.style.color = '#b33249';
        notice.textContent = result.message || 'SMTP settings could not be saved.';
        notify('SMTP settings were not saved');
      }
    } catch (err) {
      notice.style.color = '#b33249';
      notice.textContent = `SMTP settings error: ${err.message}`;
      notify('SMTP settings could not be saved');
    }
  };
}

const testSmtpBtn = $('#testSmtpBtn');
if (testSmtpBtn) {
  testSmtpBtn.onclick = async () => {
    const notice = $('#smtpNotice');
    const testEmail = $('#smtpTestEmail')?.value?.trim();
    notice.style.color = '#5546c2';
    notice.textContent = 'Testing SMTP connection…';

    const formData = new FormData($('#smtpForm'));
    const payload = Object.fromEntries(formData);
    payload.testEmail = testEmail;

    try {
      let res = await fetch(`${API_BASE}/smtp/test`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        res = await fetch(`${API_ROOT}/settings/smtp/test`, {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload)
        });
      }
      const result = await parseJsonResponse(res);
      if (res.ok && result.message) {
        notice.style.color = '#2f9d75';
        notice.textContent = result.message;
        notify('SMTP connection test succeeded!');
      } else {
        notice.style.color = '#b33249';
        notice.textContent = result.message || 'SMTP connection test failed.';
        notify('SMTP connection test failed');
      }
    } catch (err) {
      notice.style.color = '#b33249';
      notice.textContent = `SMTP connection error: ${err.message}`;
      notify('SMTP connection test failed');
    }
  };
}

function apiToView(row){
  let recipientEmails=[];
  let attachments=[];
  try { recipientEmails=row.recipient_emails?JSON.parse(row.recipient_emails):[]; } catch (error) {}
  try { attachments=row.attachments_json?JSON.parse(row.attachments_json):[]; } catch (error) {}
  return {
    id: row.id || row._id,
    ref: row.reference_number || row.referenceNumber,
    name: row.complainant_name || row.complainantName,
    nic: row.nic,
    phone: row.telephone || row.phone,
    address: row.address,
    district: row.district,
    subject: row.subject,
    source: row.source,
    category: row.category,
    subcategory: row.subcategory,
    recipientEmail: row.recipient_email || row.recipientEmail,
    recipientEmails: recipientEmails.length ? recipientEmails : (row.recipientEmails || (row.recipient_email || row.recipientEmail || '').split(/[;,\n]/).map(value => value.trim()).filter(Boolean)),
    attachmentName: row.attachment_name || row.attachmentName,
    attachmentUrl: row.attachment_url || row.attachmentUrl,
    attachmentSize: row.attachment_size || row.attachmentSize,
    attachments: attachments.length ? attachments : (row.attachments || []),
    priority: row.priority || 'Normal',
    status: row.status,
    receivedAt: row.received_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
    resolvedAt: row.closed_at || row.closedAt,
    received: row.received_at ? new Date(row.received_at).toLocaleDateString('en-GB') : (row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')),
    actionTaken: row.action_taken || row.actionTaken || (row.status === 'Awaiting Review' ? 'Pending review' : row.status),
    actionDate: row.action_date ? new Date(row.action_date).toLocaleDateString('en-GB') : (row.updated_at ? new Date(row.updated_at).toLocaleDateString('en-GB') : (row.updatedAt ? new Date(row.updatedAt).toLocaleDateString('en-GB') : 'Not recorded')),
    assigned: row.assigned_division || row.assignedDivision || 'Unassigned',
    dueAt: (row.due_at && row.due_at !== row.received_at) ? row.due_at : (row.received_at ? new Date(new Date(row.received_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() : null),
    due: (row.due_at && row.due_at !== row.received_at) ? new Date(row.due_at).toLocaleDateString('en-GB') : (row.received_at ? new Date(new Date(row.received_at).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB') : 'Not set'),
    overdue: Boolean((row.due_at && row.due_at !== row.received_at ? new Date(row.due_at) : (row.received_at ? new Date(new Date(row.received_at).getTime() + 7 * 24 * 60 * 60 * 1000) : null)) < new Date() && !['Resolved', 'Closed'].includes(row.status)),
    description: row.description
  };
}

async function loadDatabaseGrievances(){
  try{
    const response=await fetch(API_BASE,{headers:authHeaders()});
    if(response.status===401) throw new Error('Session expired.');
    if(!response.ok) throw new Error('API unavailable');
    const records=await response.json();
    cases=records.map(apiToView);
    renderRecent();renderAll();renderKanban();save();
    notify(`Connected to database · ${cases.length} records`);
  }catch(error){
    if(authToken){notify('The database could not be reached. Your unsaved work is still on this screen.');}
  }
}

async function ensureAuth() {
  if (authToken) return true;
  try {
    const activePass = getSavedUserPassword('admin@mwca.gov') || 'Admin@123';
    const res = await fetch(`${API_ROOT}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@mwca.gov', password: activePass })
    });
    const result = await res.json();
    if (res.ok && result.token) {
      authToken = result.token;
      localStorage.setItem('wcaAuthToken', authToken);
      setCurrentUser(result.user);
      return true;
    }
  } catch (err) {}
  return false;
}

$('#grievanceForm').onsubmit=async event=>{
  event.preventDefault();
  try{await attachmentReadPromise;}catch(error){notify(error.message);return;}
  await ensureAuth();
  const data=new FormData(event.target);
  const payload={
    complainantName:data.get('name'),
    nic:data.get('nic'),
    telephone:data.get('phone'),
    address:data.get('address'),
    district:data.get('district'),
    source:data.get('source'),
    receivedDate:data.get('date'),
    intakeMethod:data.get('method'),
    category:data.get('category')||'Women',
    subcategory:data.get('subcategory')||'General Inquiry',
    assignedDivision:data.get('assignedDivision')||null,
    recipientEmail:data.get('recipientEmail')||null,
    attachmentName:currentUploadedAttachments[0]?.name||null,
    attachmentUrl:currentUploadedAttachments[0]?.dataUrl||null,
    attachmentSize:currentUploadedAttachments[0]?.size||null,
    attachments:currentUploadedAttachments,
    deadlineDays:data.get('deadlineDays')||7,
    dueDate:data.get('dueDate')||null,
    subject:data.get('subject'),
    description:data.get('description'),
    priority:data.get('priority')
  };
  try{
    const response=await fetch(API_BASE,{method:'POST',headers:authHeaders({'Content-Type':'application/json'}),body:JSON.stringify(payload)});
    const result=await response.json();
    if(!response.ok) throw new Error(result.message||'Registration failed');
    event.target.reset();
    currentUploadedAttachments=[];
    const noticeEl=$('#attachmentFileNotice');
    if(noticeEl) noticeEl.innerHTML='';
    populateSubcategories('regCategory', 'regSubcategory');
    await loadDatabaseGrievances();
    notify(`Grievance ${result.referenceNumber} saved to database`);
    drill({status:'Awaiting Review'});
  }catch(error){
    notify(`Save failed: ${error.message}`);
  }
};

$('#saveStatus').onclick=async()=>{
  if(!selected||!selected.id){
    notify('This record is not stored in the database.');
    return;
  }
  try{
    const role=currentUser?.role;
    const endpoint=role==='REVIEWER'?`${API_BASE}/${selected.id}/status`:`${API_BASE}/${selected.id}`;
    const payload=role==='REVIEWER'?{status:$('#dialogStatus').value}:{status:$('#dialogStatus').value,priority:$('#dialogPriority').value,assigned_division:$('#dialogAssignee').value.trim()||null,recipient_email:$('#dialogRecipientEmail')?.value.trim()||null,due_at:$('#dialogDueDate')?.value ? new Date($('#dialogDueDate').value).toISOString() : undefined,attachments:selected.attachments||[]};
    const response=await fetch(endpoint,{method:'PATCH',headers:authHeaders({'Content-Type':'application/json'}),body:JSON.stringify(payload)});
    const result=await response.json();
    if(!response.ok) throw new Error(result.message||'Update failed');
    $('#caseDialog').close();
    await loadDatabaseGrievances();
    notify('Case status updated successfully');
  }catch(error){notify(error.message)}
};

$('#deleteCase').onclick=async()=>{
  if(!selected||!selected.id){notify('This record is not stored in the database.');return}
  if(currentUser?.role!=='ADMIN'){notify('Only an administrator can delete a grievance.');return}
  $('#deleteReference').textContent=selected.ref;
  $('#deleteDialog').showModal();
};

$('#cancelDelete').onclick=()=>$('#deleteDialog').close();
$('#confirmDelete').onclick=async()=>{
  try{
    const response=await fetch(`${API_BASE}/${selected.id}`,{method:'DELETE',headers:authHeaders()});
    const result=response.status===204?{}:await response.json();
    if(!response.ok) throw new Error(result.message||'Delete failed');
    $('#deleteDialog').close();$('#caseDialog').close();await loadDatabaseGrievances();notify('Grievance deleted');
  }catch(error){$('#deleteDialog').close();notify(error.message)}
};

function openEditGrievanceDialog() {
  if (!selected) return;

  if ($('#editGrievanceTitle')) $('#editGrievanceTitle').textContent = `Edit Grievance - ${selected.ref}`;
  if ($('#editName')) $('#editName').value = selected.name || '';
  if ($('#editNic')) $('#editNic').value = selected.nic || '';
  if ($('#editPhone')) $('#editPhone').value = selected.phone || '';
  if ($('#editDistrict')) $('#editDistrict').value = selected.district || 'Colombo';
  if ($('#editAddress')) $('#editAddress').value = selected.address || '';

  if ($('#editCategory')) {
    $('#editCategory').value = selected.category || 'Women';
    if (typeof populateSubcategories === 'function') {
      populateSubcategories('editCategory', 'editSubcategory', selected.subcategory || '');
    }
  }
  if ($('#editPriority')) $('#editPriority').value = selected.priority || 'Normal';
  if ($('#editSource')) $('#editSource').value = selected.source || 'Written Letter / Postal';
  if ($('#editAssigned')) $('#editAssigned').value = selected.assigned === 'Unassigned' ? '' : (selected.assigned || '');
  if ($('#editRecipientEmail')) $('#editRecipientEmail').value = selected.recipientEmail || '';
  
  if ($('#editDueDate')) {
    if (selected.dueAt) {
      try {
        const d = new Date(selected.dueAt);
        if (!isNaN(d.getTime())) $('#editDueDate').value = d.toISOString().slice(0, 10);
        else $('#editDueDate').value = '';
      } catch(e) { $('#editDueDate').value = ''; }
    } else {
      $('#editDueDate').value = '';
    }
  }

  if ($('#editConfidential')) $('#editConfidential').value = selected.confidential || 'Standard';
  if ($('#editSubject')) $('#editSubject').value = selected.subject || '';
  if ($('#editDescription')) $('#editDescription').value = selected.description || '';

  if ($('#editGrievanceDialog')) $('#editGrievanceDialog').showModal();
}

if ($('#editCategory')) {
  $('#editCategory').onchange = () => {
    if (typeof populateSubcategories === 'function') {
      populateSubcategories('editCategory', 'editSubcategory');
    }
  };
}

if ($('#editCaseBtn')) {
  $('#editCaseBtn').onclick = () => {
    openEditGrievanceDialog();
  };
}

if ($('#closeEditGrievanceDialog')) $('#closeEditGrievanceDialog').onclick = () => $('#editGrievanceDialog').close();
if ($('#cancelEditGrievance')) $('#cancelEditGrievance').onclick = () => $('#editGrievanceDialog').close();

const editGrievanceForm = $('#editGrievanceForm');
if (editGrievanceForm) {
  editGrievanceForm.onsubmit = async (e) => {
    e.preventDefault();
    if (!selected || !selected.id) {
      notify('Selected record is not stored in the database.');
      return;
    }
    if (currentUser?.role !== 'ADMIN') {
      notify('Only administrators can edit grievance details.');
      return;
    }

    const saveBtn = $('#saveEditGrievanceBtn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving Changes...';
    }

    try {
      const payload = {
        complainant_name: $('#editName').value.trim(),
        complainantName: $('#editName').value.trim(),
        name: $('#editName').value.trim(),
        nic: $('#editNic').value.trim(),
        telephone: $('#editPhone').value.trim(),
        phone: $('#editPhone').value.trim(),
        district: $('#editDistrict').value,
        address: $('#editAddress').value.trim(),
        category: $('#editCategory').value,
        subcategory: $('#editSubcategory').value,
        priority: $('#editPriority').value,
        source: $('#editSource').value,
        assigned_division: $('#editAssigned').value.trim() || null,
        assignedDivision: $('#editAssigned').value.trim() || null,
        recipient_email: $('#editRecipientEmail').value.trim() || null,
        recipientEmail: $('#editRecipientEmail').value.trim() || null,
        due_at: $('#editDueDate').value ? new Date($('#editDueDate').value).toISOString() : null,
        confidentiality: $('#editConfidential').value,
        confidential: $('#editConfidential').value,
        subject: $('#editSubject').value.trim(),
        description: $('#editDescription').value.trim()
      };

      const response = await fetch(`${API_BASE}/${selected.id}`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to update grievance');

      selected.name = payload.name;
      selected.nic = payload.nic;
      selected.phone = payload.phone;
      selected.district = payload.district;
      selected.address = payload.address;
      selected.category = payload.category;
      selected.subcategory = payload.subcategory;
      selected.priority = payload.priority;
      selected.source = payload.source;
      selected.assigned = payload.assigned_division || 'Unassigned';
      selected.recipientEmail = payload.recipient_email;
      selected.subject = payload.subject;
      selected.description = payload.description;
      selected.confidential = payload.confidentiality;

      $('#editGrievanceDialog').close();
      $('#caseDialog').close();
      await loadDatabaseGrievances();
      notify(`✅ Grievance ${selected.ref} updated successfully!`);
    } catch (err) {
      notify(`Update failed: ${err.message}`);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
      }
    }
  };
}

if (authToken) {
  fetch(`${API_ROOT}/auth/me`, { headers: authHeaders() })
    .then(response => response.ok ? response.json() : Promise.reject())
    .then(result => {
      setCurrentUser(result.user);
      checkSmtpStatus();
      return loadDatabaseGrievances();
    })
    .catch(() => {
      authToken = null;
      localStorage.removeItem('wcaAuthToken');
      document.body.classList.remove('authenticated');
    });
} else {
  document.body.classList.remove('authenticated');
}
syncDemoButtons();
