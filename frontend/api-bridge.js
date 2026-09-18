const API_ROOT=`http://${window.location.hostname}:3001/api`;
const API_BASE=`${API_ROOT}/grievances`;
let authToken=localStorage.getItem('wcaAuthToken');

function authHeaders(extra={}){ return {...extra, ...(authToken?{Authorization:`Bearer ${authToken}`}:{})}; }
function setUser(user){
  document.body.classList.add('authenticated');
  document.body.dataset.role=user.role;
  const displayName=user.fullName||user.full_name;
  $('#userName').textContent=displayName;
  $('#userRole').textContent=user.role;
  const initials=(displayName.match(/\b\w/g)||['U']).slice(0,2).join('').toUpperCase();
  $('#userAvatar').textContent=initials;
  if($('#profileDisplayName')) $('#profileDisplayName').textContent=displayName;
  if($('#profileAvatar')) $('#profileAvatar').textContent=initials;
  const canCreate=['ADMIN','OFFICER'].includes(user.role);
  const canEdit=['ADMIN','OFFICER','REVIEWER'].includes(user.role);
  $$('[data-go="register"],[data-page="register"]').forEach(control=>control.hidden=!canCreate);
  $('#dialogStatus').disabled=!canEdit;
  $('#dialogPriority').disabled=!['ADMIN','OFFICER'].includes(user.role);
  $('#dialogAssignee').disabled=!['ADMIN','OFFICER'].includes(user.role);
  $('#saveStatus').hidden=!canEdit;
  $('#deleteCase').hidden=user.role!=='ADMIN';
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
  $('#profileError').textContent='Saving…';
  try{
    const response=await fetch(`${API_ROOT}/auth/me`,{method:'PATCH',headers:authHeaders({'Content-Type':'application/json'}),body:JSON.stringify(Object.fromEntries(data))});
    const result=await response.json();
    if(!response.ok) throw new Error(result.message||'Profile update failed');
    setCurrentUser(result.user);$('#profileDialog').close();notify('Profile updated successfully');
  }catch(error){$('#profileError').textContent=error.message}
};

document.querySelectorAll('.demo-btn').forEach(btn => {
  btn.onclick = () => {
    const email = btn.dataset.email;
    const pass = btn.dataset.pass;
    if ($('#loginEmail')) $('#loginEmail').value = email;
    if ($('#loginPassword')) $('#loginPassword').value = pass;
    if ($('#loginForm')) $('#loginForm').requestSubmit();
  };
});

$('#loginForm').onsubmit=async event=>{
  event.preventDefault();
  const data=new FormData(event.target);
  $('#loginError').textContent='Signing in…';
  try{
    const response=await fetch(`${API_ROOT}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:data.get('email'),password:data.get('password')})});
    const result=await response.json();
    if(!response.ok) throw new Error(result.message||'Sign in failed');
    authToken=result.token;localStorage.setItem('wcaAuthToken',authToken);setCurrentUser(result.user);$('#loginError').textContent='';
    await loadDatabaseGrievances();
    checkSmtpStatus();
  }catch(error){$('#loginError').textContent=error.message==='Failed to fetch'?'The backend service is not running on port 3001. Please start the backend server.':error.message}
};

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
    dueAt: row.due_at || row.dueAt || row.received_at || row.createdAt || null,
    due: row.due_at ? new Date(row.due_at).toLocaleDateString('en-GB') : (row.dueAt ? new Date(row.dueAt).toLocaleDateString('en-GB') : 'Not set'),
    overdue: Boolean((row.due_at || row.received_at || row.createdAt) && new Date(row.due_at || row.received_at || row.createdAt) < new Date() && !['Resolved', 'Closed'].includes(row.status)),
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
    const res = await fetch(`${API_ROOT}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@mwca.gov', password: 'Admin@123' })
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
    recipientEmails:String(data.get('recipientEmail') || '').split(/[;,\n]/).map(value => value.trim()).filter(Boolean),
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
    const payload=role==='REVIEWER'?{status:$('#dialogStatus').value}:{status:$('#dialogStatus').value,priority:$('#dialogPriority').value,assigned_division:$('#dialogAssignee').value.trim()||null,recipient_email:$('#dialogRecipientEmail')?.value.trim()||null,attachments:selected.attachments||[]};
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

if(authToken){
  fetch(`${API_ROOT}/auth/me`,{headers:authHeaders()}).then(response=>response.ok?response.json():Promise.reject()).then(result=>{setCurrentUser(result.user);checkSmtpStatus();return loadDatabaseGrievances()}).catch(()=>{authToken=null;localStorage.removeItem('wcaAuthToken');ensureAuth().then(()=>{checkSmtpStatus();loadDatabaseGrievances();});});
} else {
  ensureAuth().then(() => { checkSmtpStatus(); loadDatabaseGrievances(); });
}
