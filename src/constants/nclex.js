// NCLEX Program configuration for admin panel
export const ADMIN_NCLEX_PROGRAM_FLOW = [
  // EXACT candidate My Pipeline NCLEX / ICP USRN subprocess order and rules.
  { stage_name: "Complete Pre-assessment", stage_category: "NCLEX Program", stage_order: 6.01, days: 5, field: "NCLEX_Pre_Exam", type: "picklist", accepted: ["1st Attempt Pass", "2nd Attempt Pass"] },
  { stage_name: "Program Prescreen", stage_category: "NCLEX Program", stage_order: 6.02, days: 10, field: "Prescreen_Status", type: "picklist", accepted: ["Attended"] },
  { stage_name: "Document Review", stage_category: "NCLEX Program", stage_order: 6.03, days: 24, field: "Documents_Submitted", type: "present" },
  { stage_name: "Educational Program Agreement", stage_category: "NCLEX Program", stage_order: 6.04, days: 24, field: "Sponsorship_Agreement", type: "boolean" },
  { stage_name: "Program Approval", stage_category: "NCLEX Program", stage_order: 6.05, days: 24, field: "Program_Status", type: "picklist", accepted: ["Approved"] },
  { stage_name: "Credential Evaluation Set-up", stage_category: "NCLEX Program", stage_order: 6.06, days: 27, field: "Credential_Service", type: "picklist", accepted: ["Paid by ICP", "Sponsored by ICP", "To be Sponsored by Infinity", "Paid by Infinity"] },
  { stage_name: "Credential Evaluation Completed", stage_category: "NCLEX Program", stage_order: 6.07, days: 92, field: "Credential_Registration_Date", type: "present" },
  { stage_name: "CES Report Issued", stage_category: "NCLEX Program", stage_order: 6.08, days: 102, field: "Date_Report_Issued", type: "present" },
  { stage_name: "Performance Check 1", stage_category: "NCLEX Program", stage_order: 6.09, days: 77, type: "performance", performanceGate: { assessmentsRequired: 2, assignmentsRequired: 6, ratingRequired: true } },
  { stage_name: "Board Registration", stage_category: "NCLEX Program", stage_order: 6.10, days: 120, field: "State_License_Board_of_Registration", type: "picklist", accepted: ["Paid by ICP", "Sponsored by ICP", "To be Sponsored by Infinity", "Paid by Infinity"] },
  { stage_name: "Select Meeting Time", stage_category: "NCLEX Program", stage_order: 6.11, days: 120, type: "booking", non_counted_section: true },
  { stage_name: "Performance Check 2", stage_category: "NCLEX Program", stage_order: 6.12, days: 102, type: "performance", performanceGate: { assessmentsRequired: 4, assignmentsRequired: 15, ratingRequired: true } },
  { stage_name: "Board Approval", stage_category: "NCLEX Program", stage_order: 6.13, days: 127, field: "Board_Username", type: "present" },
  { stage_name: "Pearson Vue Registration", stage_category: "NCLEX Program", stage_order: 6.14, days: 150, field: "Pearson_Vue_Status", type: "picklist", accepted: ["Complete"] },
  { stage_name: "Performance Check 3", stage_category: "NCLEX Program", stage_order: 6.15, days: 127, type: "performance", performanceGate: { assessmentsRequired: 5, assignmentsRequired: 0, ratingRequired: true } },
  { stage_name: "ATT Received", stage_category: "NCLEX Program", stage_order: 6.16, days: 150, field: "ATT_Received_Date", type: "present" },
  { stage_name: "Performance Check 4", stage_category: "NCLEX Program", stage_order: 6.17, days: 150, type: "performance", performanceGate: { assessmentsRequired: 6, assignmentsRequired: 0, ratingRequired: true } },
  { stage_name: "Exam Scheduled", stage_category: "NCLEX Program", stage_order: 6.18, days: 165, field: "NCLEX_Exam_Date", type: "present" },
  { stage_name: "Exam Results", stage_category: "NCLEX Program", stage_order: 6.19, days: 195, field: "NCLEX_Status", type: "picklist", accepted: ["Passed"] }
];
