// @ts-nocheck
/**
 * Compatibility shim — base44Client now delegates to icpClient
 * All pages that import from here continue to work unchanged.
 */
import { auth, candidate, documents, concierge, chat, flights, tokenStorage } from './icpClient';

// Safe API_BASE configuration - handles Vite's import.meta.env safely
const API_BASE = (() => {
  try {
    // Check if we're in a Vite environment with import.meta
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) {
      return import.meta.env.VITE_API_BASE_URL;
    }
  } catch (e) {
    // Fall through to default
  }
  return 'https://deploy-3or5.onrender.com';
})();

// Build a base44-shaped object so existing import patterns work
export const base44 = {
  auth: {
    me: async () => {
      const session = await auth.sessionInfo();
      const email = localStorage.getItem('icp_user_email') || '';
      const name  = localStorage.getItem('icp_user_name')  || email.split('@')[0];
      if (session.success && session.isActive) return { email, full_name: name };
      throw Object.assign(new Error('Not authenticated'), { status: 401 });
    },
    /** @param {string} email @param {string} password */
    loginViaEmailPassword: async (email, password) => {
      const res = await auth.loginWithPassword(email, password);
      if (res.success && res.token) {
        tokenStorage.set(res.token);
        localStorage.setItem('icp_user_email', email);
        localStorage.setItem('icp_user_name', res.user?.name || email.split('@')[0]);
      }
      return res;
    },
    loginWithProvider: () => { window.location.href = '/login'; },
    /** @param {string} [redirect] */
    logout: (redirect) => {
      auth.logout();
      window.location.href = redirect || '/login';
    },
    /** @param {string} from */
    redirectToLogin: (from) => { window.location.href = '/login'; },
    /** @param {{ email: string, password: string }} param0 */
    register: async ({ email, password }) => {
      // ICP flow: check email → verify OTP → setup password
      const res = await auth.checkEmail(email);
      return res;
    },
    /** @param {{ email: string, otpCode: string }} param0 */
    verifyOtp: async ({ email, otpCode }) => {
      const res = await auth.verifyOTP(email, otpCode, true);
      if (res.token) {
        tokenStorage.set(res.token);
        localStorage.setItem('icp_user_email', email);
      }
      return { access_token: res.token };
    },
    /** @param {string} email */
    resendOtp: (email) => auth.resendOTP(email),
    /** @param {string} email */
    resetPasswordRequest: (email) => auth.forgotPassword(email),
    /** @param {{ newPassword: string }} param0 */
    resetPassword: async ({ newPassword }) => {
      // Handled via full reset flow in ResetPassword page
    },
    /** @param {string} token */
    setToken: (token) => tokenStorage.set(token),
    isLoggedIn: () => auth.isLoggedIn(),
  },

  // Entity-like wrapper around ICP candidate data
  // Since ICP stores everything in Zoho, we map it here
  entities: {
    CandidateProfile: {
      /** @param {{ email: string }} param0 */
      filter: async ({ email }) => {
        try {
          // Fetch CRM data from Zoho Deals
          const res = await candidate.getMyDeals();
          if (!res.success || !res.data) return [];
          const d = res.data;
          
          // Fetch Recruit data for current_employer
          let currentEmployer = "";
          try {
            const token = localStorage.getItem("icp_auth_token");
            if (token) {
              const recruitResponse = await fetch(`${API_BASE}/api/recruit/current-employer`, {
                headers: { 
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              const recruitData = await recruitResponse.json();
              if (recruitData.success && recruitData.current_employer) {
                currentEmployer = recruitData.current_employer;
              }
            }
          } catch (err) {
            console.error("Error fetching Recruit data:", err);
          }
          
          return [{
            id: d.id || 'profile-1',
            email: d.email || email,
            full_name: d.candidateName || '',
            preferred_name: d.prefferedName || '',
            first_name: d.firstName || '',
            last_name: d.lastName || '',
            phone: d.phone || '',
            date_of_birth: d.dateOfBirth || '',
            specialty: d.professionalSpecialty || '',
            status: d.applicationStatus || '',
            hospital_name: d.hospitalName || '',
            destination_city: d.entryport || '',
            destination_state: '',
            us_address: d.usaddress || '',
            deployment_date: d.scheduledarrivaldate || '',
            stage: d.applicationStatus || '',
            order_number: d.orderNumber || '',
            concierge_name: d.conciergeName || '',
            concierge_phone: d.conciergePhone || '',
            concierge_email: d.conciergeEmail || '',
            flight_departure: d.scheduleddeparturedate || '',
            flight_arrival: d.scheduledarrivaldate || '',
            departure_city: d.departcity || '',
            entry_port: d.entryport || '',
            primary_airline: d.primaryairline || '',
            flight_numbers: [d.fligtnumber1, d.fligtnumber2, d.fligtnumber3, d.fligtnumber4].filter(f => f && f !== '—').join(', '),
            confirmation_numbers: d.confirmationnumbers || '',
            hotel_booked: d.hotel_booked || '',
            welcome_packet_sent: d.welcome_packet_emailed || '',
            flight_booked: d.Flight_Booked_Emailed || '',
            final_arrival: d.final_destination_arrival || '',
            layover1: d.layover1location || '',
            layover2: d.layover2location || '',
            layover3: d.layover3location || '',
            flight_tracker: d.primaryairlinetrack || '',
            // Document attachment IDs
            flight_confirmation_id: d.flightConfirmationAttachmentId || '',
            welcome_appointments_id: d.welcomeAppointmentsAttachmentId || '',
            education_id: d.educationAttachmentId || '',
            concierge_bio_id: d.conciergeBiographyAttachmentId || '',
            deal_id: d.id || '',
            // NEW FIELD FROM RECRUIT
            current_employer: currentEmployer,
          }];
        } catch { return []; }
      },
      /** @param {string} id @param {any} data */
      update: async (id, data) => data,
      /** @param {any} data */
      create: async (data) => data,
    },

    CandidateUpdate: {
      /** @param {{ candidate_email: string }} param0 */
      filter: async ({ candidate_email }) => {
        // ICP backend does not have a standalone updates feed; return empty
        return [];
      },
      /** @param {string} id @param {any} data */
      update: async (id, data) => data,
    },

    CandidateDocument: {
      /** @param {{ candidate_email: string }} param0 */
      filter: async ({ candidate_email }) => {
        // Return documents from the ICP candidate profile
        try {
          const res = await candidate.getMyDeals();
          if (!res.success || !res.data) return [];
          const d = res.data;
          const docs = [];
          if (d.flightConfirmationAttachmentId) docs.push({ id: d.flightConfirmationAttachmentId, document_name: 'Flight Confirmation', document_type: 'Travel', status: 'Approved', uploaded_by: 'ICP', candidate_email, file_url: `/api/documents/${d.flightConfirmationAttachmentId}`, attachment_id: d.flightConfirmationAttachmentId, deal_id: d.id });
          if (d.welcomeAppointmentsAttachmentId) docs.push({ id: d.welcomeAppointmentsAttachmentId, document_name: 'Welcome Appointments', document_type: 'Orientation', status: 'Approved', uploaded_by: 'ICP', candidate_email, file_url: `/api/documents/${d.welcomeAppointmentsAttachmentId}`, attachment_id: d.welcomeAppointmentsAttachmentId, deal_id: d.id });
          if (d.educationAttachmentId) docs.push({ id: d.educationAttachmentId, document_name: 'Education Records', document_type: 'Credentials', status: 'Approved', uploaded_by: 'ICP', candidate_email, file_url: `/api/documents/${d.educationAttachmentId}`, attachment_id: d.educationAttachmentId, deal_id: d.id });
          if (d.conciergeBiographyAttachmentId) docs.push({ id: d.conciergeBiographyAttachmentId, document_name: 'Concierge Biography', document_type: 'Concierge', status: 'Approved', uploaded_by: 'ICP', candidate_email, file_url: `/api/documents/${d.conciergeBiographyAttachmentId}`, attachment_id: d.conciergeBiographyAttachmentId, deal_id: d.id });
          return docs;
        } catch { return []; }
      },
      /** @param {any} data */
      create: async (data) => data,
    },

    ItineraryItem: {
      /** @param {{ candidate_email: string }} param0 */
      filter: async ({ candidate_email }) => {
        // Build itinerary from ICP flight data
        try {
          const res = await candidate.getMyDeals();
          if (!res.success || !res.data) return [];
          const d = res.data;
          const items = [];
          let order = 1;
          if (d.scheduleddeparturedate && d.scheduleddeparturedate !== '—') items.push({ id: `dep-${order}`, sort_order: order++, candidate_email, title: 'Departure', description: `Depart from ${d.departcity || 'your city'} — Flight ${d.fligtnumber1 || ''}`, category: 'Travel', scheduled_date: d.scheduleddeparturedate, is_completed: false });
          if (d.layover1location && d.layover1location !== '—') items.push({ id: `lay1-${order}`, sort_order: order++, candidate_email, title: 'Layover 1', description: `Layover in ${d.layover1location}`, category: 'Travel', is_completed: false });
          if (d.layover2location && d.layover2location !== '—') items.push({ id: `lay2-${order}`, sort_order: order++, candidate_email, title: 'Layover 2', description: `Layover in ${d.layover2location}`, category: 'Travel', is_completed: false });
          if (d.scheduledarrivaldate && d.scheduledarrivaldate !== '—') items.push({ id: `arr-${order}`, sort_order: order++, candidate_email, title: 'Arrival at Port of Entry', description: `Arrive in ${d.entryport || 'USA'} — Flight ${d.fligtnumber2 || d.fligtnumber1 || ''}`, category: 'Travel', scheduled_date: d.scheduledarrivaldate, is_completed: false });
          if (d.welcomeAppointments && d.welcomeAppointments !== '—') items.push({ id: `welcome-${order}`, sort_order: order++, candidate_email, title: 'Welcome Appointments', description: d.welcomeAppointments, category: 'Orientation', is_completed: false });
          if (d.hospitalName && d.hospitalName !== '—') items.push({ id: `hosp-${order}`, sort_order: order++, candidate_email, title: 'Hospital Orientation', description: `Report to ${d.hospitalName}`, category: 'Orientation', is_completed: false });
          return items;
        } catch { return []; }
      },
    },

    CandidatePipeline: {
      /** @param {{ candidate_email: string }} param0 */
      filter: async ({ candidate_email }) => {
        // Build pipeline from application status
        try {
          const res = await candidate.getMyDeals();
          if (!res.success || !res.data) return [];
          const d = res.data;
          const status = (d.applicationStatus || '').toLowerCase();
          // Map ICP statuses to pipeline stages
          const stages = [
            { id: 'p1', stage_name: 'Application Submitted', stage_category: 'Hiring', stage_order: 1, status: 'Completed', candidate_email },
            { id: 'p2', stage_name: 'Initial Screening', stage_category: 'Hiring', stage_order: 2, status: 'Completed', candidate_email },
            { id: 'p3', stage_name: 'Clinical Interview', stage_category: 'Hiring', stage_order: 3, status: status.includes('interview') ? 'In Progress' : 'Completed', candidate_email, scheduled_date: d.interviewDate !== '—' ? d.interviewDate : null },
            { id: 'p4', stage_name: 'Offer Letter Signed', stage_category: 'Hiring', stage_order: 4, status: 'Completed', candidate_email },
            { id: 'p5', stage_name: 'Credential Evaluation', stage_category: 'Immigration', stage_order: 5, status: 'Completed', candidate_email },
            { id: 'p6', stage_name: 'Visa Petition Filed', stage_category: 'Immigration', stage_order: 6, status: 'Completed', candidate_email },
            { id: 'p7', stage_name: 'Visa Approved', stage_category: 'Immigration', stage_order: 7, status: 'Completed', candidate_email },
            { id: 'p8', stage_name: 'Flight Booked', stage_category: 'Deployment', stage_order: 8, status: d.Flight_Booked_Emailed && d.Flight_Booked_Emailed !== '—' ? 'Completed' : 'In Progress', candidate_email },
            { id: 'p9', stage_name: 'Housing Arranged', stage_category: 'Deployment', stage_order: 9, status: d.hotel_booked && d.hotel_booked !== '—' ? 'Completed' : 'In Progress', candidate_email },
            { id: 'p10', stage_name: 'Arrived in Destination', stage_category: 'Deployment', stage_order: 10, status: d.final_destination_arrival && d.final_destination_arrival !== '—' ? 'Completed' : 'Not Started', candidate_email },
            { id: 'p11', stage_name: 'Active Employment', stage_category: 'Deployment', stage_order: 11, status: 'Not Started', candidate_email },
          ];
          return stages;
        } catch { return []; }
      },
      /** @param {string} id @param {any} data */
      update: async (id, data) => ({ id, ...data }),
      /** @param {any} data */
      bulkCreate: async (data) => data,
    },

    AftercareSurvey: {
      /** @param {any} _param0 */
      filter: async (_param0) => [],
      /** @param {string} id @param {any} data */
      update: async (id, data) => data,
    },

    AftercareSurveyResponse: {
      /** @param {any} _param0 */
      filter: async (_param0) => [],
      /** @param {any} data */
      create: async (data) => data,
    },
  },

  integrations: {
    Core: {
      /** @param {{ prompt: string }} param0 */
      InvokeLLM: async ({ prompt }) => {
        // Fallback — no LLM integration; return empty structured response
        return {};
      },
      /** @param {{ file: File }} param0 */
      UploadFile: async ({ file }) => {
        // No file upload to ICP — return placeholder
        return { file_url: URL.createObjectURL(file) };
      },
    },
  },
};