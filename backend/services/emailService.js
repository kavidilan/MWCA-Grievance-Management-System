const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendGrievanceEmail = async ({
  recipient,
  grievance,
  attachmentPath,
  language = 'si',
}) => {

  const isSinhala = (language !== 'en');
  const subcatOrSubject = grievance.subcategory || grievance.subject || grievance.main_category || 'මහජන පැමිණිලි ,දුක්ගැනවිලි සහ ඉල්ලීම්';
  const refNo = grievance.reference_no || grievance.reference_number || 'N/A';
  const category = grievance.main_category || grievance.category || 'N/A';
  const subcategory = grievance.subcategory || 'General Inquiry';
  const priority = grievance.priority || 'Normal';
  const dateReceived = grievance.date_received || grievance.received_at || 'Not recorded';
  const referredTo = grievance.referred_to || grievance.assigned_division || 'Department';

  const titleText = isSinhala ? 'මහජන පැමිණිලි ,දුක්ගැනවිලි සහ ඉල්ලීම්' : 'Grievance Referral';
  const subjectText = grievance.subject || (isSinhala ? titleText : `Grievance Referral - ${refNo} – ${subcatOrSubject}`);

  const ministryName = isSinhala ? 'කාන්තා හා ළමා කටයුතු අමාත්‍යාංශය' : 'Ministry of Women and Child Affairs';
  const greetingText = isSinhala ? 'ගරු මහත්මයා/මහත්මියනි,' : 'Dear Sir/Madam,';
  const introText = isSinhala
    ? 'කාන්තා හා ළමා කටයුතු අමාත්‍යාංශය මගින් අවශ්‍ය සමාලෝචනය සහ ඉදිරි පියවර ගැනීම සඳහා පැමිණිල්ලක්/දුක්ගැනවිල්ලක් ඔබ කාර්යාලය වෙත යොමු කර ඇත.'
    : 'A grievance has been referred to your office by the Ministry of Women and Child Affairs for necessary review and action.';

  const detailsTitle = isSinhala ? 'පැමිණිලි විස්තර' : 'Grievance Details';
  const labelRef = isSinhala ? 'යොමු අංකය' : 'Reference No.';
  const labelCat = isSinhala ? 'ප්‍රධාන වර්ගීකරණය' : 'Category';
  const labelSubcat = isSinhala ? 'අනු වර්ගීකරණය' : 'Subcategory';
  const labelPriority = isSinhala ? 'ප්‍රමුඛතාව' : 'Priority';
  const labelDate = isSinhala ? 'ලැබුණු දිනය' : 'Date Received';
  const labelReferred = isSinhala ? 'යොමු කළ අංශය / දෙපාර්තමේන්තුව' : 'Referred To';

  const actionTitle = isSinhala ? 'අවශ්‍ය ඉදිරි පියවර' : 'Action Required';
  const actionText = isSinhala
    ? `කරුණාකර මෙම පැමිණිල්ල සහ අමුණා ඇති ලේඛන පරීක්ෂා කර අදාළ ක්‍රියාපටිපාටීන්ට අනුකූලව අවශ්‍ය ඉදිරි පියවර ගන්න. මෙම පැමිණිල්ලට අදාළ සියලුම ලිපිගොනු සඳහා යොමු අංකය <strong>${refNo}</strong> සඳහන් කිරීමට කාරුණික වන්න.`
    : `Kindly review the grievance and the attached documents and take the necessary action in accordance with the relevant procedures. Please quote reference number <strong>${refNo}</strong> in all correspondence related to this grievance.`;

  const thanksText = isSinhala ? 'ස්තුතියි,' : 'Thank you.';
  const footerSystem = isSinhala ? 'මහජන පැමිණිලි සහ දුක්ගැනවිලි කළමනාකරණ පද්ධතිය' : 'Grievance Management System';
  const footerDept = isSinhala ? 'පාලන අංශය' : 'Administration Division';
  const footerMinistry = isSinhala ? 'කාන්තා හා ළමා කටයුතු අමාත්‍යාංශය' : 'Ministry of Women and Child Affairs';

  const mailOptions = {
    from: `"MWCA Grievance Management System" <${process.env.EMAIL_USER}>`,
    to: recipient,
    subject: subjectText,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .card { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
    .header { background: #6758d8; color: #ffffff; padding: 24px 28px; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.2px; }
    .header p { margin: 4px 0 0; opacity: 0.9; font-size: 13px; }
    .body { padding: 28px; font-size: 14.5px; line-height: 1.6; color: #334155; }
    .details-table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 18px 0 22px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
    .details-table td { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; font-size: 13.5px; }
    .details-table tr:last-child td { border-bottom: none; }
    .label { width: 140px; font-weight: 600; color: #64748b; }
    .val { font-weight: 600; color: #0f172a; }
    .action { background: #eff6ff; border-left: 4px solid #2563eb; padding: 14px 16px; border-radius: 0 8px 8px 0; margin: 20px 0; }
    .action h4 { margin: 0 0 4px; color: #1e40af; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .action p { margin: 0; font-size: 13.5px; color: #1e3a8a; }
    .footer { padding: 20px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b; }
    .footer strong { color: #1e293b; display: block; margin-bottom: 2px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1><b>${titleText}</b></h1>
      <p>${ministryName}</p>
    </div>
    <div class="body">
      <p>${greetingText}</p>
      <p>${introText}</p>
      
      <h3 style="font-size:13.5px;font-weight:700;color:#1e1b4b;text-transform:uppercase;letter-spacing:0.5px;margin:22px 0 8px;">${detailsTitle}</h3>
      <table class="details-table">
        <tr><td class="label">${labelRef}</td><td class="val"><strong>${refNo}</strong></td></tr>
        <tr><td class="label">${labelCat}</td><td class="val">${isSinhala ? (category === 'Child' ? 'ළමා අංශය (Child)' : (category === 'Women' ? 'කාන්තා අංශය (Women)' : category)) : category}</td></tr>
        <tr><td class="label">${labelSubcat}</td><td class="val">${isSinhala ? (subcategory || 'සාමාන්‍ය විමසීම්') : subcategory}</td></tr>
        <tr><td class="label">${labelPriority}</td><td class="val">${isSinhala ? (priority === 'Critical' ? 'අතිශය හදිසි (Critical)' : (priority === 'High' ? 'ඉහළ ප්‍රමුඛතාව (High)' : (priority === 'Low' ? 'අඩු ප්‍රමුඛතාව (Low)' : 'සාමාන්‍ය (Normal)'))) : priority}</td></tr>
        <tr><td class="label">${labelDate}</td><td class="val">${dateReceived}</td></tr>
        <tr><td class="label">${labelReferred}</td><td class="val">${referredTo}</td></tr>
      </table>

      <div class="action">
        <h4>${actionTitle}</h4>
        <p>${actionText}</p>
      </div>

      <p style="margin-top:24px;margin-bottom:0;">${thanksText}</p>
    </div>
    <div class="footer">
      <strong>${footerSystem}</strong>
      <div>${footerDept}</div>
      <div>${footerMinistry}</div>
    </div>
  </div>
</body>
</html>
`,
    text: [
      'Dear Sir/Madam,',
      '',
      'A grievance has been referred to your office by the Ministry of Women and Child Affairs for necessary review and action.',
      '',
      'GRIEVANCE DETAILS',
      '',
      `Reference No. : ${refNo}`,
      `Category      : ${category}`,
      `Subcategory   : ${subcategory}`,
      `Priority      : ${priority}`,
      `Date Received : ${dateReceived}`,
      `Referred To   : ${referredTo}`,
      '',
      'ACTION REQUIRED',
      '',
      'Kindly review the grievance and the attached documents and take the necessary action in accordance with the relevant procedures.',
      '',
      `Please quote the reference number ${refNo} in all correspondence related to this grievance.`,
      '',
      'Thank you.',
      '',
      'Grievance Management System',
      'Administration Division',
      'Ministry of Women and Child Affairs'
    ].join('\n'),
    attachments: attachmentPath
      ? [
          {
            filename: attachmentPath.split(/[\\/]/).pop(),
            path: attachmentPath,
          },
        ]
      : [],
  };

  return await transporter.sendMail(mailOptions);
};

module.exports = {
  sendGrievanceEmail,
};