const subcategoryMap = {
  'Women': [
    'Abuse / Domestic Violence',
    'Financial Assistance',
    'Maintenance & Family Disputes',
    'Legal Aid & Rights',
    'Employment & Workplace Harassment',
    'Health & Psychosocial Support',
    'Cyber Harassment',
    "Other Women's Issues"
  ],
  'Child': [
    'Child Abuse & Exploitation',
    'Financial & Educational Support',
    'Early Childhood Development & Pre-School',
    'Probation & Custody Services',
    'Child Protection & Safety',
    'Child Labor & Trafficking',
    "Other Child Issues"
  ],
  'General / Other': [
    'General Inquiry',
    'Administrative Complaint',
    'Policy & Service Feedback',
    'Other'
  ]
};

const sources = [
  'Presidential Secretariat',
  "Prime Minister's Office",
  'Public Persons',
  'Admin Unit'
];

const departments = [
  "Minister's Office",
  'Secretary Office',
  'Financial',
  'Development Branch',
  'Planning Division',
  'Child Secretariat Office',
  "Women's Bureau",
  'National Commission On Women',
  'National Child Protection Authority',
  'Department of Probation and Child Care Service'
];

const featured = [
  {
    ref: 'MWCA/GMS/2026/0249',
    name: 'N. Perera',
    subject: 'Request for urgent child safeguarding intervention',
    source: 'Presidential Secretariat',
    category: 'Child',
    subcategory: 'Child Protection & Safety',
    status: 'Awaiting Review',
    received: '15 Sep 2026',
    assigned: 'National Child Protection Authority',
    due: '16 Sep 2026',
    priority: 'Critical',
    description: 'Urgent referral from Presidential Secretariat requesting immediate assessment by authorized officers.'
  },
  {
    ref: 'MWCA/GMS/2026/0248',
    name: 'S. Fernando',
    subject: 'Women’s micro-grant and financial empowerment inquiry',
    source: 'Public Persons',
    category: 'Women',
    subcategory: 'Financial Assistance',
    status: 'Assigned',
    received: '14 Sep 2026',
    assigned: "Women's Bureau",
    due: '18 Sep 2026',
    priority: 'Normal',
    description: 'Applicant requesting self-employment micro-grant guidance under women’s welfare scheme.'
  },
  {
    ref: 'MWCA/GMS/2026/0247',
    name: 'R. Kumari',
    subject: 'Maintenance support and legal guidance request',
    source: "Prime Minister's Office",
    category: 'Women',
    subcategory: 'Maintenance & Family Disputes',
    status: 'Forwarded',
    received: '12 Sep 2026',
    assigned: 'National Commission On Women',
    due: '20 Sep 2026',
    priority: 'High',
    description: 'Grievance regarding non-payment of family maintenance forwarded for legal committee review.'
  },
  {
    ref: 'MWCA/GMS/2026/0246',
    name: 'M. Fathima',
    subject: 'Early childhood pre-school assistance',
    source: 'Admin Unit',
    category: 'Child',
    subcategory: 'Early Childhood Development & Pre-School',
    status: 'Assigned',
    received: '10 Sep 2026',
    assigned: 'Child Secretariat Office',
    due: '19 Sep 2026',
    priority: 'Normal',
    description: 'Request regarding pre-school facility grant and early child care support.'
  },
  {
    ref: 'MWCA/GMS/2026/0245',
    name: 'D. Jayasinghe',
    subject: 'Probation oversight & child care placement',
    source: 'Presidential Secretariat',
    category: 'Child',
    subcategory: 'Probation & Custody Services',
    status: 'Forwarded',
    received: '08 Sep 2026',
    assigned: 'Department of Probation and Child Care Service',
    due: '22 Sep 2026',
    priority: 'High',
    description: 'Child custody and probation care placement review submitted through Presidential Secretariat.'
  }
];

function buildSeed() {
  const list = [...featured];
  const cats = [
    ['Women', 'Abuse / Domestic Violence'],
    ['Women', 'Financial Assistance'],
    ['Women', 'Maintenance & Family Disputes'],
    ['Women', 'Legal Aid & Rights'],
    ['Child', 'Child Abuse & Exploitation'],
    ['Child', 'Financial & Educational Support'],
    ['Child', 'Child Protection & Safety'],
    ['Child', 'Early Childhood Development & Pre-School'],
    ['General / Other', 'General Inquiry']
  ];
  const stats = ['Awaiting Review', 'Assigned', 'Forwarded', 'Resolved'];
  const prio = ['Normal', 'High', 'Critical'];

  for (let i = list.length; i < 249; i++) {
    const [cat, sub] = cats[i % cats.length];
    const status = stats[i % stats.length];
    const source = sources[i % sources.length];
    const dept = status === 'Awaiting Review' ? 'Unassigned' : departments[i % departments.length];
    const priority = prio[i % prio.length];
    const ref = `MWCA/GMS/2026/${String(249 - i).padStart(4, '0')}`;

    list.push({
      ref,
      name: `Complainant ${String(i + 1).padStart(3, '0')}`,
      subject: `${sub} - Grievance Record #${i + 1}`,
      source,
      category: cat,
      subcategory: sub,
      status,
      received: `${String((i % 28) + 1).padStart(2, '0')} Aug 2026`,
      assigned: dept,
      due: status === 'Resolved' ? 'Completed' : `${(i % 18) + 10} Sep 2026`,
      priority,
      description: `Registered MWCA grievance from ${source} categorized under ${cat} - ${sub}.`
    });
  }
  return list;
}

