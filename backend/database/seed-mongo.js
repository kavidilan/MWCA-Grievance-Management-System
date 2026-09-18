const { initMongoDB, isMongoConnected, GrievanceModel, mongoUri } = require('./mongodb');
const mongoose = require('mongoose');

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

const defaultDepartmentEmails = {
  'National Child Protection Authority': 'info@childprotection.gov.lk',
  'National Committee on Women': 'ncw@womenaffairs.gov.lk',
  "Women's Bureau of Sri Lanka": 'info@womensbureau.gov.lk',
  'National Secretariat for Early Childhood Development': 'nsecd@womenaffairs.gov.lk',
  'Department of Probation and Child Care Services': 'probation@childcare.gov.lk'
};

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
  const connected = await initMongoDB();
  if (!connected) {
    console.error('❌ Could not connect to MongoDB. Please ensure MongoDB service or MongoDB Compass is running.');
    process.exit(1);
  }

  const existingCount = await GrievanceModel.countDocuments();
  if (existingCount > 0) {
    console.log(`✅ MongoDB collection 'grievances' already contains ${existingCount} documents.`);
    await mongoose.disconnect();
    return;
  }

  const docs = [];
  for (let i = 1; i <= 249; i++) {
    const [category, subcategory] = categoriesWithSub[i % categoriesWithSub.length];
    const status = statuses[i % statuses.length];
    const source = sources[i % sources.length];
    const dept = status === 'Awaiting Review' ? null : departments[i % departments.length];
    const priority = priorities[i % priorities.length];
    const ref = `MWCA/GMS/2026/${String(i).padStart(6, '0')}`;
    const email = dept ? defaultDepartmentEmails[dept] : null;

    docs.push({
      referenceNumber: ref,
      complainantName: `Complainant ${i}`,
      telephone: `07${(i % 9) + 1}${String(i).padStart(7, '0')}`.slice(0, 10),
      district: ['Colombo', 'Gampaha', 'Kandy', 'Galle', 'Jaffna', 'Kurunegala'][i % 6],
      source,
      intakeMethod: 'System Intake',
      category,
      subcategory,
      subject: `${category} - ${subcategory} Grievance #${i}`,
      description: `Official MWCA grievance record submitted via ${source} concerning ${subcategory.toLowerCase()}.`,
      priority,
      confidentiality: 'Standard',
      status,
      assignedDivision: dept,
      recipientEmail: email,
      createdAt: new Date(Date.now() - (i * 3600 * 24 * 1000)),
      updatedAt: new Date()
    });
  }

  await GrievanceModel.insertMany(docs);
  console.log(`🎉 Successfully seeded 249 grievances into MongoDB database '${mongoUri}'!`);
  console.log(`🔍 Open MongoDB Compass and connect to: ${mongoUri}`);
  await mongoose.disconnect();
})().catch(err => {
  console.error('❌ MongoDB seed error:', err);
  process.exit(1);
});
