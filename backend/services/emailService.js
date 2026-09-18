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
}) => {

  const mailOptions = {
    from: `"MWCA Grievance Management System" <${process.env.EMAIL_USER}>`,

    to: recipient,

    subject: `Grievance Referral - ${grievance.reference_no}`,

    html: `
      <h2>Ministry of Women and Child Affairs</h2>
      <h3>Grievance Referral</h3>

      <p><strong>Reference No:</strong>
      ${grievance.reference_no}</p>

      <p><strong>Date Received:</strong>
      ${grievance.date_received}</p>

      <p><strong>Complainant:</strong>
      ${grievance.full_name}</p>

      <p><strong>Contact Number:</strong>
      ${grievance.contact_number || "N/A"}</p>

      <p><strong>Address:</strong>
      ${grievance.address || "N/A"}</p>

      <p><strong>District:</strong>
      ${grievance.district || "N/A"}</p>

      <p><strong>Main Category:</strong>
      ${grievance.main_category}</p>

      <p><strong>Subcategory:</strong>
      ${grievance.subcategory}</p>

      <p><strong>Priority:</strong>
      ${grievance.priority}</p>

      <p><strong>Grievance Summary:</strong></p>

      <p>${grievance.description}</p>

      <hr>

      <p>
        Please review the attached supporting documentation
        and take the necessary action.
      </p>

      <p>
        Regards,<br>
        Administration Division<br>
        Ministry of Women and Child Affairs
      </p>
    `,

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