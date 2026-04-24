import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from './api';
import {
  ArrowRight,
  AlertTriangle,
  BadgePlus,
  CalendarDays,
  CheckCircle2,
  Church,
  CircleDollarSign,
  FilePlus2,
  House,
  ImagePlus,
  Menu,
  Mail,
  MapPin,
  NotebookPen,
  Phone,
  RefreshCcw,
  Save,
  Search,
  Sparkles,
  TrendingUp,
  UserPlus,
  UserSearch,
  Users,
  UserRound
} from 'lucide-react';

const LOGO_SRC = '/psci-logo.png';

const initialForm = {
  fullName: '',
  externalMemberId: '',
  email: '',
  phoneNumber: '',
  dateOfBirth: '',
  gender: 'UNKNOWN',
  membershipStatus: 'ACTIVE',
  isLeader: false,
  fellowshipType: '',
  fellowshipName: '',
  leadershipRole: '',
  basontaCategory: '',
  addressFull: ''
};

const initialSessionForm = {
  title: '',
  serviceDate: '',
  category: 'SUNDAY_SERVICE',
  customCategory: '',
  notes: ''
};

const initialVisitorForm = {
  fullName: '',
  email: '',
  phoneNumber: '',
  addressFull: '',
  postcode: '',
  serviceDate: '',
  invitedBy: '',
  howHeard: '',
  notes: ''
};

const initialVisitorFollowUpForm = {
  visitorFollowUpStatus: 'NEW',
  visitorAssignedTo: '',
  visitorLastContactAt: '',
  visitorNextStep: '',
  visitorFollowUpNotes: ''
};

const initialLoginForm = {
  email: '',
  password: ''
};

const initialUserForm = {
  fullName: '',
  email: '',
  password: '',
  role: 'VIEWER',
  isActive: true
};

const initialPasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
};

const initialForgotPasswordForm = {
  email: ''
};

const initialTokenResetForm = {
  token: '',
  newPassword: '',
  confirmPassword: ''
};

const AUTH_TOKEN_KEY = 'church-cms-auth-token';

const roleDescriptions = {
  SUPER_ADMIN: 'Full system control, including all admin access and user management.',
  ADMIN: 'Administrative access to members, attendance, guests, and user setup.',
  PASTOR: 'Pastoral access for members, guests, and follow-up workflows.',
  FINANCE: 'Finance-focused access for trusted giving and reporting workflows.',
  MINISTRY_LEADER: 'Leadership access for assigned ministry and fellowship operations.',
  VOLUNTEER: 'Operational access for serving teams with limited management scope.',
  VIEWER: 'Read-only style access for staff who should not make major changes.'
};

const basontaCategories = [
  'Dancing Star',
  'Flames',
  'Choir',
  'Praise and Worship',
  'Instrumentalists',
  'Airport Star',
  'Usher'
];

const STATUS_CHART_COLORS = ['#f97316', '#0f172a', '#16a34a', '#dc2626', '#7c3aed', '#2563eb'];
const FUNNEL_CHART_COLORS = ['#f97316', '#fb923c', '#facc15', '#22c55e', '#0ea5e9', '#8b5cf6'];
const NAV_TABS = [
  ['home', 'Home'],
  ['dashboard', 'Dashboard']
];

function isAdminRole(role) {
  return ['SUPER_ADMIN', 'ADMIN'].includes(role);
}

function canManagePeople(role) {
  return ['SUPER_ADMIN', 'ADMIN', 'PASTOR', 'MINISTRY_LEADER'].includes(role);
}

function canManageAttendance(role) {
  return ['SUPER_ADMIN', 'ADMIN', 'PASTOR', 'MINISTRY_LEADER', 'VOLUNTEER'].includes(role);
}

function canResetAttendance(role) {
  return ['SUPER_ADMIN', 'ADMIN', 'PASTOR'].includes(role);
}

function canManageGuests(role) {
  return ['SUPER_ADMIN', 'ADMIN', 'PASTOR', 'MINISTRY_LEADER'].includes(role);
}

function canShepherdMembers(role) {
  return ['SUPER_ADMIN', 'ADMIN', 'PASTOR', 'MINISTRY_LEADER'].includes(role);
}

