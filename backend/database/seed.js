const { initializeDatabase, get, run, db } = require('./database');

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

const categoriesWithSub = [
  ['Women', 'Abuse / Domestic Violence'],
  ['Women', 'Financial Assistance'],
  ['Women', 'Maintenance & Family Disputes'],
  ['Women', 'Legal Aid & Rights'],
  ['Women', 'Employment & Workplace Harassment'],
  ['Women', 'Cyber Harassment'],
  ['Child', 'Child Abuse & Exploitation'],
  ['Child', 'Financial & Educational Support'],
  ['Child', 'Early Childhood Development & Pre-School'],
  ['Child', 'Probation & Custody Services'],
  ['Child', 'Child Protection & Safety'],
  ['General / Other', 'General Inquiry'],
  ['General / Other', 'Administrative Complaint']
];

const statuses = ['Awaiting Review', 'Assigned', 'Forwarded', 'Resolved'];
const priorities = ['Normal', 'High', 'Critical'];

(async () => {
  await initializeDatabase();
  const current = await get('SELECT COUNT(*) total FROM grievances');
  if (current.total) { 
    console.log(`Database already contains ${current.total} grievances.`); 
    db.close(); 
    return; 
  }
  for (let i = 1; i <= 249; i++) {
    const [category, subcategory] = categoriesWithSub[i % categoriesWithSub.length];
    const status = statuses[i % statuses.length];
    const source = sources[i % sources.length];
    const dept = status === 'Awaiting Review' ? null : departments[i % departments.length];
    const priority = priorities[i % priorities.length];
    const ref = `MWCA/GMS/2026/${String(i).padStart(6, '0')}`;
    
    await run(
      `INSERT INTO grievances (reference_number, complainant_name, source, intake_method, category, subcategory, subject, description, priority, confidentiality, status, assigned_division) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ref,
        `Complainant ${i}`,
        source,
        'System Intake',
        category,
        subcategory,
        `${category} - ${subcategory} Grievance #${i}`,
        `Official MWCA grievance record submitted via ${source} concerning ${subcategory.toLowerCase()}.`,
        priority,
        'Standard',
        status,
        dept
      ]
    );
  }
  console.log('Created 249 demonstration grievances with updated MWCA sources, subcategories, and departments.');
  db.close();
})().catch(error => { 
  console.error(error); 
  db.close(); 
  process.exit(1); 
});

