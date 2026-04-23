const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? '/api' : 'http://localhost:4000/api');
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');
let authToken = '';

export function setApiToken(token) {
  authToken = token || '';
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Request failed');
  }

  return response.json();
}

export const api = {
  baseUrl: API_BASE,
  setToken: setApiToken,
  assetUrl: (filePath) => {
    if (!filePath) return '';
    if (/^https?:\/\//.test(filePath)) return filePath;
    return `${API_ORIGIN}${filePath}`;
  },
  login: (payload) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  requestPasswordReset: (payload) =>
    request('/auth/request-password-reset', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  resetPasswordWithToken: (payload) =>
    request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  me: () => request('/auth/me'),
  changePassword: (payload) =>
    request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  users: () => request('/auth/users'),
  registerUser: (payload) =>
    request('/auth/users', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  updateUser: (id, payload) =>
    request(`/auth/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),
  health: () => request('/health'),
  dashboard: () => request('/reports/dashboard'),
  members: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/members${query ? `?${query}` : ''}`);
  },
  leaders: () => request('/members/leaders'),
  assignableLeaders: () => request('/members/assignable-leaders'),
  myMembers: () => request('/members/my-members'),
  member: (id) => request(`/members/${id}`),
  createMember: (payload) =>
    request('/members', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  assignMemberToMe: (id) =>
    request(`/members/${id}/assign-to-me`, {
      method: 'POST'
    }),
  assignMemberToLeader: (id, payload) =>
    request(`/members/${id}/assigned-leader`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),
  visitors: () => request('/members/visitors'),
  registerVisitor: (payload) =>
    request('/members/visitors', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  updateVisitorFollowUp: (id, payload) =>
    request(`/members/visitors/${id}/follow-up`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),
  updateMember: (id, payload) =>
    request(`/members/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),
  uploadProfileImage: (id, payload) =>
    request(`/members/${id}/profile-image`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  uploadMemberDocument: (id, payload) =>
    request(`/members/${id}/documents`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  addMemberNote: (id, payload) =>
    request(`/members/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  households: () => request('/households'),
  attendanceSessions: () => request('/attendance/sessions'),
  attendanceSession: (id) => request(`/attendance/sessions/${id}`),
  createAttendanceSession: (payload) =>
    request('/attendance/sessions', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  resetAttendance: () =>
    request('/attendance/reset', {
      method: 'POST'
    }),
  markAttendance: (sessionId, payload) =>
    request(`/attendance/sessions/${sessionId}/records`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  memberAttendanceHistory: (memberId) => request(`/attendance/member/${memberId}`)
};