function SectionCard({ title, subtitle, children, action }) {
  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function StatCard({ label, value, icon: Icon, note, onClick }) {
  return (
    <button className={onClick ? 'stat-card stat-card-button' : 'stat-card'} onClick={onClick} type="button">
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {note ? <div className="stat-note">{note}</div> : null}
      </div>
      <div className="stat-icon">
        <Icon size={20} />
      </div>
    </button>
  );
}

function AuthScreen({
  form,
  onChange,
  onSubmit,
  error,
  busy
}) {
  return (
    <div className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand">
          <img className="auth-logo" src={LOGO_SRC} alt="Pleasant Surprise Church International logo" />
          <div>
            <div className="hero-badge">Pleasant Surprise Church International</div>
            <h1>Sign in to PSCI NOTTS CMS</h1>
            <p>Use an account created by an administrator to access church records and ministry tools.</p>
          </div>
        </div>
        {error ? <div className="alert error">{error}</div> : null}
        <form className="stack-gap" onSubmit={onSubmit}>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => onChange((current) => ({ ...current, email: event.target.value }))}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => onChange((current) => ({ ...current, password: event.target.value }))}
              required
            />
          </label>
          <button className="primary-btn" type="submit" disabled={busy}>
            Sign in
          </button>
        </form>
      </section>
    </div>
  );
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function formatAttendanceGap(days) {
  if (days === null || days === undefined) return 'No attendance recorded';
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function formatDateForInput(value) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

function formatCompactNumber(value) {
  if (value === null || value === undefined) return '--';
  return new Intl.NumberFormat(undefined, { notation: 'compact' }).format(value);
}

function formatSessionCategory(session) {
  if (!session) return '';
  if (session.category === 'OTHER' && session.customCategory) return session.customCategory;
  return (session.category || 'OTHER').replaceAll('_', ' ');
}

function memberInitials(name) {
  return (name || 'Member')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function MemberDrawer({
  member,
  onClose,
  onSave,
  onAssignLeader,
  onUploadPhoto,
  onUploadDocument,
  onAddNote,
  busy,
  assetUrl,
  canEdit,
  canAssignLeader,
  ministryLeaders
}) {
  const [formState, setFormState] = useState(initialForm);
  const [assignedLeaderUserId, setAssignedLeaderUserId] = useState('');
  const [docFile, setDocFile] = useState(null);
  const [docMeta, setDocMeta] = useState({ category: 'General', note: '' });
  const [noteState, setNoteState] = useState({ title: '', body: '' });

  useEffect(() => {
    if (!member) return;
    setFormState({
      fullName: member.fullName || '',
      externalMemberId: member.externalMemberId || '',
      email: member.email || '',
      phoneNumber: member.phoneNumber || '',
      dateOfBirth: formatDateForInput(member.dateOfBirth),
      gender: member.gender || 'UNKNOWN',
      membershipStatus: member.membershipStatus || 'ACTIVE',
      isLeader: Boolean(member.isLeader),
      fellowshipType: member.fellowshipType || '',
      fellowshipName: member.fellowshipName || '',
      leadershipRole: member.leadershipRole || '',
      basontaCategory: member.basontaCategory || '',
      addressFull: member.addressFull || member.household?.addressFull || '',
      contactPreference: member.contactPreference || '',
      joinDate: formatDateForInput(member.joinDate),
      notes: member.notes || '',
      postcode: member.postcode || member.household?.postcode || ''
    });
    setAssignedLeaderUserId(member.assignedLeader?.id || '');
    setDocFile(null);
    setDocMeta({ category: 'General', note: '' });
    setNoteState({ title: '', body: '' });
  }, [member]);

  if (!member) return null;

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    await onUploadPhoto(file);
    event.target.value = '';
  }

  async function handleDocumentSubmit(event) {
    event.preventDefault();
    if (!docFile) return;
    await onUploadDocument({
      file: docFile,
      category: docMeta.category,
      note: docMeta.note
    });
    setDocFile(null);
    setDocMeta({ category: 'General', note: '' });
  }

  async function handleNoteSubmit(event) {
    event.preventDefault();
    if (!noteState.body.trim()) return;
    await onAddNote(noteState);
    setNoteState({ title: '', body: '' });
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer drawer-wide" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-header drawer-header-rich">
          <div className="profile-header-main">
            <div className="profile-avatar-wrap">
              {member.profileImageUrl ? (
                <img className="profile-avatar-image" src={assetUrl(member.profileImageUrl)} alt={member.fullName} />
              ) : (
                <div className="profile-avatar-fallback">{memberInitials(member.fullName)}</div>
              )}
              {canEdit ? (
                <label className="inline-upload-btn">
                  <ImagePlus size={15} />
                  Change photo
                  <input type="file" accept="image/*" hidden onChange={handlePhotoChange} />
                </label>
              ) : null}
            </div>
            <div>
              <div className="section-chip">
                <UserRound size={16} />
                Member profile
              </div>
              <h3>{member.fullName}</h3>
              <p>{member.externalMemberId || 'No external member ID'}</p>
              <div className="attendance-summary profile-summary-line">
                <span>Attendance: {member._count?.attendanceRecords ?? 0}</span>
                <span>Documents: {member._count?.memberDocuments ?? 0}</span>
                <span>Notes: {member._count?.memberNotes ?? 0}</span>
              </div>
            </div>
          </div>
          <button className="ghost-btn" type="button" onClick={onClose}>Close</button>
        </div>

        <div className="profile-grid">
          <div className="profile-block">
            <h4>Edit profile</h4>
            <form className="form-grid" onSubmit={(event) => { event.preventDefault(); if (canEdit) onSave(formState); }}>
              <label>
                Full name
                <input value={formState.fullName || ''} readOnly={!canEdit} onChange={(e) => setFormState((current) => ({ ...current, fullName: e.target.value }))} />
              </label>
              <label>
                Member ID
                <input value={formState.externalMemberId || ''} readOnly={!canEdit} onChange={(e) => setFormState((current) => ({ ...current, externalMemberId: e.target.value }))} />
              </label>
              <label>
                Email
                <input type="email" value={formState.email || ''} readOnly={!canEdit} onChange={(e) => setFormState((current) => ({ ...current, email: e.target.value }))} />
              </label>
              <label>
                Phone
                <input value={formState.phoneNumber || ''} readOnly={!canEdit} onChange={(e) => setFormState((current) => ({ ...current, phoneNumber: e.target.value }))} />
              </label>
              <label>
                Date of birth
                <input type="date" value={formState.dateOfBirth || ''} readOnly={!canEdit} onChange={(e) => setFormState((current) => ({ ...current, dateOfBirth: e.target.value }))} />
              </label>
              <label>
                Join date
                <input type="date" value={formState.joinDate || ''} readOnly={!canEdit} onChange={(e) => setFormState((current) => ({ ...current, joinDate: e.target.value }))} />
              </label>
              <label>
                Gender
                <select value={formState.gender || 'UNKNOWN'} disabled={!canEdit} onChange={(e) => setFormState((current) => ({ ...current, gender: e.target.value }))}>
                  <option value="UNKNOWN">Unknown</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </label>
              <label>
                Status
                <select value={formState.membershipStatus || 'ACTIVE'} disabled={!canEdit} onChange={(e) => setFormState((current) => ({ ...current, membershipStatus: e.target.value }))}>
                  <option value="ACTIVE">Active</option>
                  <option value="DORMANT">Dormant</option>
                  <option value="IRREGULAR">Irregular</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={Boolean(formState.isLeader)}
                  disabled={!canEdit}
                  onChange={(e) => setFormState((current) => ({ ...current, isLeader: e.target.checked }))}
                />
                <span>Member is a leader</span>
              </label>
              <label>
                Fellowship type
                <select value={formState.fellowshipType || ''} disabled={!canEdit} onChange={(e) => setFormState((current) => ({ ...current, fellowshipType: e.target.value }))}>
                  <option value="">None selected</option>
                  <option value="BASONTA">Basonta</option>
                  <option value="BANCENTA">Bancenta</option>
                </select>
              </label>
              <label>
                Fellowship name
                <input value={formState.fellowshipName || ''} readOnly={!canEdit} onChange={(e) => setFormState((current) => ({ ...current, fellowshipName: e.target.value }))} placeholder="Give the fellowship or cell name" />
              </label>
              <label>
                Assigned role
                <input value={formState.leadershipRole || ''} readOnly={!canEdit} onChange={(e) => setFormState((current) => ({ ...current, leadershipRole: e.target.value }))} placeholder="Basonta leader, Bancenta shepherd, ministry lead" />
              </label>
              <label>
                Basonta category
                <select value={formState.basontaCategory || ''} disabled={!canEdit} onChange={(e) => setFormState((current) => ({ ...current, basontaCategory: e.target.value }))}>
                  <option value="">No category</option>
                  {basontaCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label>
                Contact preference
                <input value={formState.contactPreference || ''} readOnly={!canEdit} onChange={(e) => setFormState((current) => ({ ...current, contactPreference: e.target.value }))} />
              </label>
              <label>
                Postcode
                <input value={formState.postcode || ''} readOnly={!canEdit} onChange={(e) => setFormState((current) => ({ ...current, postcode: e.target.value }))} />
              </label>
              <label className="span-2">
                Address
                <input value={formState.addressFull || ''} readOnly={!canEdit} onChange={(e) => setFormState((current) => ({ ...current, addressFull: e.target.value }))} />
              </label>
              <label className="span-2">
                Profile notes
                <textarea rows="4" value={formState.notes || ''} readOnly={!canEdit} onChange={(e) => setFormState((current) => ({ ...current, notes: e.target.value }))} />
              </label>
              {canEdit ? (
                <div className="span-2 form-actions">
                  <button className="primary-btn" type="submit" disabled={busy}>
                    <Save size={16} /> Save profile
                  </button>
                </div>
              ) : null}
            </form>
          </div>

          <div className="stack-gap">
            <div className="profile-block stack-gap">
              <div>
                <h4>Assign to leader</h4>
                <div className="mini-row">
                  <span>Current leader</span>
                  <strong>{member.assignedLeader?.fullName || 'Not assigned'}</strong>
                </div>
                {member.assignedLeader?.email ? (
                  <div className="table-muted">{member.assignedLeader.email} • {member.assignedLeader.role}</div>
                ) : (
                  <div className="table-muted">Choose a ministry leader from the list below.</div>
                )}
              </div>
              {canAssignLeader ? (
                <form
                  className="stack-gap"
                  onSubmit={(event) => {
                    event.preventDefault();
                    onAssignLeader(assignedLeaderUserId);
                  }}
                >
                  <label>
                    Ministry leader
                    <select
                      value={assignedLeaderUserId}
                      disabled={busy}
                      onChange={(event) => setAssignedLeaderUserId(event.target.value)}
                    >
                      <option value="">No leader assigned</option>
                      {ministryLeaders.map((leader) => (
                        <option key={leader.id} value={leader.id}>
                          {leader.fullName} ({leader.role})
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="form-actions">
                    <button className="primary-btn" type="submit" disabled={busy}>
                      <Users size={16} /> Save assignment
                    </button>
                  </div>
                </form>
              ) : null}
            </div>

            <div className="profile-block stack-gap">
            <div>
              <h4>Attached documents</h4>
              {canEdit ? (
              <form className="stack-gap" onSubmit={handleDocumentSubmit}>
                <label>
                  Category
                  <input value={docMeta.category} onChange={(e) => setDocMeta((current) => ({ ...current, category: e.target.value }))} />
                </label>
                <label>
                  Note
                  <input value={docMeta.note} onChange={(e) => setDocMeta((current) => ({ ...current, note: e.target.value }))} />
                </label>
                <label className="upload-dropzone">
                  <FilePlus2 size={18} />
                  <span>{docFile ? docFile.name : 'Choose a file to attach'}</span>
                  <input type="file" hidden onChange={(event) => setDocFile(event.target.files?.[0] || null)} />
                </label>
                <button className="primary-btn" type="submit" disabled={!docFile || busy}>Upload document</button>
              </form>
              ) : null}
            </div>

            <div className="mini-table">
              {member.memberDocuments?.length ? member.memberDocuments.map((document) => (
                <div key={document.id} className="document-row">
                  <div>
                    <div className="table-name">{document.fileName}</div>
                    <div className="table-muted">{document.category || 'General'} • {formatDate(document.createdAt)}</div>
                    {document.note ? <div className="table-muted">{document.note}</div> : null}
                  </div>
                  <a className="ghost-btn ghost-btn-link" href={assetUrl(document.fileUrl)} target="_blank" rel="noreferrer">Open</a>
                </div>
              )) : <div className="empty-panel">No attachments yet.</div>}
            </div>
          </div>
          </div>
        </div>

        <div className="profile-grid profile-grid-bottom">
          <div className="profile-block stack-gap">
            <h4>Add note</h4>
            {canEdit ? (
            <form className="stack-gap" onSubmit={handleNoteSubmit}>
              <label>
                Title
                <input value={noteState.title} onChange={(e) => setNoteState((current) => ({ ...current, title: e.target.value }))} placeholder="Pastoral follow-up, prayer request, etc." />
              </label>
              <label>
                Note
                <textarea rows="4" value={noteState.body} onChange={(e) => setNoteState((current) => ({ ...current, body: e.target.value }))} placeholder="Write a member note" />
              </label>
              <button className="primary-btn" type="submit" disabled={busy}>
                <NotebookPen size={16} /> Save note
              </button>
            </form>
            ) : <div className="empty-panel">Viewer access is read-only.</div>}
          </div>

          <div className="profile-block stack-gap">
            <h4>Member notes</h4>
            <div className="mini-table">
              {member.memberNotes?.length ? member.memberNotes.map((note) => (
                <div key={note.id} className="note-row">
                  <div className="table-name">{note.title || 'Note'}</div>
                  <div className="table-muted">{formatDate(note.createdAt)} • {note.createdBy || 'system'}</div>
                  <div>{note.body}</div>
                </div>
              )) : <div className="empty-panel">No notes yet.</div>}
            </div>
          </div>
        </div>

        <div className="profile-block">
          <h4>Recent attendance</h4>
          <div className="mini-table">
            {member.attendanceRecords?.length ? member.attendanceRecords.map((record) => (
              <div key={record.id} className="mini-row">
                <span>{record.session?.title || 'Session'}</span>
                <span>{record.status}</span>
                <span>{formatDate(record.attendedOn)}</span>
              </div>
            )) : <div className="empty-panel">No attendance history yet.</div>}
          </div>
        </div>
      </aside>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState(initialLoginForm);
  const [forgotPasswordForm, setForgotPasswordForm] = useState(initialForgotPasswordForm);
  const [tokenResetForm, setTokenResetForm] = useState(initialTokenResetForm);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userForm, setUserForm] = useState(initialUserForm);
  const [userDraft, setUserDraft] = useState(initialUserForm);
  const [passwordForm, setPasswordForm] = useState(initialPasswordForm);
  const [health, setHealth] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [membersPayload, setMembersPayload] = useState({ data: [], pagination: { total: 0 } });
  const [households, setHouseholds] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [ministryLeaders, setMinistryLeaders] = useState([]);
  const [myMembers, setMyMembers] = useState([]);
  const [attendanceSessions, setAttendanceSessions] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedVisitorId, setSelectedVisitorId] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [form, setForm] = useState(initialForm);
  const [sessionForm, setSessionForm] = useState(initialSessionForm);
  const [visitorForm, setVisitorForm] = useState(initialVisitorForm);
  const [visitorFollowUpForm, setVisitorFollowUpForm] = useState(initialVisitorFollowUpForm);
  const [loading, setLoading] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const chartData = useMemo(() => {
    if (!dashboard?.statusCounts) return [];
    return Object.entries(dashboard.statusCounts).map(([status, count]) => ({ status, count }));
  }, [dashboard]);

  const attendanceTrendData = useMemo(() => dashboard?.attendanceTrend || [], [dashboard]);
  const funnelData = useMemo(() => dashboard?.visitorFollowUpFunnel || [], [dashboard]);
  const leaderCoverageData = useMemo(() => dashboard?.leaderCoverage || [], [dashboard]);

  const sessionRecordMap = useMemo(() => {
    const map = new Map();
    (selectedSession?.records || []).forEach((record) => {
      map.set(record.memberId, record);
    });
    return map;
  }, [selectedSession]);

  const filteredAttendanceMembers = useMemo(() => {
    const search = attendanceSearch.trim().toLowerCase();
    if (!search) return membersPayload.data;
    return membersPayload.data.filter((member) =>
      [member.fullName, member.externalMemberId, member.email, member.phoneNumber]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search)
    );
  }, [attendanceSearch, membersPayload.data]);

  const selectedVisitor = useMemo(
    () => visitors.find((visitor) => visitor.id === selectedVisitorId) || null,
    [visitors, selectedVisitorId]
  );

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) || null,
    [users, selectedUserId]
  );

  useEffect(() => {
    if (!visitors.length) {
      setSelectedVisitorId('');
      return;
    }

    if (!visitors.some((visitor) => visitor.id === selectedVisitorId)) {
      setSelectedVisitorId(visitors[0].id);
    }
  }, [visitors, selectedVisitorId]);

  useEffect(() => {
    if (!selectedVisitor) {
      setVisitorFollowUpForm(initialVisitorFollowUpForm);
      return;
    }

    setVisitorFollowUpForm({
      visitorFollowUpStatus: selectedVisitor.visitorFollowUpStatus || 'NEW',
      visitorAssignedTo: selectedVisitor.visitorAssignedTo || '',
      visitorLastContactAt: formatDateForInput(selectedVisitor.visitorLastContactAt),
      visitorNextStep: selectedVisitor.visitorNextStep || '',
      visitorFollowUpNotes: selectedVisitor.visitorFollowUpNotes || ''
    });
  }, [selectedVisitor]);

  useEffect(() => {
    if (!selectedUser) {
      setUserDraft(initialUserForm);
      return;
    }

    setUserDraft({
      fullName: selectedUser.fullName || '',
      email: selectedUser.email || '',
      password: '',
      role: selectedUser.role || 'VIEWER',
      isActive: Boolean(selectedUser.isActive)
    });
  }, [selectedUser]);

  async function loadData(preferredSessionId = '') {
    setLoading(true);
    setError('');
    try {
      const [healthRes, dashboardRes, membersRes, householdsRes, sessionsRes, visitorsRes, leadersRes, usersRes, assignableLeadersRes] = await Promise.all([
        api.health(),
        api.dashboard(),
        api.members({
          search: memberSearch,
          status: statusFilter,
          page: 1,
          pageSize: 200
        }),
        api.households(),
        api.attendanceSessions(),
        api.visitors(),
        api.leaders(),
        isAdminRole(currentUser?.role) ? api.users() : Promise.resolve({ data: [] }),
        canShepherdMembers(currentUser?.role) ? api.assignableLeaders() : Promise.resolve({ data: [] })
      ]);
      const myMembersRes = canShepherdMembers(currentUser?.role) ? await api.myMembers() : { data: [] };
      setHealth(healthRes);
      setDashboard(dashboardRes);
      setMembersPayload(membersRes);
      setHouseholds(householdsRes.data || []);
      setVisitors(visitorsRes.data || []);
      setLeaders(leadersRes.data || []);
      setMinistryLeaders(assignableLeadersRes.data || []);
      setMyMembers(myMembersRes.data || []);
      setUsers(usersRes.data || []);
      const sessions = sessionsRes.data || [];
      setAttendanceSessions(sessions);

      const nextSessionId = preferredSessionId || selectedSessionId || sessions[0]?.id || '';
      if (nextSessionId) {
        const sessionRes = await api.attendanceSession(nextSessionId);
        setSelectedSession(sessionRes);
        setSelectedSessionId(nextSessionId);
      } else {
        setSelectedSession(null);
        setSelectedSessionId('');
      }
    } catch (err) {
      setError(err.message || 'Could not reach the backend. Start the API and try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const url = new URL(window.location.href);
    const resetToken = url.searchParams.get('resetToken');

    if (resetToken) {
      setTokenResetForm((current) => ({ ...current, token: resetToken }));
    }

    const savedToken = window.localStorage.getItem(AUTH_TOKEN_KEY);

    if (!savedToken) {
      api.setToken('');
      setAuthReady(true);
      return;
    }

    api.setToken(savedToken);
    api.me()
      .then((response) => {
        setCurrentUser(response.user);
      })
      .catch(() => {
        api.setToken('');
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
      })
      .finally(() => {
        setAuthReady(true);
      });
  }, []);

  useEffect(() => {
    if (!authReady || !currentUser) return;
    loadData();
  }, [authReady, currentUser]);

  useEffect(() => {
    if (!authReady || !currentUser) return;

    const allowedTabs = new Set([
      'home',
      'dashboard',
      'account',
      'people',
      'my-members',
      'leaders',
      'households',
      'attendance',
      'visitors',
      'add-member',
      'users'
    ]);

    const syncTabFromLocation = () => {
      const hashValue = window.location.hash.replace(/^#/, '');
      const nextTab = hashValue || 'home';
      if (allowedTabs.has(nextTab)) {
        setTab(nextTab);
      } else if (!window.location.hash) {
        window.history.replaceState({ tab: 'home' }, '', '#home');
        setTab('home');
      }
    };

    syncTabFromLocation();
    window.addEventListener('popstate', syncTabFromLocation);

    return () => {
      window.removeEventListener('popstate', syncTabFromLocation);
    };
  }, [authReady, currentUser]);

  useEffect(() => {
    if (!users.length) {
      setSelectedUserId('');
      return;
    }

    if (!users.some((user) => user.id === selectedUserId)) {
      setSelectedUserId(users[0].id);
    }
  }, [users, selectedUserId]);
  const canManagePeopleAccess = canManagePeople(currentUser?.role);
  const canManageAttendanceAccess = canManageAttendance(currentUser?.role);
  const canResetAttendanceAccess = canResetAttendance(currentUser?.role);
  const canManageGuestsAccess = canManageGuests(currentUser?.role);
  const canShepherdMembersAccess = canShepherdMembers(currentUser?.role);
  const homeQuickActions = [
    {
      key: 'home',
      label: 'Home',
      icon: Church,
      detail: 'Start here',
      description: 'Return to the ministry home screen.',
      onClick: () => navigateToTab('home')
    },
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: TrendingUp,
      detail: 'View analytics',
      description: 'Open charts, attendance trends, and ministry health insights.',
      onClick: () => navigateToTab('dashboard')
    },
    {
      key: 'people',
      label: 'People',
      icon: Users,
      detail: 'Member records',
      description: 'Search profiles, contact details, and shepherd assignments.',
      onClick: () => navigateToTab('people')
    },
    {
      key: 'leaders',
      label: 'Leaders',
      icon: UserRound,
      detail: 'Leadership view',
      description: 'Review leaders, fellowships, and ministry responsibility.',
      onClick: () => navigateToTab('leaders')
    },
    {
      key: 'households',
      label: 'Households',
      icon: House,
      detail: 'Family groups',
      description: 'Browse grouped households and household-level records.',
      onClick: () => navigateToTab('households')
    },
    {
      key: 'attendance',
      label: 'Attendance',
      icon: CalendarDays,
      detail: 'Service check-in',
      description: 'Open sessions, mark attendance, and review missed weeks.',
      onClick: () => navigateToTab('attendance')
    },
    {
      key: 'visitors',
      label: 'Visitors',
      icon: Church,
      detail: 'Guest follow-up',
      description: 'Track guests, assign follow-up, and record next steps.',
      onClick: () => navigateToTab('visitors')
    },
    ...(canShepherdMembersAccess ? [{
      key: 'my-members',
      label: 'My Members',
      icon: UserSearch,
      detail: 'Assigned flock',
      description: 'See the people assigned to your care and act quickly.',
      onClick: () => navigateToTab('my-members')
    }] : []),
    ...(canManagePeopleAccess ? [{
      key: 'add-member',
      label: 'Add Member',
      icon: UserPlus,
      detail: 'Create record',
      description: 'Register a new member profile and save contact details.',
      onClick: () => navigateToTab('add-member')
    }] : []),
    ...(isAdminRole(currentUser?.role) ? [{
      key: 'users',
      label: 'Users',
      icon: Users,
      detail: 'Manage access',
      description: 'Create users, assign roles, and control sign-in access.',
      onClick: () => navigateToTab('users')
    }] : []),
    {
      key: 'refresh',
      label: 'Refresh',
      icon: RefreshCcw,
      detail: 'Sync now',
      description: 'Reload dashboard, people, attendance, and visitor data.',
      onClick: () => loadData(selectedSessionId)
    }
  ];

  function navigateToTab(nextTab, options = {}) {
    const { replace = false } = options;
    const hash = `#${nextTab}`;
    setTab(nextTab);
    setMobileMenuOpen(false);
    if (replace) {
      window.history.replaceState({ tab: nextTab }, '', hash);
    } else if (window.location.hash !== hash) {
      window.history.pushState({ tab: nextTab }, '', hash);
    }
  }

  async function refreshSelectedMember(memberId) {
    if (!memberId) return;
    const refreshed = await api.member(memberId);
    setSelectedMember(refreshed);
    return refreshed;
  }

  async function handleSearch(event) {
    event.preventDefault();
    await loadData();
  }

  async function handleCreateMember(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.createMember(form);
      setSuccess('Member created.');
      setForm(initialForm);
      await loadData();
      navigateToTab('people');
    } catch (err) {
      setError(err.message || 'Could not create member.');
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setAuthBusy(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.login(loginForm);
      api.setToken(response.token);
      window.localStorage.setItem(AUTH_TOKEN_KEY, response.token);
      setCurrentUser(response.user);
      setLoginForm(initialLoginForm);
      setSuccess(`Welcome back, ${response.user.fullName}.`);
    } catch (err) {
      setError(err.message || 'Could not sign in.');
    } finally {
      setAuthBusy(false);
      setAuthReady(true);
    }
  }

  async function handleForgotPassword(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    try {
      await api.requestPasswordReset(forgotPasswordForm);
      setForgotPasswordForm(initialForgotPasswordForm);
      setSuccess('If that account exists, a reset email link has been prepared.');
    } catch (err) {
      setError(err.message || 'Could not start password reset.');
    }
  }

  async function handleTokenPasswordReset(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (tokenResetForm.newPassword !== tokenResetForm.confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    try {
      await api.resetPasswordWithToken({
        token: tokenResetForm.token,
        newPassword: tokenResetForm.newPassword
      });
      setTokenResetForm(initialTokenResetForm);
      const url = new URL(window.location.href);
      url.searchParams.delete('resetToken');
      window.history.replaceState({}, '', url.toString());
      setSuccess('Password reset complete. You can sign in with the new password now.');
    } catch (err) {
      setError(err.message || 'Could not reset password with this token.');
    }
  }

  function handleLogout() {
    api.setToken('');
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    setCurrentUser(null);
    setUsers([]);
    setSelectedUserId('');
    setError('');
    setSuccess('');
    setTab('home');
    setMobileMenuOpen(false);
    window.history.replaceState({}, '', window.location.pathname);
  }

  async function handleCreateSession(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    try {
      const created = await api.createAttendanceSession(sessionForm);
      setSessionForm(initialSessionForm);
      setSuccess('Attendance session created.');
      await loadData(created.id);
      navigateToTab('attendance');
    } catch (err) {
      setError(err.message || 'Could not create attendance session.');
    }
  }

  async function handleRegisterVisitor(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    try {
      const created = await api.registerVisitor(visitorForm);
      setVisitorForm(initialVisitorForm);
      setSelectedVisitorId(created.id);
      setSuccess('Visitor registered for follow-up.');
      await loadData();
      navigateToTab('visitors');
    } catch (err) {
      setError(err.message || 'Could not register visitor.');
    }
  }

  async function openMember(memberId) {
    try {
      const member = await api.member(memberId);
      setSelectedMember(member);
    } catch (err) {
      setError(err.message || 'Could not load member profile.');
    }
  }

  async function openSession(sessionId) {
    setSelectedSessionId(sessionId);
    try {
      const session = await api.attendanceSession(sessionId);
      setSelectedSession(session);
    } catch (err) {
      setError(err.message || 'Could not load attendance session.');
    }
  }

  async function markAttendance(memberId, status) {
    if (!selectedSessionId) return;
    setError('');
    try {
      await api.markAttendance(selectedSessionId, { memberId, status });
      const refreshed = await api.attendanceSession(selectedSessionId);
      setSelectedSession(refreshed);
      const dash = await api.dashboard();
      setDashboard(dash);
      setSuccess(`Attendance saved as ${status}.`);
    } catch (err) {
      setError(err.message || 'Could not save attendance.');
    }
  }

  async function handleResetAttendance() {
    const confirmed = window.confirm(
      'This will permanently delete all attendance sessions and attendance records. Members and households will stay. Continue?'
    );

    if (!confirmed) return;

    setError('');
    setSuccess('');

    try {
      await api.resetAttendance();
      setSelectedSession(null);
      setSelectedSessionId('');
      setAttendanceSearch('');
      setSessionForm(initialSessionForm);
      await loadData();
      setSuccess('Attendance history cleared. You can start fresh now.');
    } catch (err) {
      setError(err.message || 'Could not reset attendance data.');
    }
  }

  async function handleMemberSave(payload) {
    if (!selectedMember?.id) return;
    setProfileBusy(true);
    setError('');
    setSuccess('');
    try {
      await api.updateMember(selectedMember.id, payload);
      await refreshSelectedMember(selectedMember.id);
      await loadData(selectedSessionId);
      setSuccess('Member profile updated.');
    } catch (err) {
      setError(err.message || 'Could not update member profile.');
    } finally {
      setProfileBusy(false);
    }
  }

  async function handleAssignLeader(nextLeaderUserId) {
    if (!selectedMember?.id) return;
    setProfileBusy(true);
    setError('');
    setSuccess('');

    try {
      await api.assignMemberToLeader(selectedMember.id, {
        assignedLeaderUserId: nextLeaderUserId || null
      });
      await refreshSelectedMember(selectedMember.id);
      await loadData(selectedSessionId);
      setSuccess(nextLeaderUserId ? 'Leader assignment updated.' : 'Leader assignment cleared.');
    } catch (err) {
      setError(err.message || 'Could not update leader assignment.');
    } finally {
      setProfileBusy(false);
    }
  }

  async function handleProfileImageUpload(file) {
    if (!selectedMember?.id) return;
    setProfileBusy(true);
    setError('');
    try {
      const dataUrl = await fileToDataUrl(file);
      await api.uploadProfileImage(selectedMember.id, {
        fileName: file.name,
        contentType: file.type,
        dataUrl
      });
      await refreshSelectedMember(selectedMember.id);
      await loadData(selectedSessionId);
      setSuccess('Profile picture updated.');
    } catch (err) {
      setError(err.message || 'Could not upload profile image.');
    } finally {
      setProfileBusy(false);
    }
  }

  async function handleDocumentUpload({ file, category, note }) {
    if (!selectedMember?.id) return;
    setProfileBusy(true);
    setError('');
    try {
      const dataUrl = await fileToDataUrl(file);
      await api.uploadMemberDocument(selectedMember.id, {
        fileName: file.name,
        contentType: file.type,
        dataUrl,
        category,
        note
      });
      await refreshSelectedMember(selectedMember.id);
      setSuccess('Document attached to member profile.');
    } catch (err) {
      setError(err.message || 'Could not upload document.');
    } finally {
      setProfileBusy(false);
    }
  }

  async function handleMemberNote(note) {
    if (!selectedMember?.id) return;
    setProfileBusy(true);
    setError('');
    try {
      await api.addMemberNote(selectedMember.id, note);
      await refreshSelectedMember(selectedMember.id);
      setSuccess('Member note saved.');
    } catch (err) {
      setError(err.message || 'Could not save note.');
    } finally {
      setProfileBusy(false);
    }
  }

  async function handleVisitorFollowUpSave(event) {
    event.preventDefault();
    if (!selectedVisitorId) return;

    setError('');
    setSuccess('');

    try {
      await api.updateVisitorFollowUp(selectedVisitorId, visitorFollowUpForm);
      await loadData();
      setSuccess('Guest follow-up updated.');
    } catch (err) {
      setError(err.message || 'Could not update guest follow-up.');
    }
  }

  async function handleCreateUser(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    try {
      await api.registerUser(userForm);
      setUserForm(initialUserForm);
      await loadData();
      navigateToTab('users');
      setSuccess('User account created.');
    } catch (err) {
      setError(err.message || 'Could not create user account.');
    }
  }

  async function handleUserUpdate(event) {
    event.preventDefault();
    if (!selectedUserId) return;

    setError('');
    setSuccess('');

    try {
      const payload = {
        fullName: userDraft.fullName,
        email: userDraft.email,
        role: userDraft.role,
        isActive: userDraft.isActive,
        ...(userDraft.password ? { password: userDraft.password } : {})
      };
      await api.updateUser(selectedUserId, payload);
      await loadData();
      setSuccess('User access updated.');
    } catch (err) {
      setError(err.message || 'Could not update user.');
    }
  }

  async function handlePasswordChange(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    try {
      await api.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordForm(initialPasswordForm);
      setSuccess('Your password has been updated.');
    } catch (err) {
      setError(err.message || 'Could not update your password.');
    }
  }

  if (!authReady || !currentUser) {
    return (
      <AuthScreen
        form={loginForm}
        onChange={setLoginForm}
        onSubmit={handleLogin}
        error={error}
        busy={authBusy}
      />
    );
  }

  return (
    <div className="page-shell">
      {tab === 'home' ? (
        <header className="hero">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <div className="hero-badge">Pleasant Surprise Church International</div>
            <div className="hero-title-row">
              <img className="hero-logo" src={LOGO_SRC} alt="Pleasant Surprise Church International logo" />
              <div className="hero-title-content">
                <h1>PSCI NOTTS CMS</h1>
                <p>Pastoral care, attendance tracking, leaders, households, and guest follow-up in one place.</p>
              </div>
              <div className="hero-account-panel">
                <button className="hero-top-btn" type="button" onClick={() => navigateToTab('account')}>
                  <UserRound size={15} />
                  <span>{currentUser.fullName}</span>
                </button>
                <button className="hero-top-btn hero-top-btn-outline" type="button" onClick={handleLogout}>
                  Sign out
                </button>
              </div>
            </div>
          </motion.div>

          <div className="hero-side">
            <div className="hero-side-card">
              <div className="hero-side-label">Signed in</div>
              <div className="hero-side-value hero-side-user">{currentUser.fullName}</div>
              <div className="table-muted hero-side-meta">{currentUser.role}</div>
            </div>
            <div className="hero-side-card">
              <div className="hero-side-label">Follow-up today</div>
              <div className="hero-side-value">{dashboard?.membersMissingTwoWeeksCount ?? 0}</div>
              <div className="table-muted hero-side-meta">People who may need a call or visit</div>
            </div>
          </div>
        </header>
      ) : (
        <header className="app-topbar">
          <div className="app-topbar-brand">
            <img className="app-topbar-logo" src={LOGO_SRC} alt="Pleasant Surprise Church International logo" />
            <div>
              <div className="hero-badge app-topbar-badge">Pleasant Surprise Church International</div>
              <h1>PSCI NOTTS CMS</h1>
            </div>
          </div>
          <div className="hero-account-panel">
            <button className="hero-top-btn app-topbar-btn" type="button" onClick={() => navigateToTab('account')}>
              <UserRound size={15} />
              <span>{currentUser.fullName}</span>
            </button>
            <button className="hero-top-btn hero-top-btn-outline app-topbar-btn" type="button" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </header>
      )}

      <div className="mobile-nav-bar">
        <button className="mobile-nav-trigger" type="button" onClick={() => setMobileMenuOpen((current) => !current)}>
          <Menu size={18} />
          <span>Menu</span>
        </button>
        <button className="mobile-nav-trigger mobile-nav-trigger-secondary" type="button" onClick={() => navigateToTab('home')}>
          <Church size={18} />
          <span>Home</span>
        </button>
      </div>

      {mobileMenuOpen ? (
        <div className="mobile-nav-drawer">
          <div className="mobile-nav-drawer-card">
            <div className="mobile-nav-header">
              <div>
                <div className="table-name">Navigate</div>
                <div className="table-muted">Choose a section to open</div>
              </div>
              <button className="ghost-btn" type="button" onClick={() => setMobileMenuOpen(false)}>Close</button>
            </div>
            <div className="mobile-nav-links">
              {[
                ...NAV_TABS,
                ['account', 'Account']
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={tab === value ? 'mobile-nav-link active' : 'mobile-nav-link'}
                  onClick={() => navigateToTab(value)}
                  type="button"
                >
                  <span>{label}</span>
                  <ArrowRight size={16} />
                </button>
              ))}
              <button className="mobile-nav-link" onClick={handleLogout} type="button">
                <span>Sign out</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <nav className="tabs">
        {NAV_TABS.map(([value, label]) => (
          <button
            key={value}
            className={tab === value ? 'tab active' : 'tab'}
            onClick={() => navigateToTab(value)}
            type="button"
          >
            {label}
          </button>
        ))}
      </nav>

      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}

      {tab === 'home' ? (
        <div className="stack">
          <SectionCard title="Quick actions" subtitle="Open every major area of the system from one place.">
            <div className="quick-actions-grid quick-actions-grid-home">
              {homeQuickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button key={action.key} className="quick-action-card" type="button" onClick={action.onClick}>
                    <div className="quick-action-head">
                      <Icon size={18} />
                      <span>{action.label}</span>
                    </div>
                    <strong>{action.detail}</strong>
                    <p>{action.description}</p>
                  </button>
                );
              })}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {tab === 'dashboard' ? (
        <div className="stack">
          <div className="stats-grid">
            <StatCard label="Members" value={dashboard?.totalMembers ?? '--'} icon={Users} note="Church family records" onClick={() => navigateToTab('people')} />
            <StatCard label="Households" value={dashboard?.totalHouseholds ?? '--'} icon={House} note="Grouped by address" onClick={() => navigateToTab('households')} />
            {dashboard?.canViewGiving ? (
              <StatCard label="This Month Giving" value={dashboard?.givingThisMonthFormatted ?? '£0.00'} icon={CircleDollarSign} note="From giving records" />
            ) : null}
            <StatCard label="Latest Attendance" value={dashboard?.latestAttendanceCount ?? 0} icon={CalendarDays} note={dashboard?.latestAttendanceTitle || 'Most recent session'} onClick={() => navigateToTab('attendance')} />
          </div>

          <div className="quick-actions-grid">
            <button className="quick-action-card" type="button" onClick={() => navigateToTab('people')}>
              <div className="quick-action-head">
                <Users size={18} />
                <span>People directory</span>
              </div>
              <strong>{formatCompactNumber(dashboard?.totalMembers ?? 0)}</strong>
              <p>Open member records, profiles, and shepherd assignments.</p>
            </button>
            <button className="quick-action-card" type="button" onClick={() => navigateToTab('visitors')}>
              <div className="quick-action-head">
                <Church size={18} />
                <span>Guest follow-up</span>
              </div>
              <strong>{formatCompactNumber(dashboard?.guestFollowUpPendingCount ?? 0)}</strong>
              <p>See new visitors, track follow-up, and close the loop quickly.</p>
            </button>
            <button className="quick-action-card" type="button" onClick={() => navigateToTab('attendance')}>
              <div className="quick-action-head">
                <CalendarDays size={18} />
                <span>Attendance room</span>
              </div>
              <strong>{formatCompactNumber(dashboard?.attendanceSessions ?? 0)}</strong>
              <p>Jump into services, mark attendance, or review missed weeks.</p>
            </button>
            <button className="quick-action-card" type="button" onClick={() => navigateToTab('leaders')}>
              <div className="quick-action-head">
                <UserRound size={18} />
                <span>Leadership view</span>
              </div>
              <strong>{formatCompactNumber(leaders.length)}</strong>
              <p>Browse leaders, fellowships, and ministry coverage at a glance.</p>
            </button>
          </div>

          <div className="stats-grid stats-grid-secondary">
            <StatCard label="Visitors This Week" value={dashboard?.firstTimeVisitorsThisWeek ?? 0} icon={Sparkles} note="First-time guests this week" onClick={() => navigateToTab('visitors')} />
            <StatCard label="New Members This Month" value={dashboard?.newMembersThisMonth ?? 0} icon={BadgePlus} note="Based on join date" onClick={() => navigateToTab('people')} />
            <StatCard label="Unassigned Members" value={dashboard?.unassignedMembersCount ?? 0} icon={UserSearch} note="People still needing a shepherd" onClick={() => navigateToTab('people')} />
            <StatCard label="Missing Contact Info" value={dashboard?.membersMissingContactCount ?? 0} icon={AlertTriangle} note="No email and no phone number" onClick={() => navigateToTab('people')} />
          </div>

          <div className="two-col">
            <SectionCard title="Membership Status" subtitle="Counts from the backend report endpoint">
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="status" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={entry.status} fill={STATUS_CHART_COLORS[index % STATUS_CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title="Quick Summary" subtitle="A snapshot of what the backend is returning">
              <ul className="summary-list">
                <li><span>Active</span><strong>{dashboard?.statusCounts?.ACTIVE ?? 0}</strong></li>
                <li><span>Dormant</span><strong>{dashboard?.statusCounts?.DORMANT ?? 0}</strong></li>
                <li><span>Irregular</span><strong>{dashboard?.statusCounts?.IRREGULAR ?? 0}</strong></li>
                <li><span>Archived</span><strong>{dashboard?.statusCounts?.ARCHIVED ?? 0}</strong></li>
                <li><span>Attendance sessions</span><strong>{dashboard?.attendanceSessions ?? 0}</strong></li>
                <li><span>Guests needing follow-up</span><strong>{dashboard?.guestFollowUpPendingCount ?? 0}</strong></li>
                <li><span>Visitors this month</span><strong>{dashboard?.firstTimeVisitorsThisMonth ?? 0}</strong></li>
                <li><span>Members missing household info</span><strong>{dashboard?.membersMissingHouseholdCount ?? 0}</strong></li>
              </ul>
            </SectionCard>
          </div>

          <div className="two-col">
            <SectionCard
              title="Attendance Trend"
              subtitle={dashboard?.previousAttendanceTitle ? `${dashboard.latestAttendanceTitle} vs ${dashboard.previousAttendanceTitle}` : 'Latest attendance movement across recent sessions'}
              action={
                <div className="section-chip">
                  <TrendingUp size={16} />
                  {dashboard?.attendanceDelta > 0 ? `+${dashboard.attendanceDelta}` : dashboard?.attendanceDelta ?? 0} vs previous
                </div>
              }
            >
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={attendanceTrendData}>
                    <defs>
                      <linearGradient id="attendanceFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.85} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.08} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="attendedCount" stroke="#f97316" fill="url(#attendanceFill)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title="Visitor Follow-up Funnel" subtitle="See where guests currently sit in the follow-up journey">
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={funnelData} dataKey="count" nameKey="status" innerRadius={56} outerRadius={94} paddingAngle={3}>
                      {funnelData.map((entry, index) => (
                        <Cell key={entry.status} fill={FUNNEL_CHART_COLORS[index % FUNNEL_CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </div>

          <div className="two-col">
            <SectionCard
              title="Attendance Follow-up"
              subtitle={`Members with no recorded attendance since ${formatDate(dashboard?.twoWeekAttendanceThreshold)}`}
              action={
                <div className="section-chip">
                  <CalendarDays size={16} />
                  {dashboard?.membersMissingTwoWeeksCount ?? 0} need checking
                </div>
              }
            >
              <div className="attendance-gap-panel">
                <div className="attendance-gap-value">{dashboard?.membersMissingTwoWeeksCount ?? 0}</div>
                <p>
                  People in the current member list who have not attended in the last 14 days, including those with no attendance history yet.
                </p>
              </div>
            </SectionCard>

            <SectionCard
              title="People Missing 2 Weeks"
              subtitle="Use this as a quick pastoral follow-up list"
            >
              <div className="mini-table">
                {dashboard?.membersMissingTwoWeeks?.length ? dashboard.membersMissingTwoWeeks.map((member) => (
                  <div key={member.id} className="note-row">
                    <div className="table-name">{member.fullName}</div>
                    <div className="table-muted">
                      {member.membershipStatus} • Last attended: {member.lastAttendedAt ? formatDate(member.lastAttendedAt) : 'Never recorded'}
                    </div>
                    <div className="mini-row">
                      <span>Gap</span>
                      <strong>{formatAttendanceGap(member.daysSinceAttendance)}</strong>
                    </div>
                    <div className="mini-row">
                      <span>Email</span>
                      <strong>{member.email || '—'}</strong>
                    </div>
                    <div className="mini-row">
                      <span>Phone</span>
                      <strong>{member.phoneNumber || '—'}</strong>
                    </div>
                  </div>
                )) : <div className="empty-panel">No one is currently over the two-week threshold.</div>}
              </div>
            </SectionCard>
          </div>

          <div className="two-col">
            <SectionCard
              title="Leader Coverage"
              subtitle="How many members are currently assigned to each shepherd"
              action={<div className="section-chip"><Users size={16} /> {leaderCoverageData.length} leaders tracked</div>}
            >
              <div className="mini-table">
                {leaderCoverageData.length ? leaderCoverageData.map((leader, index) => (
                  <div key={leader.id} className="note-row">
                    <div className="mini-row">
                      <span>{leader.role.replaceAll('_', ' ')}</span>
                      <strong>{leader.memberCount} assigned</strong>
                    </div>
                    <div className="table-name">{leader.fullName}</div>
                    <div className="leader-bar">
                      <span className="leader-bar-fill" style={{ width: `${Math.max((leader.memberCount / Math.max(...leaderCoverageData.map((item) => item.memberCount), 1)) * 100, 8)}%`, background: STATUS_CHART_COLORS[index % STATUS_CHART_COLORS.length] }} />
                    </div>
                  </div>
                )) : <div className="empty-panel">No shepherd assignments yet.</div>}
              </div>
            </SectionCard>

            <SectionCard title="Care and Data Alerts" subtitle="Operational items that need admin or pastoral attention">
              <ul className="summary-list">
                <li><span>Guests needing follow-up</span><strong>{dashboard?.guestFollowUpPendingCount ?? 0}</strong></li>
                <li><span>Unassigned members</span><strong>{dashboard?.unassignedMembersCount ?? 0}</strong></li>
                <li><span>Missing contact info</span><strong>{dashboard?.membersMissingContactCount ?? 0}</strong></li>
                <li><span>Missing household info</span><strong>{dashboard?.membersMissingHouseholdCount ?? 0}</strong></li>
                <li><span>Attendance gap follow-up</span><strong>{dashboard?.membersMissingTwoWeeksCount ?? 0}</strong></li>
              </ul>
            </SectionCard>
          </div>
        </div>
      ) : null}

      {tab === 'people' ? (
        <div className="stack">
          <SectionCard
            title="People Directory"
            subtitle="Click a member name to open an editable profile"
            action={
              <form className="search-row" onSubmit={handleSearch}>
                <div className="input-with-icon">
                  <Search size={16} />
                  <input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Search members" />
                </div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="DORMANT">Dormant</option>
                  <option value="IRREGULAR">Irregular</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
                <button className="primary-btn" type="submit">Search</button>
              </form>
            }
          >
            <div className="table-shell">
              <table className="mobile-cards-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Member ID</th>
                    <th>Status</th>
                    <th>DOB</th>
                    <th>Contact</th>
                    <th>Address</th>
                  </tr>
                </thead>
                <tbody>
                  {membersPayload.data.map((member) => (
                    <tr key={member.id}>
                      <td data-label="Member">
                        <button className="table-link" type="button" onClick={() => openMember(member.id)}>
                          {member.fullName}
                        </button>
                        <div className="table-muted">
                          {[member.gender, member.fellowshipType, member.basontaCategory].filter(Boolean).join(' • ') || '—'}
                        </div>
                        {member.assignedLeader?.fullName ? <div className="table-muted">Shepherd: {member.assignedLeader.fullName}</div> : null}
                      </td>
                      <td data-label="Member ID">{member.externalMemberId || '—'}</td>
                      <td data-label="Status">{member.membershipStatus}</td>
                      <td data-label="DOB">{member.dateOfBirth ? member.dateOfBirth.slice(0, 10) : '—'}</td>
                      <td data-label="Contact">
                        <div className="table-stack">
                          <span><Mail size={14} /> {member.email || '—'}</span>
                          <span><Phone size={14} /> {member.phoneNumber || '—'}</span>
                        </div>
                      </td>
                      <td data-label="Address">
                        <div className="table-stack">
                          <span><MapPin size={14} /> {member.addressFull || member.household?.addressFull || '—'}</span>
                          <span className="table-muted">{member.postcode || member.household?.postcode || ''}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!membersPayload.data.length && !loading ? (
                    <tr>
                      <td colSpan="6" className="empty-state-cell">No members found.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      ) : null}

      {tab === 'my-members' ? (
        <div className="stack">
          <div className="two-col">
            <SectionCard
              title="My Sheep"
              subtitle="Members currently assigned to you as shepherd"
              action={<div className="section-chip"><Users size={16} /> {myMembers.length} assigned</div>}
            >
              <div className="table-shell">
                <table className="mobile-cards-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Fellowship</th>
                      <th>Contact</th>
                      <th>Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myMembers.map((member) => (
                      <tr key={member.id}>
                        <td data-label="Member">
                          <button className="table-link" type="button" onClick={() => openMember(member.id)}>
                            {member.fullName}
                          </button>
                          <div className="table-muted">{member.membershipStatus}</div>
                        </td>
                        <td data-label="Fellowship">
                          <div className="table-stack">
                            <span>{member.fellowshipType || '—'}</span>
                            <span className="table-muted">{member.fellowshipName || member.basontaCategory || ''}</span>
                          </div>
                        </td>
                        <td data-label="Contact">
                          <div className="table-stack">
                            <span><Mail size={14} /> {member.email || '—'}</span>
                            <span><Phone size={14} /> {member.phoneNumber || '—'}</span>
                          </div>
                        </td>
                        <td data-label="Attendance">{member._count?.attendanceRecords ?? 0} records</td>
                      </tr>
                    ))}
                    {!myMembers.length && !loading ? (
                      <tr>
                        <td colSpan="4" className="empty-state-cell">No members assigned to you yet. Use the People section to assign some to yourself.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard
              title={selectedSession?.title || 'Shepherd Attendance'}
              subtitle={selectedSession ? `${formatDate(selectedSession.serviceDate)} • ${formatSessionCategory(selectedSession)}` : 'Open an attendance session to mark your assigned members'}
              action={selectedSession ? <div className="section-chip"><CheckCircle2 size={16} /> My flock only</div> : null}
            >
              <div className="session-list">
                {attendanceSessions.map((session) => (
                  <button key={session.id} type="button" className={selectedSessionId === session.id ? 'session-card active' : 'session-card'} onClick={() => openSession(session.id)}>
                    <div>
                      <div className="table-name">{session.title}</div>
                      <div className="table-muted">{formatDate(session.serviceDate)} • {formatSessionCategory(session)}</div>
                    </div>
                    <div className="session-count">{session.presentCount}</div>
                  </button>
                ))}
              </div>
            </SectionCard>
          </div>

          <SectionCard
            title="Take Attendance for My Members"
            subtitle="Quickly mark attendance for the members assigned to you"
          >
            {selectedSession ? (
              <div className="table-shell attendance-table">
                <table className="mobile-cards-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Current status</th>
                      <th>Quick mark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myMembers.map((member) => {
                      const record = sessionRecordMap.get(member.id);
                      return (
                        <tr key={member.id}>
                          <td data-label="Member">
                            <div className="table-name">{member.fullName}</div>
                            <div className="table-muted">{member.fellowshipName || member.basontaCategory || member.fellowshipType || 'Assigned member'}</div>
                          </td>
                          <td data-label="Current status"><span className={`pill status-${(record?.status || 'UNMARKED').toLowerCase()}`}>{record?.status || 'UNMARKED'}</span></td>
                          <td data-label="Quick mark">
                            <div className="action-row">
                              {['PRESENT', 'LATE', 'ABSENT', 'VISITOR'].map((status) => (
                                <button key={status} type="button" className={record?.status === status ? 'mini-btn active' : 'mini-btn'} onClick={() => markAttendance(member.id, status)}>
                                  {status}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!myMembers.length ? (
                      <tr>
                        <td colSpan="3" className="empty-state-cell">No assigned members yet.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            ) : <div className="empty-panel">No attendance session selected yet.</div>}
          </SectionCard>
        </div>
      ) : null}

      {tab === 'leaders' ? (
        <SectionCard
          title="Leaders and Assigned Roles"
          subtitle="Basonta, Bancenta, and ministry leaders in one directory"
          action={<div className="section-chip"><Users size={16} /> {leaders.length} leaders</div>}
        >
          <div className="table-shell">
            <table className="mobile-cards-table">
              <thead>
                <tr>
                  <th>Leader</th>
                  <th>Assigned role</th>
                  <th>Fellowship</th>
                  <th>Basonta category</th>
                  <th>Contact</th>
                </tr>
              </thead>
              <tbody>
                {leaders.map((leader) => (
                  <tr key={leader.id}>
                    <td data-label="Leader">
                      <button className="table-link" type="button" onClick={() => openMember(leader.id)}>
                        {leader.fullName}
                      </button>
                      <div className="table-muted">{leader.membershipStatus}</div>
                    </td>
                    <td data-label="Assigned role">{leader.leadershipRole || 'Leader'}</td>
                    <td data-label="Fellowship">
                      <div className="table-stack">
                        <span>{leader.fellowshipType || '—'}</span>
                        <span className="table-muted">{leader.fellowshipName || ''}</span>
                      </div>
                    </td>
                    <td data-label="Basonta category">{leader.basontaCategory || '—'}</td>
                    <td data-label="Contact">
                      <div className="table-stack">
                        <span><Mail size={14} /> {leader.email || '—'}</span>
                        <span><Phone size={14} /> {leader.phoneNumber || '—'}</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {!leaders.length && !loading ? (
                  <tr>
                    <td colSpan="5" className="empty-state-cell">No leaders assigned yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}

      {tab === 'account' ? (
        <div className="two-col">
          <SectionCard
            title="My Account"
            subtitle="Your current sign-in and permission role"
          >
            <div className="stack-gap">
              <div className="mini-row"><span>Name</span><strong>{currentUser.fullName}</strong></div>
              <div className="mini-row"><span>Email</span><strong>{currentUser.email}</strong></div>
              <div className="mini-row"><span>Role</span><strong>{currentUser.role}</strong></div>
              <div className="role-help-card">{roleDescriptions[currentUser.role] || 'Your assigned access controls what you can do in the system.'}</div>
            </div>
          </SectionCard>

          <SectionCard
            title="Reset Password"
            subtitle="All roles can update their own password here"
          >
            <form className="stack-gap" onSubmit={handlePasswordChange}>
              <label>
                Current password
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((current) => ({ ...current, currentPassword: e.target.value }))}
                  required
                />
              </label>
              <label>
                New password
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((current) => ({ ...current, newPassword: e.target.value }))}
                  minLength={8}
                  required
                />
              </label>
              <label>
                Confirm new password
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((current) => ({ ...current, confirmPassword: e.target.value }))}
                  minLength={8}
                  required
                />
              </label>
              <div className="form-actions">
                <button className="primary-btn" type="submit">Update password</button>
              </div>
            </form>
          </SectionCard>
        </div>
      ) : null}

      {tab === 'households' ? (
        <SectionCard title="Households" subtitle="Grouped by shared address from your import files">
          <div className="table-shell">
            <table className="mobile-cards-table">
              <thead>
                <tr>
                  <th>Household</th>
                  <th>External Code</th>
                  <th>Address</th>
                  <th>Postcode</th>
                  <th>Members</th>
                </tr>
              </thead>
              <tbody>
                {households.map((household) => (
                  <tr key={household.id}>
                    <td data-label="Household">{household.householdName || 'Unnamed Household'}</td>
                    <td data-label="External Code">{household.externalHouseholdId}</td>
                    <td data-label="Address">{household.addressFull || '—'}</td>
                    <td data-label="Postcode">{household.postcode || '—'}</td>
                    <td data-label="Members">{household._count?.members ?? 0}</td>
                  </tr>
                ))}
                {!households.length && !loading ? (
                  <tr>
                    <td colSpan="5" className="empty-state-cell">No households found.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}

      {tab === 'attendance' ? (
        <div className="attendance-grid">
          <SectionCard
            title="Attendance Sessions"
            subtitle="Create a service date and open it for check-in"
            action={
              <button className="danger-btn" type="button" onClick={handleResetAttendance} disabled={!canResetAttendanceAccess}>
                Reset attendance
              </button>
            }
          >
            {canManageAttendanceAccess ? (
            <form className="form-grid compact" onSubmit={handleCreateSession}>
              <label>
                Session title
                <input value={sessionForm.title} onChange={(e) => setSessionForm((current) => ({ ...current, title: e.target.value }))} required />
              </label>
              <label>
                Service date
                <input type="date" value={sessionForm.serviceDate} onChange={(e) => setSessionForm((current) => ({ ...current, serviceDate: e.target.value }))} required />
              </label>
              <label>
                Category
                <select value={sessionForm.category} onChange={(e) => setSessionForm((current) => ({ ...current, category: e.target.value }))}>
                  <option value="SUNDAY_SERVICE">Sunday service</option>
                  <option value="MIDWEEK_PRAYER">Midweek prayer</option>
                  <option value="BIBLE_STUDY">Bible study</option>
                  <option value="OUTREACH">Outreach</option>
                  <option value="YOUTH">Youth</option>
                  <option value="SPECIAL_EVENT">Special event</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>
              {sessionForm.category === 'OTHER' ? (
                <label>
                  New category name
                  <input
                    value={sessionForm.customCategory}
                    onChange={(e) => setSessionForm((current) => ({ ...current, customCategory: e.target.value }))}
                    placeholder="Thanksgiving service, revival night, conference"
                    required
                  />
                </label>
              ) : null}
              <label className="span-2">
                Notes
                <input value={sessionForm.notes} onChange={(e) => setSessionForm((current) => ({ ...current, notes: e.target.value }))} />
              </label>
              <div className="span-2 form-actions">
                <button className="primary-btn" type="submit">Create session</button>
              </div>
            </form>
            ) : null}

            <div className="session-list">
              {attendanceSessions.map((session) => (
                <button key={session.id} type="button" className={selectedSessionId === session.id ? 'session-card active' : 'session-card'} onClick={() => openSession(session.id)}>
                  <div>
                    <div className="table-name">{session.title}</div>
                    <div className="table-muted">{formatDate(session.serviceDate)} • {formatSessionCategory(session)}</div>
                  </div>
                  <div className="session-count">{session.presentCount}</div>
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title={selectedSession?.title || 'Open a session'}
            subtitle={selectedSession ? `${formatDate(selectedSession.serviceDate)} • ${formatSessionCategory(selectedSession)}` : 'Choose a session from the left'}
            action={selectedSession ? <div className="section-chip"><CheckCircle2 size={16} /> Present: {selectedSession.summary?.countedPresent ?? 0}</div> : null}
          >
            {selectedSession ? (
              <>
                <div className="attendance-toolbar">
                  <div className="input-with-icon">
                    <Search size={16} />
                    <input value={attendanceSearch} onChange={(e) => setAttendanceSearch(e.target.value)} placeholder="Filter attendance list" />
                  </div>
                  <div className="attendance-summary">
                    <span>Total marked: {selectedSession.summary?.totalRecords ?? 0}</span>
                    <span>Absent: {selectedSession.summary?.absentCount ?? 0}</span>
                    <span>Late: {selectedSession.summary?.lateCount ?? 0}</span>
                  </div>
                </div>
                <div className="table-shell attendance-table">
                  <table className="mobile-cards-table">
                    <thead>
                      <tr>
                        <th>Member</th>
                        <th>Member ID</th>
                        <th>Current status</th>
                        <th>Quick mark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAttendanceMembers.map((member) => {
                        const record = sessionRecordMap.get(member.id);
                        return (
                          <tr key={member.id}>
                            <td data-label="Member">
                              <div className="table-name">{member.fullName}</div>
                              <div className="table-muted">{member.membershipStatus}</div>
                            </td>
                            <td data-label="Member ID">{member.externalMemberId || '—'}</td>
                            <td data-label="Current status"><span className={`pill status-${(record?.status || 'UNMARKED').toLowerCase()}`}>{record?.status || 'UNMARKED'}</span></td>
                            <td data-label="Quick mark">
                              <div className="action-row">
                                {canManageAttendanceAccess ? ['PRESENT', 'LATE', 'ABSENT', 'VISITOR'].map((status) => (
                                  <button key={status} type="button" className={record?.status === status ? 'mini-btn active' : 'mini-btn'} onClick={() => markAttendance(member.id, status)}>
                                    {status}
                                  </button>
                                )) : <span className="table-muted">Viewer access is read-only</span>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : <div className="empty-panel">No attendance session selected yet.</div>}
          </SectionCard>
        </div>
      ) : null}

      {tab === 'add-member' && canManagePeopleAccess ? (
        <SectionCard
          title="Add Member"
          subtitle="Creates a member record in the backend"
          action={
            <div className="section-chip">
              <UserPlus size={16} />
              Backend form
            </div>
          }
        >
          <form className="form-grid" onSubmit={handleCreateMember}>
            <label>
              Full name
              <input value={form.fullName} onChange={(e) => setForm((current) => ({ ...current, fullName: e.target.value }))} required />
            </label>
            <label>
              Member ID
              <input value={form.externalMemberId} onChange={(e) => setForm((current) => ({ ...current, externalMemberId: e.target.value }))} />
            </label>
            <label>
              Email
              <input type="email" value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} />
            </label>
            <label>
              Phone
              <input value={form.phoneNumber} onChange={(e) => setForm((current) => ({ ...current, phoneNumber: e.target.value }))} />
            </label>
            <label>
              Date of birth
              <input type="date" value={form.dateOfBirth} onChange={(e) => setForm((current) => ({ ...current, dateOfBirth: e.target.value }))} />
            </label>
            <label>
              Gender
              <select value={form.gender} onChange={(e) => setForm((current) => ({ ...current, gender: e.target.value }))}>
                <option value="UNKNOWN">Unknown</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </label>
            <label>
              Membership status
              <select value={form.membershipStatus} onChange={(e) => setForm((current) => ({ ...current, membershipStatus: e.target.value }))}>
                <option value="ACTIVE">Active</option>
                <option value="DORMANT">Dormant</option>
                <option value="IRREGULAR">Irregular</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </label>
            <label className="span-2">
              Address
              <input value={form.addressFull} onChange={(e) => setForm((current) => ({ ...current, addressFull: e.target.value }))} />
            </label>
            <div className="span-2 form-actions">
              <button className="primary-btn" type="submit">Save member</button>
            </div>
          </form>
        </SectionCard>
      ) : null}

      {tab === 'users' && isAdminRole(currentUser.role) ? (
        <div className="stack">
          <div className="two-col">
            <SectionCard
              title="Register User"
              subtitle="Create users and assign ministry access, including admin roles"
              action={
                <div className="section-chip">
                  <Users size={16} />
                  Access control
                </div>
              }
            >
              <form className="form-grid" onSubmit={handleCreateUser}>
                <label>
                  Full name
                  <input value={userForm.fullName} onChange={(e) => setUserForm((current) => ({ ...current, fullName: e.target.value }))} required />
                </label>
                <label>
                  Email
                  <input type="email" value={userForm.email} onChange={(e) => setUserForm((current) => ({ ...current, email: e.target.value }))} required />
                </label>
                <label>
                  Password
                  <input type="password" value={userForm.password} onChange={(e) => setUserForm((current) => ({ ...current, password: e.target.value }))} required />
                </label>
                <label>
                  Role
                  <select value={userForm.role} onChange={(e) => setUserForm((current) => ({ ...current, role: e.target.value }))}>
                    <option value="SUPER_ADMIN">Super admin</option>
                    <option value="ADMIN">Admin</option>
                    <option value="PASTOR">Pastor</option>
                    <option value="FINANCE">Finance</option>
                    <option value="MINISTRY_LEADER">Ministry leader</option>
                    <option value="VOLUNTEER">Volunteer</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                </label>
                <label className="span-2">
                  Permission summary
                  <div className="role-help-card">{roleDescriptions[userForm.role]}</div>
                </label>
                <label className="checkbox-row span-2">
                  <input type="checkbox" checked={userForm.isActive} onChange={(e) => setUserForm((current) => ({ ...current, isActive: e.target.checked }))} />
                  <span>Account is active</span>
                </label>
                <div className="span-2 form-actions">
                  <button className="primary-btn" type="submit">Create user</button>
                </div>
              </form>
            </SectionCard>

            <SectionCard
              title="Existing Users"
              subtitle="Choose an account to review or change role access"
            >
              <div className="mini-table">
                {users.length ? users.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className={selectedUserId === user.id ? 'queue-card active' : 'queue-card'}
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <div className="queue-card-main">
                      <div>
                        <div className="table-name">{user.fullName}</div>
                        <div className="table-muted">{user.email}</div>
                      </div>
                      <span className={`pill ${user.isActive ? 'status-present' : 'status-absent'}`}>
                        {user.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>
                    <div className="table-muted">{user.role}</div>
                  </button>
                )) : <div className="empty-panel">No users found.</div>}
              </div>
            </SectionCard>
          </div>

          <SectionCard
            title={selectedUser ? `Manage Access: ${selectedUser.fullName}` : 'Manage Access'}
            subtitle={selectedUser ? 'Update role, password, and active status for this account.' : 'Select a user from the list above.'}
          >
            {selectedUser ? (
              <form className="form-grid" onSubmit={handleUserUpdate}>
                <label>
                  Full name
                  <input value={userDraft.fullName} onChange={(e) => setUserDraft((current) => ({ ...current, fullName: e.target.value }))} required />
                </label>
                <label>
                  Email
                  <input type="email" value={userDraft.email} onChange={(e) => setUserDraft((current) => ({ ...current, email: e.target.value }))} required />
                </label>
                <label>
                  Role
                  <select value={userDraft.role} onChange={(e) => setUserDraft((current) => ({ ...current, role: e.target.value }))}>
                    <option value="SUPER_ADMIN">Super admin</option>
                    <option value="ADMIN">Admin</option>
                    <option value="PASTOR">Pastor</option>
                    <option value="FINANCE">Finance</option>
                    <option value="MINISTRY_LEADER">Ministry leader</option>
                    <option value="VOLUNTEER">Volunteer</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                </label>
                <label className="span-2">
                  Permission summary
                  <div className="role-help-card">{roleDescriptions[userDraft.role]}</div>
                </label>
                <label>
                  Reset password
                  <input type="password" value={userDraft.password} onChange={(e) => setUserDraft((current) => ({ ...current, password: e.target.value }))} placeholder="Leave blank to keep the current password" />
                </label>
                <label className="checkbox-row span-2">
                  <input type="checkbox" checked={userDraft.isActive} onChange={(e) => setUserDraft((current) => ({ ...current, isActive: e.target.checked }))} />
                  <span>User can sign in</span>
                </label>
                <div className="span-2 form-actions">
                  <button className="primary-btn" type="submit">Save user access</button>
                </div>
              </form>
            ) : <div className="empty-panel">No user selected yet.</div>}
          </SectionCard>
        </div>
      ) : null}

      {tab === 'visitors' ? (
        <div className="stack">
          <div className="two-col">
            {canManageGuestsAccess ? (
            <SectionCard
              title="Register New Visitor"
              subtitle="Capture first-time guest details for welcome and follow-up"
              action={
                <div className="section-chip">
                  <Sparkles size={16} />
                  Guest follow-up
                </div>
              }
            >
              <form className="form-grid" onSubmit={handleRegisterVisitor}>
                <label>
                  Full name
                  <input value={visitorForm.fullName} onChange={(e) => setVisitorForm((current) => ({ ...current, fullName: e.target.value }))} required />
                </label>
                <label>
                  Service date
                  <input type="date" value={visitorForm.serviceDate} onChange={(e) => setVisitorForm((current) => ({ ...current, serviceDate: e.target.value }))} />
                </label>
                <label>
                  Email
                  <input type="email" value={visitorForm.email} onChange={(e) => setVisitorForm((current) => ({ ...current, email: e.target.value }))} />
                </label>
                <label>
                  Phone
                  <input value={visitorForm.phoneNumber} onChange={(e) => setVisitorForm((current) => ({ ...current, phoneNumber: e.target.value }))} />
                </label>
                <label>
                  Invited by
                  <input value={visitorForm.invitedBy} onChange={(e) => setVisitorForm((current) => ({ ...current, invitedBy: e.target.value }))} placeholder="Member, team, or friend" />
                </label>
                <label>
                  How they heard about us
                  <input value={visitorForm.howHeard} onChange={(e) => setVisitorForm((current) => ({ ...current, howHeard: e.target.value }))} placeholder="Online, flyer, family, walk-in" />
                </label>
                <label className="span-2">
                  Address
                  <input value={visitorForm.addressFull} onChange={(e) => setVisitorForm((current) => ({ ...current, addressFull: e.target.value }))} />
                </label>
                <label>
                  Postcode
                  <input value={visitorForm.postcode} onChange={(e) => setVisitorForm((current) => ({ ...current, postcode: e.target.value }))} />
                </label>
                <label className="span-2">
                  Notes
                  <textarea rows="4" value={visitorForm.notes} onChange={(e) => setVisitorForm((current) => ({ ...current, notes: e.target.value }))} placeholder="Prayer request, family details, next step, or any pastoral note" />
                </label>
                <div className="span-2 form-actions">
                  <button className="primary-btn" type="submit">Register visitor</button>
                </div>
              </form>
            </SectionCard>
            ) : null}

            <SectionCard
              title="Guest Follow-up Queue"
              subtitle="Select a visitor to track contact, ownership, and next steps"
            >
              <div className="mini-table">
                {visitors.length ? visitors.map((visitor) => (
                  <button
                    key={visitor.id}
                    type="button"
                    className={selectedVisitorId === visitor.id ? 'queue-card active' : 'queue-card'}
                    onClick={() => setSelectedVisitorId(visitor.id)}
                  >
                    <div className="queue-card-main">
                      <div>
                        <div className="table-name">{visitor.fullName}</div>
                        <div className="table-muted">
                          {visitor.visitorFirstServiceDate ? formatDate(visitor.visitorFirstServiceDate) : formatDate(visitor.joinDate)} • {visitor.visitorFollowUpStatus || 'NEW'}
                        </div>
                      </div>
                      <span className={`pill ${['JOINED', 'CLOSED'].includes(visitor.visitorFollowUpStatus) ? 'status-present' : 'status-visitor'}`}>
                        {visitor.visitorFollowUpStatus || 'NEW'}
                      </span>
                    </div>
                    <div className="table-stack">
                      <span><Mail size={14} /> {visitor.email || '—'}</span>
                      <span><Phone size={14} /> {visitor.phoneNumber || '—'}</span>
                    </div>
                  </button>
                )) : <div className="empty-panel">No visitors registered yet.</div>}
              </div>
            </SectionCard>
          </div>

          <SectionCard
            title={selectedVisitor ? `Follow-up Tracker: ${selectedVisitor.fullName}` : 'Follow-up Tracker'}
            subtitle={selectedVisitor ? 'Keep guest follow-up moving without losing context.' : 'Select a visitor from the queue above.'}
            action={selectedVisitor ? <button className="ghost-btn" type="button" onClick={() => openMember(selectedVisitor.id)}>Open full profile</button> : null}
          >
            {selectedVisitor ? (
              canManageGuestsAccess ? (
              <form className="visitor-follow-up-layout" onSubmit={handleVisitorFollowUpSave}>
                <div className="profile-block stack-gap">
                  <div className="mini-row"><span>First visit</span><strong>{selectedVisitor.visitorFirstServiceDate ? formatDate(selectedVisitor.visitorFirstServiceDate) : formatDate(selectedVisitor.joinDate)}</strong></div>
                  <div className="mini-row"><span>Invited by</span><strong>{selectedVisitor.visitorInvitedBy || '—'}</strong></div>
                  <div className="mini-row"><span>How they heard</span><strong>{selectedVisitor.visitorHowHeard || '—'}</strong></div>
                  <div className="mini-row"><span>Address</span><strong>{selectedVisitor.addressFull || '—'}</strong></div>
                </div>

                <div className="profile-block">
                  <div className="form-grid">
                    <label>
                      Follow-up status
                      <select
                        value={visitorFollowUpForm.visitorFollowUpStatus}
                        onChange={(e) => setVisitorFollowUpForm((current) => ({ ...current, visitorFollowUpStatus: e.target.value }))}
                      >
                        <option value="NEW">New</option>
                        <option value="CONTACT_ATTEMPTED">Contact attempted</option>
                        <option value="CONTACTED">Contacted</option>
                        <option value="WELCOMED">Welcomed</option>
                        <option value="JOINED">Joined</option>
                        <option value="CLOSED">Closed</option>
                      </select>
                    </label>
                    <label>
                      Assigned to
                      <input
                        value={visitorFollowUpForm.visitorAssignedTo}
                        onChange={(e) => setVisitorFollowUpForm((current) => ({ ...current, visitorAssignedTo: e.target.value }))}
                        placeholder="Pastoral care, welcome team, or staff name"
                      />
                    </label>
                    <label>
                      Last contacted
                      <input
                        type="date"
                        value={visitorFollowUpForm.visitorLastContactAt}
                        onChange={(e) => setVisitorFollowUpForm((current) => ({ ...current, visitorLastContactAt: e.target.value }))}
                      />
                    </label>
                    <label>
                      Next step
                      <input
                        value={visitorFollowUpForm.visitorNextStep}
                        onChange={(e) => setVisitorFollowUpForm((current) => ({ ...current, visitorNextStep: e.target.value }))}
                        placeholder="Call on Tuesday, invite to newcomers meal"
                      />
                    </label>
                    <label className="span-2">
                      Follow-up notes
                      <textarea
                        rows="4"
                        value={visitorFollowUpForm.visitorFollowUpNotes}
                        onChange={(e) => setVisitorFollowUpForm((current) => ({ ...current, visitorFollowUpNotes: e.target.value }))}
                        placeholder="Conversation summary, prayer needs, family context, or response"
                      />
                    </label>
                    <div className="span-2 form-actions">
                      <button className="primary-btn" type="submit">Save follow-up</button>
                    </div>
                  </div>
                </div>
              </form>
              ) : (
              <div className="profile-block">
                <div className="mini-row"><span>First visit</span><strong>{selectedVisitor.visitorFirstServiceDate ? formatDate(selectedVisitor.visitorFirstServiceDate) : formatDate(selectedVisitor.joinDate)}</strong></div>
                <div className="mini-row"><span>Status</span><strong>{selectedVisitor.visitorFollowUpStatus || 'NEW'}</strong></div>
                <div className="mini-row"><span>Assigned to</span><strong>{selectedVisitor.visitorAssignedTo || '—'}</strong></div>
                <div className="mini-row"><span>Next step</span><strong>{selectedVisitor.visitorNextStep || '—'}</strong></div>
                <div className="empty-panel">Viewer access is read-only.</div>
              </div>
              )
            ) : <div className="empty-panel">No visitor selected yet.</div>}
          </SectionCard>
        </div>
      ) : null}

      <MemberDrawer
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
        onSave={handleMemberSave}
        onAssignLeader={handleAssignLeader}
        onUploadPhoto={handleProfileImageUpload}
        onUploadDocument={handleDocumentUpload}
        onAddNote={handleMemberNote}
        busy={profileBusy}
        assetUrl={api.assetUrl}
        canEdit={canManagePeopleAccess}
        canAssignLeader={canManagePeopleAccess}
        ministryLeaders={ministryLeaders}
      />
    </div>
  );
}