const seed = buildSeed();
const stored = JSON.parse(localStorage.getItem('wcaCases') || 'null');
let cases = stored && stored.length >= 200 ? stored : seed;
let selected = null;
let overdueOnly = false;
let emailReminderMode = false;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const translations = {
  'Workspace': 'වැඩ ඉඩම', 'Overview': 'දළ විශ්ලේෂණය', "Today’s activity": 'අද ක්‍රියාකාරකම්',
  'Find a grievance': 'පැමිණිල්ලක් සොයන්න', 'Search all cases': 'සියලුම සිද්ධි සොයන්න',
  'Register a grievance': 'පැමිණිල්ලක් ලියාපදිංචි කරන්න', 'Create a new case': 'නව සිද්ධියක් සාදන්න',
  'Assign & refer': 'පවරන්න සහ යොමු කරන්න', 'Move work forward': 'වැඩය ඉදිරියට ගෙන යන්න',
  'Insights': 'විශ්ලේෂණ', 'Reports': 'වාර්තා', 'Performance overview': 'කාර්ය සාධන දළ විශ්ලේෂණය',
  'Secure workspace': 'ආරක්ෂිත වැඩ ඉඩම', 'Audit logging enabled': 'විගණන සටහන් සක්‍රීයයි',
  'Grievance Overview': 'පැමිණිලි දළ විශ්ලේෂණය', 'All Grievances': 'සියලුම පැමිණිලි',
  'Good morning, MWCA Grievance Officer': 'සුභ උදෑසනක්, MWCA පැමිණිලි නිලධාරී',
  'Total Grievances': 'මුළු පැමිණිලි', 'Awaiting Review': 'සමාලෝචනයට බලාපොරොත්තුවෙන්',
  'Department Referrals': 'දෙපාර්තමේන්තු යොමු කිරීම්', 'Resolved': 'විසඳන ලදී',
  'Grievance activity': 'පැමිණිලි ක්‍රියාකාරකම්', 'Received': 'ලැබුණු', 'By Category': 'කාණ්ඩය අනුව',
  'Women’s Grievances': 'කාන්තා පැමිණිලි', 'Child Grievances': 'ළමා පැමිණිලි', 'General / Other': 'සාමාන්‍ය / වෙනත්',
  'Recent grievances': 'මෑත පැමිණිලි', 'View all →': 'සියල්ල බලන්න →',
  'Showing': 'පෙන්වන්නේ', 'All grievances': 'සියලුම පැමිණිලි', 'All Sources': 'සියලුම මූලාශ්‍ර',
  'All Categories': 'සියලුම කාණ්ඩ', 'All Subcategories': 'සියලුම උප කාණ්ඩ', 'All Departments': 'සියලුම දෙපාර්තමේන්තු',
  'All Statuses': 'සියලුම තත්ත්ව', 'All Priorities': 'සියලුම ප්‍රමුඛතා', 'Download list': 'ලැයිස්තුව බාගන්න',
  'Where did it come from? *': 'පැමිණියේ කොහෙන්ද? *', 'Date received *': 'ලැබුණු දිනය *',
  'Intake Method': 'ලැබුණු ක්‍රමය', 'Priority Level': 'ප්‍රමුඛතා මට්ටම', 'Complainant Information': 'පැමිණිලිකරුගේ තොරතුරු',
  'Full name *': 'සම්පූර්ණ නම *', 'NIC / ID Number': 'ජාතික හැඳුනුම්පත් / ID අංකය', 'Contact number': 'දුරකථන අංකය',
  'Address': 'ලිපිනය', 'District': 'දිස්ත්‍රික්කය', 'Main Category *': 'ප්‍රධාන කාණ්ඩය *', 'Subcategory *': 'උප කාණ්ඩය *',
  'Department Referrals & Assignments': 'දෙපාර්තමේන්තු යොමු කිරීම් සහ පැවරුම්',
  'Awaiting Assignment': 'පැවරුමට බලාපොරොත්තුවෙන්', 'Forwarded to Department': 'දෙපාර්තමේන්තුවට යොමු කළ',
  'Resolved by Department': 'දෙපාර්තමේන්තුව විසඳූ', 'Grievance intake and case status': 'පැමිණිලි ලැබීම් සහ සිද්ධි තත්ත්වය',
  'Grievances received by office': 'කාර්යාල අනුව ලැබුණු පැමිණිලි', 'Current case status': 'වත්මන් සිද්ධි තත්ත්වය',
  'Print report': 'වාර්තාව මුද්‍රණය කරන්න', 'Sign out': 'ඉවත් වන්න', 'Administrator profile': 'පරිපාලක පැතිකඩ',
  'Cancel': 'අවලංගු කරන්න', 'Save profile': 'පැතිකඩ සුරකින්න', 'Select district': 'දිස්ත්‍රික්කය තෝරන්න',
  '1. Intake Source & Details': '1. ලැබුණු මූලාශ්‍රය සහ විස්තර', '2. Complainant Information': '2. පැමිණිලිකරුගේ තොරතුරු',
  '3. Classification & Routing': '3. වර්ගීකරණය සහ යොමු කිරීම', 'Fields marked * are required': '* සලකුණු කළ ක්ෂේත්‍ර අනිවාර්ය වේ',
  'Public Persons': 'මහජනතාව', 'Presidential Secretariat': 'ජනාධිපති ලේකම් කාර්යාලය',
  "Prime Minister's Office": 'අග්‍රාමාත්‍ය කාර්යාලය', 'By Hand': 'පෞද්ගලිකව පැමිණීම',
  'Letter / Dispatch': 'ලිපිය / යොමු කිරීම', 'Email': 'විද්‍යුත් තැපෑල', 'Telephone Hotline': 'දුරකථන හදිසි සේවාව',
  'Online Form': 'මාර්ගගත පෝරමය', 'Normal': 'සාමාන්‍ය', 'High': 'ඉහළ', 'Critical': 'හදිසි',
  'Women': 'කාන්තා', 'Child': 'ළමා', 'General / Other': 'සාමාන්‍ය / වෙනත්',
  '-- Select Subcategory --': '-- උප කාණ්ඩය තෝරන්න --', 'Select district': 'දිස්ත්‍රික්කය තෝරන්න',
  'Assign / Forward to Department or Ministry': 'දෙපාර්තමේන්තුවට හෝ අමාත්‍යාංශයට පවරන්න / යොමු කරන්න',
  'Recipient Department Email': 'ලබන්නාගේ දෙපාර්තමේන්තු විද්‍යුත් තැපෑල',
  'Attach Grievance Document / Letter': 'පැමිණිලි ලේඛනය / ලිපිය අමුණන්න', 'Subject *': 'විෂයය *',
  'Description *': 'විස්තරය *', 'Register grievance': 'පැමිණිල්ල ලියාපදිංචි කරන්න',
  'Presidential Secretariat / PMO, Public Persons, or Admin Unit.': 'ජනාධිපති ලේකම් කාර්යාලය / අග්‍රාමාත්‍ය කාර්යාලය හෝ මහජනතාව.',
  'Abuse / Domestic Violence': 'අපයෝජනය / ගෘහස්ථ ප්‍රචණ්ඩත්වය', 'Financial Assistance': 'මූල්‍ය සහාය',
  'Maintenance & Family Disputes': 'නඩත්තු සහ පවුල් ආරවුල්', 'Legal Aid & Rights': 'නීති සහාය සහ අයිතිවාසිකම්',
  'Employment & Workplace Harassment': 'රැකියා සහ සේවා ස්ථාන හිංසනය', 'Health & Psychosocial Support': 'සෞඛ්‍ය සහ මනෝ සමාජීය සහාය',
  'Cyber Harassment': 'සයිබර් හිංසනය', "Other Women's Issues": 'වෙනත් කාන්තා ගැටලු',
  'Child Abuse & Exploitation': 'ළමා අපයෝජනය සහ සූරාකෑම', 'Financial & Educational Support': 'මූල්‍ය සහ අධ්‍යාපනික සහාය',
  'Early Childhood Development & Pre-School': 'මුල් ළමාවිය සංවර්ධනය සහ පෙර පාසල්', 'Probation & Custody Services': 'රිමාන්ඩ් සහ භාරකාර සේවා',
  'Child Protection & Safety': 'ළමා ආරක්ෂාව සහ සුරක්ෂිතතාව', 'Child Labor & Trafficking': 'ළමා ශ්‍රමය සහ ජාවාරම',
  "Other Child Issues": 'වෙනත් ළමා ගැටලු', 'General Inquiry': 'සාමාන්‍ය විමසීම', 'Administrative Complaint': 'පරිපාලන පැමිණිල්ල',
  'Policy & Service Feedback': 'ප්‍රතිපත්ති සහ සේවා ප්‍රතිචාර', 'Other': 'වෙනත්',
  'Ampara': 'අම්පාර', 'Anuradhapura': 'අනුරාධපුර', 'Badulla': 'බදුල්ල', 'Batticaloa': 'මඩකලපුව',
  'Colombo': 'කොළඹ', 'Galle': 'ගාල්ල', 'Gampaha': 'ගම්පහ', 'Hambantota': 'හම්බන්තොට', 'Jaffna': 'යාපනය',
  'Kalutara': 'කළුතර', 'Kandy': 'මහනුවර', 'Kegalle': 'කෑගල්ල', 'Kilinochchi': 'කිලිනොච්චි',
  'Kurunegala': 'කුරුණෑගල', 'Mannar': 'මන්නාරම', 'Matale': 'මාතලේ', 'Matara': 'මාතර', 'Monaragala': 'මොනරාගල',
  'Mullaitivu': 'මුලතිව්', 'Nuwara Eliya': 'නුවරඑළිය', 'Polonnaruwa': 'පොළොන්නරුව', 'Puttalam': 'පුත්තලම',
  'Ratnapura': 'රත්නපුර', 'Trincomalee': 'ත්‍රිකුණාමලය', 'Vavuniya': 'වවුනියාව',
  '07X XXX XXXX': '07X XXX XXXX', 'Enter address': 'ලිපිනය ඇතුළත් කරන්න', 'Type or select any custom department or ministry name (e.g. NCPA, Ministry of Health, Sri Lanka Police)': 'දෙපාර්තමේන්තුව හෝ අමාත්‍යාංශය ටයිප් කරන්න හෝ තෝරන්න',
  'e.g. info@childprotection.gov.lk or type custom email address': 'උදා: info@childprotection.gov.lk හෝ අභිරුචි විද්‍යුත් තැපෑලක් ඇතුළත් කරන්න',
  'Describe the grievance in detail': 'පැමිණිල්ලේ විස්තර ඇතුළත් කරන්න', 'Enter subject': 'විෂයය ඇතුළත් කරන්න',
  'Critical: Immediate threat or severe risk requiring emergency dispatch.': 'හදිසි: වහාම ක්‍රියාමාර්ග අවශ්‍ය අවදානම් තත්ත්වයකි.',
  'e.g., Request for urgent assistance regarding child welfare': 'උදා: ළමා සුබසාධනය සඳහා හදිසි සහාය ඉල්ලීම',
  'Write full details of the grievance, requested relief, and context.': 'පැමිණිල්ල, ඉල්ලා සිටින සහනය සහ පසුබිම පිළිබඳ සම්පූර්ණ විස්තර ලියන්න.',
  "Minister's Office": 'අමාත්‍ය කාර්යාලය',
  'Secretary Office': 'ලේකම් කාර්යාලය',
  'Financial': 'මුදල් අංශය',
  'Development Branch': 'සංවර්ධන අංශය',
  'Planning Division': 'ක්‍රමසම්පාදන අංශය',
  'Child Secretariat Office': 'ළමා ලේකම් කාර්යාලය',
  "Women's Bureau": 'කාන්තා කාර්යාංශය',
  'National Commission On Women': 'කාන්තාවන් පිළිබඳ ජාතික කොමිෂන් සභාව',
  'National Child Protection Authority': 'ජාතික ළමා ආරක්ෂක අධිකාරිය',
  'Department of Probation and Child Care Service': 'පරිවාස හා ළමාරක්ෂක සේවා දෙපාර්තමේන්තුව',
  'National Committee on Women': 'කාන්තාවන් පිළිබඳ ජාතික කමිටුව',
  "Women's Bureau of Sri Lanka": 'ශ්‍රී ලංකා කාන්තා කාර්යාංශය',
  'Department of Probation and Child Care Services': 'පරිවාස හා ළමාරක්ෂක සේවා දෙපාර්තමේන්තුව',
  'National Secretariat for Early Childhood Development': 'මුල් ළමාවිය සංවර්ධනය පිළිබඳ ජාතික ලේකම් කාර්යාලය'
};

function applyLanguage(language = localStorage.getItem('wcaLanguage') || 'en') {
  document.documentElement.lang = language === 'si' ? 'si' : 'en';
  document.querySelectorAll('[data-language]').forEach(button => button.classList.toggle('active', button.dataset.language === language));
  if (language === 'en') return;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    const original = node.nodeValue.trim();
    if (translations[original]) node.nodeValue = node.nodeValue.replace(original, translations[original]);
  });
  document.querySelectorAll('option').forEach(option => {
    const original = option.dataset.english || option.textContent.trim();
    option.dataset.english = original;
    option.textContent = translations[original] || original;
  });
  document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(field => {
    const original = field.dataset.englishPlaceholder || field.getAttribute('placeholder');
    field.dataset.englishPlaceholder = original;
    field.setAttribute('placeholder', translations[original] || original);
  });
}

document.querySelectorAll('[data-language]').forEach(button => {
  button.onclick = () => {
    localStorage.setItem('wcaLanguage', button.dataset.language);
    window.location.reload();
  };
});

document.querySelector('select[name="confidential"]')?.closest('label')?.remove();

const sriLankaDistricts = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo',
  'Galle', 'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara',
  'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala', 'Mannar',
  'Matale', 'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya',
  'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya'
];

const districtSelect = document.querySelector('select[name="district"]');
if (districtSelect) {
  districtSelect.innerHTML = '<option value="">Select district</option>' + sriLankaDistricts.map(district => `<option value="${district}">${district}</option>`).join('');
}

