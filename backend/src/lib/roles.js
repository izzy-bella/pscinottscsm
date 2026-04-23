export const ROLE_GROUPS = {
  admins: ['SUPER_ADMIN', 'ADMIN'],
  pastoralEditors: ['SUPER_ADMIN', 'ADMIN', 'PASTOR'],
  peopleEditors: ['SUPER_ADMIN', 'ADMIN', 'PASTOR', 'MINISTRY_LEADER'],
  attendanceEditors: ['SUPER_ADMIN', 'ADMIN', 'PASTOR', 'MINISTRY_LEADER', 'VOLUNTEER'],
  attendanceAdmins: ['SUPER_ADMIN', 'ADMIN', 'PASTOR'],
  shepherds: ['SUPER_ADMIN', 'ADMIN', 'PASTOR', 'MINISTRY_LEADER'],
  readers: ['SUPER_ADMIN', 'ADMIN', 'PASTOR', 'FINANCE', 'MINISTRY_LEADER', 'VOLUNTEER', 'VIEWER']
};
