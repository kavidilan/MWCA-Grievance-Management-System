const mongoose = require('mongoose');

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mwca_grievances';
let isConnected = false;

const GrievanceSchema = new mongoose.Schema({
  referenceNumber: { type: String, required: true, unique: true, index: true },
  complainantName: { type: String, required: true },
  nic: String,
  telephone: String,
  email: String,
  address: String,
  district: String,
  source: { type: String, required: true },
  intakeMethod: String,
  category: { type: String, required: true },
  subcategory: { type: String, required: true },
  subject: { type: String, required: true },
  description: { type: String, required: true },
  priority: { type: String, default: 'Normal' },
  confidentiality: { type: String, default: 'Standard' },
  status: { type: String, default: 'Awaiting Review', index: true },
  assignedDivision: String,
  recipientEmail: String,
  attachmentName: String,
  attachmentUrl: String,
  attachmentSize: String,
  createdBy: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  closedAt: Date
});

const UserSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: 'OFFICER' },
  division: String,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const CaseActionSchema = new mongoose.Schema({
  grievanceReference: String,
  actionType: { type: String, required: true },
  previousStatus: String,
  newStatus: String,
  note: String,
  performedBy: String,
  createdAt: { type: Date, default: Date.now }
});

const GrievanceModel = mongoose.model('Grievance', GrievanceSchema);
const UserModel = mongoose.model('User', UserSchema);
const CaseActionModel = mongoose.model('CaseAction', CaseActionSchema);

async function initMongoDB() {
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    isConnected = true;
    console.log(`🍃 Connected to MongoDB Database: ${mongoUri}`);
    return true;
  } catch (err) {
    isConnected = false;
    console.log(`⚠️ MongoDB connection unavailable (${err.message}).`);
    return false;
  }
}

function isMongoConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

async function seedMongoGrievancesIfEmpty() {
  try {
    const count = await GrievanceModel.countDocuments();
    if (count > 0) return;
    
    const sources = ['Presidential Secretariat', "Prime Minister's Office", 'Public Persons', 'Admin Unit'];
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
      'National Child Protection Authority': '',
      'Department of Probation and Child Care Service': ''
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
    console.log('🎉 Seeded 249 demonstration grievances into MongoDB collection.');
  } catch (err) {
    console.error('⚠️ MongoDB seed warning:', err.message);
  }
}

module.exports = {
  initMongoDB,
  isMongoConnected,
  seedMongoGrievancesIfEmpty,
  mongoUri,
  GrievanceModel,
  UserModel,
  CaseActionModel
};