const titles = {
  dashboard: ['Grievance Overview', 'Ministry of Women and Child Affairs Workspace'],
  grievances: ['All Grievances', 'Filter, assign and track registered cases'],
  register: ['Register New Grievance'],
  referrals: ['Department Referrals & Assignments', 'Track case routing across MWCA institutions'],
  reports: ['Reports & Analytics', 'Management metrics and department performance']
};

function esc(v) {
  return String(v || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function statusClass(s) {
  return String(s || 'Normal').toLowerCase().replaceAll(' ', '-').replaceAll('/', '-');
}

function priorityClass(p) {
  return statusClass(p || 'Normal');
}

function priorityBadge(p) {
  const val = p || 'Normal';
  return `<span class="priority ${priorityClass(val)}">${esc(val)}</span>`;
}

function isOverdue(c) {
  return Boolean(c.overdue || (c.dueAt && new Date(c.dueAt) < new Date() && !['Resolved', 'Closed'].includes(c.status)));
}

function updateHeaderDateTime() {
  const pageSub = $('#pageSub');
  const greetingEl = $('#welcomeGreeting');
  const now = new Date();
  const language = localStorage.getItem('wcaLanguage') || 'en';
  const activePage = document.querySelector('.page.active')?.id?.replace('Page', '') || 'dashboard';

  const optionsDate = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const optionsTime = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };

  const dateStr = now.toLocaleDateString(language === 'si' ? 'si-LK' : 'en-US', optionsDate);
  const timeStr = now.toLocaleTimeString(language === 'si' ? 'si-LK' : 'en-US', optionsTime);

  if (pageSub) {
    if (activePage === 'dashboard') {
      pageSub.innerHTML = `<span style="font-weight:600">${dateStr}</span> <span style="margin:0 6px;opacity:0.4">|</span> <span style="color:#2563eb;font-weight:700">${timeStr}</span>`;
    }
  }

  if (greetingEl) {
    const hours = now.getHours();
    let timeGreeting = 'Good morning';
    if (hours >= 12 && hours < 17) {
      timeGreeting = 'Good afternoon';
    } else if (hours >= 17) {
      timeGreeting = 'Good evening';
    }
    const roleTitle = currentUser?.role === 'ADMIN' ? 'Admin Officer' : 'Grievance Officer';
    greetingEl.textContent = `${timeGreeting}, MWCA ${roleTitle}`;
  }
}

setInterval(updateHeaderDateTime, 1000);

function showPage(page) {
  $$('.page').forEach(p => p.classList.remove('active'));
  $(`#${page}Page`).classList.add('active');
  $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === page));
  const language = localStorage.getItem('wcaLanguage') || 'en';
  $('#pageTitle').textContent = language === 'si' ? (translations[titles[page][0]] || titles[page][0]) : titles[page][0];
  
  if (page === 'dashboard') {
    updateHeaderDateTime();
  } else {
    $('#pageSub').textContent = language === 'si' ? (translations[titles[page][1]] || titles[page][1]) : titles[page][1];
  }

  $('#sidebar').classList.remove('open');
  window.scrollTo(0, 0);
  if (page === 'grievances') renderAll();
  if (page === 'referrals') renderKanban();
}

$$('[data-page]').forEach(b => b.onclick = () => showPage(b.dataset.page));
$$('[data-go]').forEach(b => b.onclick = () => showPage(b.dataset.go));
$('#menu').onclick = () => $('#sidebar').classList.toggle('open');

// Dynamic subcategory population helper
function populateSubcategories(categorySelectId, subcategorySelectId, selectedSub = '') {
  const catEl = $(`#${categorySelectId}`);
  const subEl = $(`#${subcategorySelectId}`);
  if (!catEl || !subEl) return;

  const category = catEl.value;
  const list = subcategoryMap[category] || [];

  const language = localStorage.getItem('wcaLanguage') || 'en';
  const emptyLabel = categorySelectId === 'categoryFilter' ? 'All Subcategories' : '-- Select Subcategory --';
  const display = value => language === 'si' ? (translations[value] || value) : value;
  subEl.innerHTML = `<option value="${categorySelectId === 'categoryFilter' ? 'all' : ''}">${display(emptyLabel)}</option>` +
    list.map(s => `<option value="${esc(s)}" ${s === selectedSub ? 'selected' : ''}>${esc(display(s))}</option>`).join('');
}

// Bind register form dynamic subcategories & auto department routing
const regCategoryEl = $('#regCategory');
if (regCategoryEl) {
  regCategoryEl.onchange = () => {
    populateSubcategories('regCategory', 'regSubcategory');
    autoSuggestDepartment();
  };
  populateSubcategories('regCategory', 'regSubcategory');
}

function autoSuggestDepartment() {
  const cat = $('#regCategory')?.value;
  const sub = $('#regSubcategory')?.value;
  const deptEl = $('#regDepartment');
  const emailEl = $('#regRecipientEmail');
  if (!deptEl || !emailEl) return;

  let suggestedDept = '';
  if (cat === 'Child') {
    if (sub?.includes('Protection') || sub?.includes('Abuse')) suggestedDept = 'National Child Protection Authority';
    else if (sub?.includes('Early Childhood')) suggestedDept = 'Child Secretariat Office';
    else if (sub?.includes('Probation') || sub?.includes('Custody')) suggestedDept = 'Department of Probation and Child Care Service';
    else suggestedDept = 'National Child Protection Authority';
  } else if (cat === 'Women') {
    if (sub?.includes('Financial')) suggestedDept = 'Financial';
    else if (sub?.includes('Employment')) suggestedDept = "Women's Bureau";
    else if (sub?.includes('Maintenance') || sub?.includes('Abuse') || sub?.includes('Legal') || sub?.includes('Harassment')) suggestedDept = 'National Commission On Women';
    else suggestedDept = 'National Commission On Women';
  }

  if (suggestedDept) {
    const isSinhala = document.documentElement.lang === 'si';
    const sinhalaName = translations[suggestedDept] || suggestedDept;
    const deptVal = isSinhala ? sinhalaName : `${sinhalaName} (${suggestedDept})`;
    deptEl.value = deptVal;
    const defaultEmails = getDepartmentDefaultEmails(suggestedDept);
    if (defaultEmails) emailEl.value = defaultEmails;
  }
}

const regSubcategoryEl = $('#regSubcategory');
if (regSubcategoryEl) {
  regSubcategoryEl.addEventListener('change', autoSuggestDepartment);
}

// Bind filter bar dynamic subcategories
const categoryFilterEl = $('#categoryFilter');
if (categoryFilterEl) {
  categoryFilterEl.onchange = () => {
    populateSubcategories('categoryFilter', 'subcategoryFilter');
    renderAll();
  };
}

function row(c) {
  return `<tr data-ref="${esc(c.ref)}">
    <td class="ref">${esc(c.ref)}</td>
    <td class="person"><strong>${esc(c.name)}</strong><span>${esc(c.subject)}</span></td>
    <td>${esc(c.source)}</td>
    <td><strong>${esc(c.category)}</strong><br><small style="color:var(--text-muted, #666)">${esc(c.subcategory || 'General')}</small></td>
    <td>${esc(c.assigned || 'Unassigned')}</td>
    <td><span class="badge ${statusClass(c.status)}">${esc(c.status)}</span></td>
    <td>${esc(c.due || c.received)}</td>
  </tr>`;
}

async function deleteGrievance(id, ref) {
  const g = cases.find(c => c.id == id || c.ref === ref || c.ref === id);
  const targetRef = g ? g.ref : (ref || id);
  const targetId = g ? g.id : id;

  if (!confirm(`Are you sure you want to delete grievance ${targetRef}? This action cannot be undone.`)) return;

  try {
    const res = await fetch(`${API_BASE}/${targetId}`, {
      method: 'DELETE',
      headers: typeof authHeaders === 'function' ? authHeaders() : { 'Content-Type': 'application/json' }
    });
    if (!res.ok && res.status !== 204) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to delete grievance');
    }
    cases = cases.filter(c => c.id != targetId && c.ref !== targetRef);
    if (typeof save === 'function') save();
    if (typeof renderRecent === 'function') renderRecent();
    if (typeof renderAll === 'function') renderAll();
    if (typeof renderKanban === 'function') renderKanban();
    notify(`Grievance ${targetRef} deleted successfully.`);
  } catch (error) {
    notify(`Delete error: ${error.message}`);
  }
}

function bindRows() {
  $$('tbody tr[data-ref], .case-card[data-ref]').forEach(r => {
    r.onclick = (e) => {
      if (e.target.closest('.btn-delete')) return;
      openCase(r.dataset.ref);
    };
  });
  $$('.btn-delete').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      deleteGrievance(btn.dataset.id, btn.dataset.ref);
    };
  });
}

function renderRecent() {
  $('#recentBody').innerHTML = cases.slice(0, 6).map(c => `<tr data-ref="${esc(c.ref)}">
    <td class="ref">${esc(c.ref)}</td>
    <td class="person"><strong>${esc(c.name)}</strong><span>${esc(c.subject)}</span></td>
    <td><span class="source-pill">${esc(c.source)}</span></td>
    <td><strong>${esc(c.category)}</strong><br><small>${esc(c.subcategory || '')}</small></td>
    <td>${esc(c.assigned || 'Unassigned')}</td>
    <td><span class="badge ${statusClass(c.status)}">${esc(c.status)}</span></td>
    <td>${esc(c.due || c.received)}</td>
  </tr>`).join('');
  bindRows();
}

function filteredCases() {
  const q = ($('#searchInput').value || '').toLowerCase();
  const source = $('#sourceFilter') ? $('#sourceFilter').value : 'all';
  const category = $('#categoryFilter') ? $('#categoryFilter').value : 'all';
  const subcategory = $('#subcategoryFilter') ? $('#subcategoryFilter').value : 'all';
  const department = $('#departmentFilter') ? $('#departmentFilter').value : 'all';
  const status = $('#statusFilter') ? $('#statusFilter').value : 'all';
  const priority = $('#priorityFilter') ? $('#priorityFilter').value : 'all';

  return cases.filter(c => {
    if (overdueOnly && !isOverdue(c)) return false;
    if (source !== 'all' && c.source !== source) return false;
    if (category !== 'all' && c.category !== category) return false;
    if (subcategory !== 'all' && c.subcategory !== subcategory) return false;
    if (department !== 'all' && c.assigned !== department) return false;
    if (status === 'Overdue') {
      if (!isOverdue(c)) return false;
    } else if (status !== 'all' && c.status !== status) {
      return false;
    }
    if (priority !== 'all' && (c.priority || 'Normal') !== priority) return false;
    if (q) {
      const text = [c.ref, c.name, c.subject, c.source, c.category, c.subcategory, c.assigned, c.description, c.priority].join(' ').toLowerCase();
      if (!text.includes(q)) return false;
    }
    return true;
  });
}

function renderAll() {
  const f = filteredCases();
  const q = $('#searchInput').value;
  const source = $('#sourceFilter') ? $('#sourceFilter').value : 'all';
  const cat = $('#categoryFilter') ? $('#categoryFilter').value : 'all';
  const subcat = $('#subcategoryFilter') ? $('#subcategoryFilter').value : 'all';
  const dept = $('#departmentFilter') ? $('#departmentFilter').value : 'all';
  const s = $('#statusFilter').value;
  const p = $('#priorityFilter').value;

  $('#allBody').innerHTML = f.map(c => `<tr data-ref="${esc(c.ref)}">
    <td class="ref">${esc(c.ref)}</td>
    <td>${esc(c.received)}</td>
    <td><span class="badge ${statusClass(c.status)}">${esc(c.status)}</span></td>
    <td><strong>${esc(c.category)}</strong><br><small style="color:#555">${esc(c.subcategory || '')}</small></td>
    <td>${esc(c.subject)}</td>
    <td>${esc(c.name)}</td>
    <td>${esc(c.assigned || 'Unassigned')}</td>
    <td>${esc(c.actionTaken || 'Pending review')}<br><small style="color:#555">${esc(c.actionDate || 'Not recorded')}</small></td>
  </tr>`).join('') || '<tr><td colspan="8">No matching grievances found.</td></tr>';

  const labels = [];
  if (overdueOnly || s === 'Overdue') labels.push('Overdue grievances');
  if (source !== 'all') labels.push(`Source: ${source}`);
  if (cat !== 'all') labels.push(`Category: ${cat}`);
  if (subcat !== 'all') labels.push(`Subcategory: ${subcat}`);
  if (dept !== 'all') labels.push(`Department: ${dept}`);
  if (s !== 'all' && s !== 'Overdue') labels.push(`Status: ${s}`);
  if (p !== 'all') labels.push(`Priority: ${p}`);
  if (q) labels.push(`Search: ${q}`);

  $('#filterTitle').textContent = labels.length ? labels.join(' · ') : 'All grievances';
  $('#resultCount').textContent = `${f.length} record${f.length === 1 ? '' : 's'}`;
  bindRows();
}

['#searchInput', '#sourceFilter', '#categoryFilter', '#subcategoryFilter', '#departmentFilter', '#statusFilter', '#priorityFilter'].forEach(id => {
  const el = $(id);
  if (el) {
    el.oninput = renderAll;
    el.onchange = renderAll;
  }
});

function drill({ status = 'all', category = 'all', source = 'all', department = 'all', subcategory = 'all', search = '', priority = 'all' }) {
  overdueOnly = (status === 'Overdue' || status === 'overdue');
  if ($('#statusFilter')) $('#statusFilter').value = status;
  if ($('#priorityFilter')) $('#priorityFilter').value = priority;
  if ($('#categoryFilter')) {
    $('#categoryFilter').value = category;
    populateSubcategories('categoryFilter', 'subcategoryFilter', subcategory);
  }
  if ($('#sourceFilter')) $('#sourceFilter').value = source;
  if ($('#departmentFilter')) $('#departmentFilter').value = department;
  if ($('#subcategoryFilter')) $('#subcategoryFilter').value = subcategory;
  if ($('#searchInput')) $('#searchInput').value = search;
  showPage('grievances');
}

$$('[data-drill-priority]').forEach(el => el.onclick = () => drill({ priority: el.dataset.drillPriority }));
$$('[data-drill-status]').forEach(el => {
  const go = () => drill({ status: el.dataset.drillStatus });
  el.onclick = go;
  el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
});
$$('[data-drill-category]').forEach(el => el.onclick = () => drill({ category: el.dataset.drillCategory }));
$$('[data-drill-source]').forEach(el => el.onclick = () => drill({ source: el.dataset.drillSource }));
$$('[data-drill-department]').forEach(el => el.onclick = () => drill({ department: el.dataset.drillDepartment }));
$$('[data-drill-search]').forEach(el => el.onclick = () => drill({ search: el.dataset.drillSearch }));
if ($('#clearFilters')) $('#clearFilters').onclick = () => drill({});

if ($('#overdueCard')) $('#overdueCard').onclick = (e) => {
  if (e.target.closest('#sendOfficeRemindersBtn')) return;
  drill({ status: 'Overdue' });
};

function openRemindersDialog(e) {
  if (e) e.stopPropagation();
  const overdueCases = cases.filter(isOverdue);
  if (!overdueCases.length) {
    notify('No overdue grievances currently requiring reminders.');
    return;
  }
  const listEl = $('#remindersList');
  const bannerText = $('#remindersBannerText');
  if (bannerText) {
    bannerText.textContent = `Found ${overdueCases.length} overdue grievance record${overdueCases.length === 1 ? '' : 's'} requiring follow-up action.`;
  }
  if (listEl) {
    listEl.innerHTML = overdueCases.map(c => {
      const dept = c.assigned === 'Unassigned' ? 'Unassigned Department' : (c.assigned || 'Unassigned');
      const email = c.recipientEmail || defaultDepartmentEmails[c.assigned] || 'No email on record';
      return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:#fff5f6;border:1px solid #fecdd3;border-radius:8px;font-size:12px">
        <div>
          <strong style="color:#9f1239">${esc(c.ref)}</strong> — ${esc(c.subject.slice(0, 45))}${c.subject.length > 45 ? '…' : ''}<br>
          <small style="color:#666">Department: ${esc(dept)} (${esc(email)})</small>
        </div>
        <span class="badge awaiting-review" style="background:#ffe4e6;color:#e11d48;font-size:10px">Overdue</span>
      </div>`;
    }).join('');
  }
  $('#remindersDialog').showModal();
}

const sendOfficeRemindersBtn = $('#sendOfficeRemindersBtn');
if (sendOfficeRemindersBtn) {
  sendOfficeRemindersBtn.onclick = (e) => {
    if (e) e.stopPropagation();
    openRemindersDialog(e);
  };
}

if ($('#closeRemindersDialog')) $('#closeRemindersDialog').onclick = () => $('#remindersDialog').close();
if ($('#cancelReminders')) $('#cancelReminders').onclick = () => $('#remindersDialog').close();

const remindersForm = $('#remindersForm');
if (remindersForm) {
  remindersForm.onsubmit = async event => {
    event.preventDefault();
    const overdueCases = cases.filter(isOverdue);
    const submitBtn = $('#sendAllRemindersSubmitBtn');
    const note = $('#remindersNote').value.trim();

    if (!overdueCases.length) {
      notify('No overdue cases to remind.');
      $('#remindersDialog').close();
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Dispatching Reminders…';
    }

    let sentCount = 0;
    let failCount = 0;

    for (let i = 0; i < overdueCases.length; i++) {
      const c = overdueCases[i];
      const dept = c.assigned === 'Unassigned' ? '' : (c.assigned || '');
      const email = c.recipientEmail || defaultDepartmentEmails[dept] || '';

      if (submitBtn) submitBtn.textContent = `Sending ${i + 1} of ${overdueCases.length}…`;

      try {
        if (c.id && email) {
          const response = await fetch(`${API_ROOT}/grievances/${c.id}/send-email`, {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ recipientEmail: email, departmentName: dept, note, reminder: true })
          });
          if (response.ok) sentCount++;
          else failCount++;
        } else {
          sentCount++;
        }
      } catch (err) {
        failCount++;
      }
    }

    if (typeof loadDatabaseGrievances === 'function') {
      await loadDatabaseGrievances();
    } else {
      save();
    }

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '✉ Dispatch All Reminders Now';
    }
    $('#remindersDialog').close();
    notify(`✉ Office reminders processed (${sentCount} dispatched${failCount ? `, ${failCount} skipped` : ''})`);
  };
}

function card(c) {
  return `<article class="case-card" data-ref="${esc(c.ref)}">
    <span class="ref">${esc(c.ref)}</span>
    <h4>${esc(c.subject)}</h4>
    <p><strong>${esc(c.assigned)}</strong></p>
    <footer><span>${esc(c.category)} - ${esc(c.subcategory || '')}</span><span>${esc(c.due)}</span></footer>
  </article>`;
}

function renderKanban() {
  const take = s => cases.filter(c => c.status === s).slice(0, 6).map(card).join('');
  $('#assignCards').innerHTML = take('Awaiting Review');
  $('#forwardCards').innerHTML = take('Forwarded');
  $('#responseCards').innerHTML = take('Resolved');
  bindRows();
}

const defaultDepartmentEmails = {
  "Minister's Office": 'minister@mwca.gov.lk, sec.minister@mwca.gov.lk',
  'Secretary Office': 'secretary@mwca.gov.lk, addlsec@mwca.gov.lk',
  'Financial': 'finance@mwca.gov.lk, accounts@mwca.gov.lk',
  'Development Branch': 'development@mwca.gov.lk',
  'Planning Division': 'planning@mwca.gov.lk',
  'Child Secretariat Office': 'childsecretariat@mwca.gov.lk, info@childsecretariat.gov.lk',
  "Women's Bureau": 'info@womensbureau.gov.lk, director@womensbureau.gov.lk',
  'National Commission On Women': 'ncw@womenaffairs.gov.lk',
  'National Child Protection Authority': 'info@childprotection.gov.lk, ncpa.help@childprotection.gov.lk',
  'Department of Probation and Child Care Service': 'probation@childcare.gov.lk, info@childcare.gov.lk',

  'අමාත්‍ය කාර්යාලය': 'minister@mwca.gov.lk, sec.minister@mwca.gov.lk',
  'අමාත්‍ය කාර්යාලය (Minister\'s Office)': 'minister@mwca.gov.lk, sec.minister@mwca.gov.lk',
  'ලේකම් කාර්යාලය': 'secretary@mwca.gov.lk, addlsec@mwca.gov.lk',
  'ලේකම් කාර්යාලය (Secretary Office)': 'secretary@mwca.gov.lk, addlsec@mwca.gov.lk',
  'මුදල් අංශය': 'finance@mwca.gov.lk, accounts@mwca.gov.lk',
  'මුදල් අංශය (Financial)': 'finance@mwca.gov.lk, accounts@mwca.gov.lk',
  'සංවර්ධන අංශය': 'development@mwca.gov.lk',
  'සංවර්ධන අංශය (Development Branch)': 'development@mwca.gov.lk',
  'ක්‍රමසම්පාදන අංශය': 'planning@mwca.gov.lk',
  'ක්‍රමසම්පාදන අංශය (Planning Division)': 'planning@mwca.gov.lk',
  'ළමා ලේකම් කාර්යාලය': 'childsecretariat@mwca.gov.lk, info@childsecretariat.gov.lk',
  'ළමා ලේකම් කාර්යාලය (Child Secretariat Office)': 'childsecretariat@mwca.gov.lk, info@childsecretariat.gov.lk',
  'කාන්තා කාර්යාංශය': 'info@womensbureau.gov.lk, director@womensbureau.gov.lk',
  'කාන්තා කාර්යාංශය (Women\'s Bureau)': 'info@womensbureau.gov.lk, director@womensbureau.gov.lk',
  'කාන්තාවන් පිළිබඳ ජාතික කොමිෂන් සභාව': 'ncw@womenaffairs.gov.lk',
  'කාන්තාවන් පිළිබඳ ජාතික කොමිෂන් සභාව (National Commission On Women)': 'ncw@womenaffairs.gov.lk',
  'ජාතික ළමා ආරක්ෂක අධිකාරිය': 'info@childprotection.gov.lk, ncpa.help@childprotection.gov.lk',
  'ජාතික ළමා ආරක්ෂක අධිකාරිය (National Child Protection Authority)': 'info@childprotection.gov.lk, ncpa.help@childprotection.gov.lk',
  'පරිවාස හා ළමාරක්ෂක සේවා දෙපාර්තමේන්තුව': 'probation@childcare.gov.lk, info@childcare.gov.lk',
  'පරිවාස හා ළමාරක්ෂක සේවා දෙපාර්තමේන්තුව (Department of Probation and Child Care Service)': 'probation@childcare.gov.lk, info@childcare.gov.lk'
};

let currentUploadedAttachments = [];
let attachmentReadPromise = Promise.resolve();

// Dynamic department email autofill helper supporting multiple recipient emails
function getDepartmentDefaultEmails(deptName) {
  if (!deptName) return '';
  const trimmed = deptName.trim();
  if (defaultDepartmentEmails[trimmed]) return defaultDepartmentEmails[trimmed];
  for (const [key, email] of Object.entries(defaultDepartmentEmails)) {
    if (trimmed.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(trimmed.toLowerCase())) {
      return email;
    }
  }
  return '';
}

function bindDepartmentEmailAutofill(deptSelectId, emailInputId) {
  const deptEl = $(`#${deptSelectId}`);
  const emailEl = $(`#${emailInputId}`);
  if (!deptEl || !emailEl) return;

  const update = () => {
    const selectedDept = deptEl.value.trim();
    const defaultEmail = getDepartmentDefaultEmails(selectedDept);
    if (defaultEmail) {
      const currentVal = emailEl.value.trim();
      if (!currentVal) {
        emailEl.value = defaultEmail;
      } else {
        const existingEmails = currentVal.split(/[;,\n]/).map(e => e.trim()).filter(Boolean);
        const newEmails = defaultEmail.split(/[;,\n]/).map(e => e.trim()).filter(Boolean);
        newEmails.forEach(e => {
          if (!existingEmails.includes(e)) {
            existingEmails.push(e);
          }
        });
        emailEl.value = existingEmails.join(', ');
      }
    }
  };

  deptEl.addEventListener('change', update);
  deptEl.addEventListener('input', update);
}

function attachQuickEmailPills(emailInputId, containerId) {
  const emailInput = $(`#${emailInputId}`);
  const container = $(`#${containerId}`);
  if (!emailInput || !container) return;

  const quickDepts = [
    { label: "Minister", email: 'minister@mwca.gov.lk' },
    { label: "Secretary", email: 'secretary@mwca.gov.lk' },
    { label: "NCPA", email: 'info@childprotection.gov.lk' },
    { label: "Women's Bureau", email: 'info@womensbureau.gov.lk' },
    { label: "Probation & Child Care", email: 'probation@childcare.gov.lk' },
    { label: "Financial", email: 'finance@mwca.gov.lk' }
  ];

  container.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:6px;align-items:center;">
      <span style="font-size:10px;font-weight:700;color:#64748b;letter-spacing:0.4px">ADD RECIPIENTS:</span>
      ${quickDepts.map(d => `
        <button type="button" class="quick-email-pill" data-email="${d.email}" style="font-size:11px;padding:3px 8px;background:#f0f4ff;color:#2563eb;border:1px solid #bfdbfe;border-radius:12px;cursor:pointer;font-weight:600" title="Click to add ${d.email}">+ ${d.label}</button>
      `).join('')}
    </div>
  `;

  container.querySelectorAll('.quick-email-pill').forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      const emailToAdd = btn.dataset.email;
      const currentVal = emailInput.value.trim();
      if (!currentVal) {
        emailInput.value = emailToAdd;
      } else {
        const existingEmails = currentVal.split(/[;,\n]/).map(x => x.trim()).filter(Boolean);
        if (!existingEmails.includes(emailToAdd)) {
          existingEmails.push(emailToAdd);
        }
        emailInput.value = existingEmails.join(', ');
      }
    };
  });
}

bindDepartmentEmailAutofill('regDepartment', 'regRecipientEmail');
bindDepartmentEmailAutofill('dialogAssignee', 'dialogRecipientEmail');
bindDepartmentEmailAutofill('emailTargetDept', 'emailTargetAddr');
bindDepartmentEmailAutofill('deptSummaryTargetDept', 'deptSummaryRecipientEmails');

attachQuickEmailPills('regRecipientEmail', 'regQuickEmailContainer');
attachQuickEmailPills('dialogRecipientEmail', 'dialogQuickContainer');
attachQuickEmailPills('emailTargetAddr', 'emailQuickContainer');
attachQuickEmailPills('deptSummaryRecipientEmails', 'deptSummaryQuickContainer');

function renderRegistrationAttachments() {
  const noticeEl = $('#attachmentFileNotice');
  if (!noticeEl) return;
  if (!currentUploadedAttachments || !currentUploadedAttachments.length) {
    noticeEl.innerHTML = '';
    return;
  }

  noticeEl.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">
      ${currentUploadedAttachments.map((att, idx) => {
        const isImg = att.contentType?.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(att.name);
        const icon = isImg ? '🖼️' : (att.name?.endsWith('.pdf') ? '📕' : '📄');
        return `
          <div style="display:inline-flex;align-items:center;gap:8px;padding:6px 12px;background:#f0f4ff;border:1px solid #c7d2fe;border-radius:8px;font-size:0.83rem;color:#1e1b4b;">
            <span>${icon} <strong>${esc(att.name)}</strong> <small style="color:#64748b">(${esc(att.size || 'N/A')})</small></span>
            <button type="button" class="remove-reg-att-btn" data-idx="${idx}" style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;border-radius:4px;padding:2px 6px;font-size:0.75rem;font-weight:bold;cursor:pointer;line-height:1;" title="Remove attachment">✕ Remove</button>
          </div>
        `;
      }).join('')}
    </div>
  `;

  $$('.remove-reg-att-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      const idx = Number(btn.dataset.idx);
      if (Number.isFinite(idx) && idx >= 0 && idx < currentUploadedAttachments.length) {
        currentUploadedAttachments.splice(idx, 1);
        if (!currentUploadedAttachments.length && $('#regAttachmentFile')) {
          $('#regAttachmentFile').value = '';
        }
        renderRegistrationAttachments();
      }
    };
  });
}

// File attachment listener for registration form
const regAttachmentFileEl = $('#regAttachmentFile');
if (regAttachmentFileEl) {
  regAttachmentFileEl.addEventListener('change', event => {
    const files = event.target.files;
    if (files && files.length > 0) {
      attachmentReadPromise = Promise.all([...files].map(selectedFile => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
          const exists = currentUploadedAttachments.some(a => a.name === selectedFile.name && a.size === `${(selectedFile.size / 1024).toFixed(1)} KB`);
          if (!exists) {
            currentUploadedAttachments.push({
              name: selectedFile.name,
              size: `${(selectedFile.size / 1024).toFixed(1)} KB`,
              contentType: selectedFile.type || 'application/octet-stream',
              dataUrl: e.target.result
            });
          }
          resolve();
        };
        reader.onerror = () => reject(new Error(`Could not read ${selectedFile.name}.`));
        reader.readAsDataURL(selectedFile);
      }))).then(() => {
        renderRegistrationAttachments();
      });
    }
  });
}

// Target deadline selection change listener
if ($('#regDeadlineDays')) {
  $('#regDeadlineDays').onchange = (e) => {
    const isCustom = e.target.value === 'custom';
    if ($('#customDueDateLabel')) $('#customDueDateLabel').style.display = isCustom ? 'block' : 'none';
    if (isCustom && $('#regDueDate') && !$('#regDueDate').value) {
      const rec = $('#regDate')?.value ? new Date($('#regDate').value) : new Date();
      rec.setDate(rec.getDate() + 7);
      $('#regDueDate').value = rec.toISOString().slice(0, 10);
    }
  };
}

if ($('#regDate') && !$('#regDate').value) {
  $('#regDate').value = new Date().toISOString().slice(0, 10);
}

function openCase(ref) {
  selected = cases.find(c => c.ref === ref);
  if (!selected) return;
  $('#dialogRef').textContent = selected.ref;
  $('#dialogStatus').value = selected.status;
  $('#dialogPriority').value = selected.priority || 'Normal';
  $('#dialogAssignee').value = selected.assigned === 'Unassigned' ? '' : selected.assigned || '';
  if ($('#sendReminderBtn')) $('#sendReminderBtn').hidden = !isOverdue(selected);

  if ($('#dialogDueDate')) {
    if (selected.dueAt) {
      try {
        const d = new Date(selected.dueAt);
        if (!isNaN(d.getTime())) {
          $('#dialogDueDate').value = d.toISOString().slice(0, 10);
        }
      } catch (e) {
        $('#dialogDueDate').value = '';
      }
    } else {
      $('#dialogDueDate').value = '';
    }
  }

  const defaultEmail = selected.recipientEmail || defaultDepartmentEmails[selected.assigned] || '';
  if ($('#dialogRecipientEmail')) $('#dialogRecipientEmail').value = defaultEmail;

  const storedAttachments = selected.attachments?.length ? selected.attachments : (selected.attachmentName ? [{ name: selected.attachmentName, dataUrl: selected.attachmentUrl, size: selected.attachmentSize }] : []);
  selected.attachments = [...storedAttachments];

  function renderDialogAttachments() {
    const container = $('#dialogAttachmentList');
    if (!container) return;
    if (!selected.attachments || !selected.attachments.length) {
      container.innerHTML = '<em style="color:#888;font-size:0.85rem">No documents attached to this case</em>';
      return;
    }

    container.innerHTML = selected.attachments.map((att, idx) => {
      const isImg = att.contentType?.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(att.name);
      const icon = isImg ? '🖼️' : (att.name?.endsWith('.pdf') ? '📕' : '📄');
      const isAdmin = currentUser?.role === 'ADMIN';
      const removeBtnHtml = isAdmin ? `<button type="button" class="remove-case-att-btn" data-idx="${idx}" style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;border-radius:4px;padding:2px 8px;font-size:0.75rem;font-weight:bold;cursor:pointer" title="Remove file from case">✕ Remove</button>` : '';
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:6px;font-size:0.85rem">
          <div style="display:flex;align-items:center;gap:6px">
            <span>${icon}</span>
            <a href="${esc(att.dataUrl || '#')}" download="${esc(att.name)}" target="_blank" style="color:#2563eb;text-decoration:underline;font-weight:600">${esc(att.name)}</a>
            <small style="color:#64748b">(${esc(att.size || 'N/A')})</small>
          </div>
          ${removeBtnHtml}
        </div>
      `;
    }).join('');

    container.querySelectorAll('.remove-case-att-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const idx = Number(btn.dataset.idx);
        if (Number.isFinite(idx) && idx >= 0 && idx < selected.attachments.length) {
          selected.attachments.splice(idx, 1);
          renderDialogAttachments();
        }
      };
    });
  }

  const emailInfoHtml = selected.recipientEmail ? `<div><span>Recipient Email</span><strong>✉ ${esc(selected.recipientEmail)}</strong></div>` : `<div><span>Recipient Email</span><em style="color:#888">Not set</em></div>`;
  const addressInfoHtml = selected.address ? `<div><span>Address</span><strong>${esc(selected.address)}</strong></div>` : '';
  const districtInfoHtml = selected.district ? `<div><span>District</span><strong>${esc(selected.district)}</strong></div>` : '';

  const dueBadge = isOverdue(selected)
    ? `<span class="badge awaiting-review" style="background:#ffe4e6;color:#e11d48;font-size:10px;margin-left:6px;padding:2px 6px">OVERDUE</span>`
    : `<span class="badge" style="background:#e0f2fe;color:#0369a1;font-size:10px;margin-left:6px;padding:2px 6px">On Track</span>`;
  const dueInfoHtml = `<div><span>Target Resolution Deadline</span><strong>${esc(selected.due || 'Not set')} ${dueBadge}</strong></div>`;

  const isAdmin = currentUser?.role === 'ADMIN';
  const attachControlHtml = isAdmin ? `
        <label style="color:#2563eb;font-size:0.83rem;cursor:pointer;font-weight:600;display:inline-flex;align-items:center;gap:4px">
          ＋ Attach / Re-upload File
          <input type="file" id="dialogAddAttachmentFile" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" multiple style="display:none" />
        </label>` : '';

  $('#dialogContent').innerHTML = `<div class="dialog-info">
    <div><span>Complainant</span><strong>${esc(selected.name)}</strong></div>
    ${addressInfoHtml}
    ${districtInfoHtml}
    <div><span>Inflow Source</span><strong>${esc(selected.source)}</strong></div>
    <div><span>Main Category</span><strong>${esc(selected.category)}</strong></div>
    <div><span>Subcategory</span><strong>${esc(selected.subcategory || 'Not specified')}</strong></div>
    <div><span>Assigned Department</span><strong>${esc(selected.assigned || 'Unassigned')}</strong></div>
    ${emailInfoHtml}
    <div><span>Current Priority</span><strong>${priorityBadge(selected.priority)}</strong></div>
    ${dueInfoHtml}
    <div class="wide"><span>Subject</span><strong>${esc(selected.subject)}</strong></div>
    <div class="wide"><span>Case Summary & Details</span><strong>${esc(selected.description)}</strong></div>
    <div class="wide" style="grid-column: span 2;background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0;margin-top:6px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <strong style="color:#1e1b4b;font-size:0.88rem">📎 Attached Documents / Letters</strong>
        ${attachControlHtml}
      </div>
      <div id="dialogAttachmentList"></div>
    </div>
  </div>`;

  renderDialogAttachments();

  const dialogAddAttFile = $('#dialogAddAttachmentFile');
  if (dialogAddAttFile) {
    dialogAddAttFile.onchange = (e) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        Promise.all([...files].map(selectedFile => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = ev => {
            const exists = selected.attachments.some(a => a.name === selectedFile.name);
            if (!exists) {
              selected.attachments.push({
                name: selectedFile.name,
                size: `${(selectedFile.size / 1024).toFixed(1)} KB`,
                contentType: selectedFile.type || 'application/octet-stream',
                dataUrl: ev.target.result
              });
            }
            resolve();
          };
          reader.onerror = () => reject(new Error(`Could not read ${selectedFile.name}.`));
          reader.readAsDataURL(selectedFile);
        }))).then(() => {
          renderDialogAttachments();
        });
      }
    };
  }

  if (currentUser) setUser(currentUser);
  $('#caseDialog').showModal();
}

$('#closeDialog').onclick = () => $('#caseDialog').close();

// Email Referral Action Button
const sendEmailBtn = $('#sendEmailBtn');
if (sendEmailBtn) {
  sendEmailBtn.onclick = () => {
    if (!selected) return;
    emailReminderMode = false;
    const targetDept = $('#dialogAssignee').value || selected.assigned || 'Assigned Department';
    const targetEmail = $('#dialogRecipientEmail').value || selected.recipientEmail || defaultDepartmentEmails[targetDept] || '';

    if (!targetEmail) {
      notify('Please enter a recipient department email address first.');
      return;
    }

    $('#emailTargetDept').value = targetDept;
    $('#emailTargetAddr').value = targetEmail;
    $('#emailSubject').value = `[MWCA Grievance Referral] ${selected.ref} – ${selected.subcategory || selected.subject}`;
    $('#emailNote').value = `Please assess and process official MWCA grievance ${selected.ref} regarding ${selected.subject}.`;

    const attachNotice = $('#emailAttachmentNotice');
    if (attachNotice) {
      const attachmentNames = selected.attachments?.length ? selected.attachments.map(attachment => attachment.name) : (selected.attachmentName ? [selected.attachmentName] : []);
      attachNotice.innerHTML = attachmentNames.length ? `📎 Documents Included: <strong>${attachmentNames.map(esc).join(', ')}</strong>` : '📎 No documents attached to this grievance';
    }

    $('#emailDialog').showModal();
  };
}

if ($('#sendReminderBtn')) $('#sendReminderBtn').onclick = () => {
  if (!selected || !isOverdue(selected)) return;
  emailReminderMode = true;
  const targetDept = $('#dialogAssignee').value || selected.assigned || '';
  const targetEmail = $('#dialogRecipientEmail').value || selected.recipientEmail || defaultDepartmentEmails[targetDept] || '';
  if (!targetDept || !targetEmail) {
    notify('Select the responsible office and enter its email before sending a reminder.');
    return;
  }
  $('#emailTargetDept').value = targetDept;
  $('#emailTargetAddr').value = targetEmail;
  $('#emailSubject').value = `[MWCA Overdue Reminder] ${selected.ref} – ${selected.subcategory || selected.subject}`;
  $('#emailNote').value = `Reminder: grievance ${selected.ref} is overdue. Please provide an action update to MWCA.`;
  $('#emailDialog').showModal();
};

if ($('#closeEmailDialog')) $('#closeEmailDialog').onclick = () => $('#emailDialog').close();
if ($('#cancelEmail')) $('#cancelEmail').onclick = () => $('#emailDialog').close();

const emailForm = $('#emailForm');
if (emailForm) {
  emailForm.onsubmit = async event => {
    event.preventDefault();
    const targetDept = $('#emailTargetDept').value.trim();
    const targetEmail = $('#emailTargetAddr').value.trim();
    const note = $('#emailNote').value.trim();
    const submitBtn = $('#dispatchEmailSubmitBtn');

    if (!targetDept) {
      notify('Select or enter the destination department before sending.');
      return;
    }
    if (!emailForm.reportValidity()) return;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending Email…';
    }

    try {
      if (selected && selected.id) {
        const response = await fetch(`${API_ROOT}/grievances/${selected.id}/send-email`, {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ recipientEmail: targetEmail, departmentName: targetDept, note, reminder: emailReminderMode })
        });
        const contentType = response.headers.get('content-type') || '';
        const result = contentType.includes('application/json') ? await response.json() : { message: 'Server returned a non-JSON response.' };
        if (!response.ok) throw new Error(result.message || 'Email dispatch failed.');
        await loadDatabaseGrievances();

        if (result.isTestAccount) {
          notify(`✉ Email referral sent to ${targetDept} (${targetEmail}) [Test Mode]`);
        } else {
          notify(`✉ ${result.message || 'Referral email successfully dispatched'}`);
        }
      } else if (selected) {
        selected.status = 'Forwarded';
        selected.assigned = targetDept;
        selected.recipientEmail = targetEmail;
        save();
        renderAll();
        renderKanban();
        notify(`✉ Referral recorded for ${targetDept}`);
      }
      $('#emailDialog').close();
      $('#caseDialog').close();
      emailReminderMode = false;
    } catch (err) {
      notify(`Email dispatch error: ${err.message}`);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Dispatch Email Now';
      }
    }
  };
}

// --- Department Grievance Summary Email Dispatch ---
function updateDeptSummaryGrievanceList() {
  const targetDept = $('#deptSummaryTargetDept')?.value.trim() || '';
  const listEl = $('#deptSummaryGrievanceList');
  const countBadge = $('#deptSummaryCountBadge');
  const attachNotice = $('#deptSummaryAttachmentNotice');
  if (!listEl) return;

  const deptCases = targetDept 
    ? cases.filter(c => String(c.assigned || '').trim().toLowerCase() === targetDept.toLowerCase())
    : cases;

  if (countBadge) {
    countBadge.textContent = `${deptCases.length} Case${deptCases.length === 1 ? '' : 's'} ${targetDept ? 'Assigned' : 'Total'}`;
  }

  if (!deptCases.length) {
    listEl.innerHTML = `<div style="padding:12px;text-align:center;color:#666;font-size:0.85rem;background:#fff;border-radius:6px;border:1px dashed #cbd5e1">
      No grievances currently assigned to "${esc(targetDept || 'selected department')}".
    </div>`;
    if (attachNotice) attachNotice.innerHTML = '📎 0 attached documents ready for dispatch';
    return;
  }

  listEl.innerHTML = deptCases.map(c => {
    const attCount = (c.attachments?.length || 0) + (c.attachmentName ? 1 : 0);
    const priorityColor = c.priority === 'Critical' ? '#dc2626' : (c.priority === 'High' ? '#ea580c' : '#2563eb');
    return `
      <label style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:#ffffff;border:1px solid #e2e8f0;border-radius:6px;font-size:0.83rem;cursor:pointer">
        <div style="display:flex;align-items:center;gap:10px">
          <input type="checkbox" class="dept-summary-case-cb" data-id="${c.id}" checked style="width:16px;height:16px;accent-color:#6758d8" />
          <div>
            <strong style="color:#1e1b4b">${esc(c.ref)}</strong> — ${esc(c.name)} 
            <span style="font-size:11px;color:#64748b">(${esc(c.category)})</span><br>
            <span style="font-size:11px;color:#475569">${esc(c.subject.slice(0, 50))}${c.subject.length > 50 ? '…' : ''}</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:10px;padding:2px 6px;border-radius:10px;font-weight:600;color:${priorityColor};background:#f1f5f9">${esc(c.priority || 'Normal')}</span>
          ${attCount > 0 ? `<span style="font-size:10px;background:#e0e7ff;color:#3730a3;padding:2px 6px;border-radius:4px;font-weight:600">📎 ${attCount}</span>` : ''}
        </div>
      </label>
    `;
  }).join('');

  const updateNotice = () => {
    const checkedCbs = $$('.dept-summary-case-cb:checked');
    const selectedIds = new Set(Array.from(checkedCbs).map(cb => Number(cb.dataset.id)));
    let selDocs = 0;
    cases.forEach(c => {
      if (selectedIds.has(c.id)) {
        selDocs += (c.attachments?.length || 0) + (c.attachmentName ? 1 : 0);
      }
    });
    if (attachNotice) {
      attachNotice.innerHTML = `📎 Dispatch Payload: <strong>1 Summary CSV Report</strong> + <strong>${selDocs} Supporting Document File${selDocs === 1 ? '' : 's'}</strong>`;
    }
    if (countBadge) {
      countBadge.textContent = `${checkedCbs.length} of ${deptCases.length} Selected`;
    }
  };

  $$('.dept-summary-case-cb').forEach(cb => cb.addEventListener('change', updateNotice));
  updateNotice();
}

async function openDeptSummaryDialog(deptName = '') {
  const selectedDept = deptName || ($('#departmentFilter')?.value !== 'all' ? $('#departmentFilter')?.value : '') || (cases.find(c => c.assigned && c.assigned !== 'Unassigned')?.assigned) || 'National Child Protection Authority';
  const targetDeptInput = $('#deptSummaryTargetDept');
  const recipientEmailInput = $('#deptSummaryRecipientEmails');

  if (targetDeptInput) targetDeptInput.value = selectedDept;
  if (recipientEmailInput) {
    recipientEmailInput.value = defaultDepartmentEmails[selectedDept] || '';
  }

  const noticeEl = $('#deptSummarySmtpNotice');
  try {
    const res = await fetch(`${API_ROOT}/grievances/smtp`, { headers: authHeaders() });
    if (res.ok) {
      const smtpInfo = await res.json();
      if (noticeEl) {
        if (smtpInfo.isConfigured) {
          noticeEl.style.background = '#eef0f8';
          noticeEl.style.borderLeftColor = '#6758d8';
          noticeEl.innerHTML = `<strong>Email Dispatch Engine</strong><p>Configured with sender: <strong>${esc(smtpInfo.user)}</strong>. Ready to dispatch department summary.</p>`;
          if ($('#deptSummarySimulate')) $('#deptSummarySimulate').checked = false;
        } else {
          noticeEl.style.background = '#fff7ed';
          noticeEl.style.borderLeftColor = '#ea580c';
          noticeEl.innerHTML = `<strong>⚠️ SMTP Not Configured</strong><p>Click <button type="button" class="text-btn" id="openSmtpFromNoticeBtn" style="color:#c2410c;text-decoration:underline;font-weight:600">⚙ Email Settings</button> to enter your sender email and Google App Password, or check "Simulate email dispatch" for test mode.</p>`;
          if ($('#openSmtpFromNoticeBtn')) {
            $('#openSmtpFromNoticeBtn').onclick = () => {
              $('#deptSummaryDialog').close();
              $('#smtpDialog').showModal();
            };
          }
          if ($('#deptSummarySimulate')) $('#deptSummarySimulate').checked = true;
        }
      }
    }
  } catch (err) {
    // Ignore SMTP check error
  }

  updateDeptSummaryGrievanceList();
  $('#deptSummaryDialog').showModal();
}

const openDeptSummaryBtn = $('#openDeptSummaryBtn');
if (openDeptSummaryBtn) {
  openDeptSummaryBtn.onclick = () => openDeptSummaryDialog();
}

if ($('#closeDeptSummaryDialog')) $('#closeDeptSummaryDialog').onclick = () => $('#deptSummaryDialog').close();
if ($('#cancelDeptSummary')) $('#cancelDeptSummary').onclick = () => $('#deptSummaryDialog').close();
if ($('#openSmtpFromDeptSummaryBtn')) $('#openSmtpFromDeptSummaryBtn').onclick = () => {
  $('#deptSummaryDialog').close();
  $('#smtpDialog').showModal();
};

const deptTargetInputEl = $('#deptSummaryTargetDept');
if (deptTargetInputEl) {
  const handleDeptChange = () => {
    const dept = deptTargetInputEl.value.trim();
    const emailEl = $('#deptSummaryRecipientEmails');
    if (emailEl && defaultDepartmentEmails[dept]) {
      emailEl.value = defaultDepartmentEmails[dept];
    }
    updateDeptSummaryGrievanceList();
  };
  deptTargetInputEl.addEventListener('change', handleDeptChange);
  deptTargetInputEl.addEventListener('input', handleDeptChange);
}

const deptSummaryForm = $('#deptSummaryForm');
if (deptSummaryForm) {
  deptSummaryForm.onsubmit = async event => {
    event.preventDefault();
    const targetDept = $('#deptSummaryTargetDept').value.trim();
    const recipientEmails = $('#deptSummaryRecipientEmails').value.trim();
    const note = $('#deptSummaryNote').value.trim();
    const attachDocs = $('#deptSummaryAttachDocs').checked;
    const simulate = $('#deptSummarySimulate')?.checked || false;
    const submitBtn = $('#dispatchDeptSummarySubmitBtn');

    if (!targetDept) {
      notify('Please select or enter a target department.');
      return;
    }
    if (!recipientEmails) {
      notify('Please enter recipient email address(es).');
      return;
    }

    const checkedCbs = Array.from($$('.dept-summary-case-cb:checked'));
    const grievanceIds = checkedCbs.map(cb => Number(cb.dataset.id)).filter(id => Number.isFinite(id) && id > 0);

    if (!grievanceIds.length) {
      notify('Please select at least one grievance record to include in the summary.');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Dispatching Department Summary…';
    }

    try {
      const response = await fetch(`${API_ROOT}/grievances/send-department-summary`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          departmentName: targetDept,
          recipientEmails,
          note,
          grievanceIds,
          attachDocuments: attachDocs,
          simulate
        })
      });

      const contentType = response.headers.get('content-type') || '';
      const result = contentType.includes('application/json') ? await response.json() : { message: 'Server returned a non-JSON response.' };

      if (!response.ok) throw new Error(result.message || 'Failed to send department summary email.');

      if (typeof loadDatabaseGrievances === 'function') {
        await loadDatabaseGrievances();
      }

      notify(`✉ ${result.message || 'Department summary email update dispatched successfully!'}`);
      $('#deptSummaryDialog').close();

    } catch (err) {
      notify(`Summary dispatch error: ${err.message}`);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '✉ Dispatch Department Summary Email';
      }
    }
  };
}

function animateCounter(el, target) {
  if (!el) return;
  const targetVal = Number(target) || 0;
  const startVal = parseInt(el.textContent, 10);
  if (isNaN(startVal) || startVal === targetVal) {
    el.textContent = targetVal;
    return;
  }
  const duration = 350;
  const startTime = performance.now();
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(startVal + (targetVal - startVal) * easeProgress);
    el.textContent = current;
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      el.textContent = targetVal;
    }
  }
  requestAnimationFrame(update);
}

function save() {
  localStorage.setItem('wcaCases', JSON.stringify(cases));
  if ($('#navCount')) $('#navCount').textContent = cases.length;
  animateCounter($('#totalStat'), cases.length);
  animateCounter($('#awaitingStat'), cases.filter(c => c.status === 'Awaiting Review').length);
  animateCounter($('#forwardedStat'), cases.filter(c => c.status === 'Forwarded' || c.status === 'Assigned').length);
  animateCounter($('#resolvedStat'), cases.filter(c => c.status === 'Resolved').length);
  if ($('#overdueStat')) animateCounter($('#overdueStat'), cases.filter(isOverdue).length);
  if ($('#donutTotal')) animateCounter($('#donutTotal'), cases.length);

  const total = cases.length || 1;
  const womenCount = cases.filter(c => c.category === 'Women').length;
  const childCount = cases.filter(c => c.category === 'Child').length;
  const otherCount = cases.filter(c => c.category === 'General / Other').length;

  if ($('#catPctWomen')) $('#catPctWomen').textContent = `${Math.round((womenCount / total) * 100)}%`;
  if ($('#catPctChild')) $('#catPctChild').textContent = `${Math.round((childCount / total) * 100)}%`;
  if ($('#catPctOther')) $('#catPctOther').textContent = `${Math.round((otherCount / total) * 100)}%`;

  const presCount = cases.filter(c => c.source === 'Presidential Secretariat').length;
  const pmoCount = cases.filter(c => c.source === "Prime Minister's Office").length;
  const pubCount = cases.filter(c => c.source === 'Public Persons').length;
  const adminCount = cases.filter(c => c.source === 'Admin Unit').length;

  if ($('#srcPctPres')) $('#srcPctPres').textContent = `${Math.round((presCount / total) * 100)}%`;
  if ($('#srcPctPMO')) $('#srcPctPMO').textContent = `${Math.round((pmoCount / total) * 100)}%`;
  if ($('#srcPctPublic')) $('#srcPctPublic').textContent = `${Math.round((pubCount / total) * 100)}%`;
    if ($('#srcPctAdmin')) $('#srcPctAdmin').textContent = `${Math.round((adminCount / total) * 100)}%`;
    updateActivityChart();
  renderReports();
    if (localStorage.getItem('wcaLanguage') === 'si') applyLanguage('si');
}

function parseCaseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string' && value.includes('/')) {
    const parts = value.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function updateActivityChart() {
  const chart = $('#chart');
  const monthsEl = document.querySelector('.months');
  if (!chart || !monthsEl) return;

  const now = new Date(2026, 8, 1); // Sept 2026 anchor
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    return {
      date,
      label: date.toLocaleDateString('en-US', { month: 'short' }),
      received: 0,
      resolved: 0
    };
  });

  for (const grievance of cases) {
    const receivedDate = parseCaseDate(grievance.receivedAt || grievance.received_at || grievance.received);
    const resolvedDate = parseCaseDate(grievance.resolvedAt || grievance.closed_at || grievance.closedAt);
    for (const month of months) {
      if (receivedDate && receivedDate.getFullYear() === month.date.getFullYear() && receivedDate.getMonth() === month.date.getMonth()) {
        month.received += 1;
      }
      if (resolvedDate && resolvedDate.getFullYear() === month.date.getFullYear() && resolvedDate.getMonth() === month.date.getMonth()) {
        month.resolved += 1;
      }
    }
  }

  const maximum = Math.max(1, ...months.flatMap(month => [month.received, month.resolved]));
  chart.innerHTML = months.map(month => {
    const recPct = month.received > 0 ? Math.max(8, Math.round((month.received / maximum) * 100)) : 0;
    const resPct = month.resolved > 0 ? Math.max(8, Math.round((month.resolved / maximum) * 100)) : 0;
    return `<div class="bar-pair" title="${month.label} 2026: ${month.received} Received, ${month.resolved} Resolved">
      <i class="bar purple" style="height:${recPct}%" data-val="${month.received}"></i>
      <i class="bar teal" style="height:${resPct}%" data-val="${month.resolved}"></i>
    </div>`;
  }).join('');
  monthsEl.innerHTML = months.map(month => `<span>${month.label}</span>`).join('');
}

function notify(t) {
  const e = $('#toast');
  e.textContent = t;
  e.classList.add('show');
  setTimeout(() => e.classList.remove('show'), 2600);
}

function renderReports() {
  const page = $('#reportsPage');
  if (!page) return;

  const sourceNames = ['Presidential Secretariat', "Prime Minister's Office", 'Public Persons'];
  const statuses = ['Awaiting Review', 'Assigned', 'Forwarded', 'Resolved', 'Closed'];
  const sourceCounts = sourceNames.map(source => ({ label: source, count: cases.filter(grievance => grievance.source === source).length }));
  const statusCounts = statuses.map(status => ({ label: status, count: cases.filter(grievance => grievance.status === status).length })).filter(item => item.count > 0);
  const maxSource = Math.max(1, ...sourceCounts.map(item => item.count));
  const maxStatus = Math.max(1, ...statusCounts.map(item => item.count));

  page.innerHTML = `<div class="report-banner"><div><span class="eyebrow">MANAGEMENT REPORTING</span><h2>Grievance intake and case status</h2><p>Live operational data from the MWCA grievance register.</p></div><div><button class="secondary" data-drill-status="all">View all grievances</button> <button class="secondary" id="printBtn">Print report</button></div></div><div class="reports-live-grid"><article class="panel report-chart-panel"><div class="panel-head"><div><h3>Grievances received by office</h3><p>Source offices sending cases to MWCA</p></div><strong class="report-total">${cases.length} total</strong></div><div class="report-bars">${sourceCounts.map(item => `<button class="report-bar" data-drill-source="${esc(item.label)}"><span><b>${esc(item.label)}</b><strong>${item.count}</strong></span><i><em style="width:${(item.count / maxSource) * 100}%"></em></i></button>`).join('')}</div></article><article class="panel report-chart-panel"><div class="panel-head"><div><h3>Current case status</h3><p>Live distribution of registered grievances</p></div><strong class="report-total">${cases.length} total</strong></div><div class="report-bars">${statusCounts.length ? statusCounts.map(item => `<button class="report-bar status-bar" data-drill-status="${esc(item.label)}"><span><b>${esc(item.label)}</b><strong>${item.count}</strong></span><i><em style="width:${(item.count / maxStatus) * 100}%"></em></i></button>`).join('') : '<div class="report-empty">No grievance records have been registered yet.</div>'}</div></article></div>`;
  $('#printBtn').onclick = () => window.print();
  page.querySelectorAll('[data-drill-source]').forEach(el => el.onclick = () => drill({ source: el.dataset.drillSource }));
  page.querySelectorAll('[data-drill-status]').forEach(el => el.onclick = () => drill({ status: el.dataset.drillStatus }));
}

$('#exportBtn').onclick = () => {
  const cols = ['File No', 'Date', 'Status', 'Category', 'Heading Of the Letter', 'Sent by', 'Forwarded to', 'The Action taken by the relevant Division and the Date'];
  const rows = filteredCases();
  const csv = [cols, ...rows.map(c => [c.ref, c.received, c.status, `${c.category} / ${c.subcategory || ''}`, c.subject, c.name, c.assigned || 'Unassigned', `${c.actionTaken || 'Pending review'} - ${c.actionDate || 'Not recorded'}`])].map(r => r.map(v => '"' + String(v ?? '').replaceAll('"', '""') + '"').join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'MWCA-Grievances-Report.csv';
  a.click();
  URL.revokeObjectURL(a.href);
  notify(`${rows.length} records exported`);
};

$('#printBtn').onclick = () => window.print();
$('#newReferral').onclick = () => {
  drill({ status: 'Awaiting Review' });
  notify('Select a case to assign to an MWCA department');
};

renderRecent();
renderAll();
renderKanban();
renderReports();
save();
applyLanguage();
updateHeaderDateTime();

