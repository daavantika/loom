import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import EmptyState from '../components/EmptyState';
import type { AdminTab } from '../data/types';

const TABS: AdminTab[] = ['Needs review', 'All cooks', 'Hygiene', 'Orders'];

const VERIFICATION_LABEL: Record<string, string> = {
  NONE: 'Not submitted',
  PENDING: 'Pending review',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
};

function NeedsReview() {
  const cases = useAppStore((s) => s.moderationCases);
  const loading = useAppStore((s) => s.moderationCasesLoading);
  const loadModerationCases = useAppStore((s) => s.loadModerationCases);
  const approveModerationCase = useAppStore((s) => s.approveModerationCase);
  const rejectModerationCase = useAppStore((s) => s.rejectModerationCase);

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    loadModerationCases();
  }, [loadModerationCases]);

  const approve = async (caseId: string) => {
    setBusyId(caseId);
    await approveModerationCase(caseId);
    setBusyId(null);
  };

  const confirmReject = async (caseId: string) => {
    if (!reason.trim()) return;
    setBusyId(caseId);
    await rejectModerationCase(caseId, reason.trim());
    setBusyId(null);
    setRejectingId(null);
    setReason('');
  };

  if (loading && cases.length === 0) {
    return <p style={{ color: 'var(--muted)', fontSize: 13 }}>Loading applications…</p>;
  }
  if (cases.length === 0) {
    return <EmptyState icon="▣" title="All caught up" body="No kitchen applications need review right now." />;
  }

  return (
    <>
      {cases.map((c) => (
        <article className="moderation-row" key={c.id}>
          <div className="mod-top">
            <h3>{c.cook?.kitchenName ?? 'Unknown kitchen'}</h3>
            <span className="status">{c.status}</span>
          </div>
          <p>
            {c.cook?.ownerName} · {c.cook?.area}
            {c.cook?.deliveryRadiusKm ? ` · ${c.cook.deliveryRadiusKm}km radius` : ''}
          </p>
          {c.cook?.bio && <p>{c.cook.bio}</p>}
          {c.cook?.photos && c.cook.photos.length > 0 && (
            <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
              {c.cook.photos.map((url) => (
                <img key={url} src={url} alt={c.cook?.kitchenName} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }} />
              ))}
            </div>
          )}
          {c.verification && (
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              FSSAI: {c.verification.fssaiNumber || 'not provided'} · Payout: {c.verification.payoutMethod}
              {c.verification.type === 'RENEWAL' ? ' · Resubmission' : ''}
            </p>
          )}
          {rejectingId === c.id ? (
            <div className="filter-block">
              <input
                className="address-input"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for rejection"
                autoFocus
              />
              <footer style={{ marginTop: 8 }}>
                <button onClick={() => confirmReject(c.id)} disabled={busyId === c.id || !reason.trim()}>
                  Confirm reject
                </button>
                <button className="outline-button" onClick={() => setRejectingId(null)}>
                  Cancel
                </button>
              </footer>
            </div>
          ) : (
            <footer>
              <button onClick={() => approve(c.id)} disabled={busyId === c.id}>
                Approve verification
              </button>
              <button className="review" onClick={() => setRejectingId(c.id)} disabled={busyId === c.id}>
                Reject
              </button>
            </footer>
          )}
        </article>
      ))}
    </>
  );
}

function AllCooks() {
  const cooks = useAppStore((s) => s.allCooks);
  const loading = useAppStore((s) => s.allCooksLoading);
  const loadAllCooks = useAppStore((s) => s.loadAllCooks);

  useEffect(() => {
    loadAllCooks();
  }, [loadAllCooks]);

  if (loading && cooks.length === 0) {
    return <p style={{ color: 'var(--muted)', fontSize: 13 }}>Loading cooks…</p>;
  }
  if (cooks.length === 0) {
    return <EmptyState icon="▣" title="No cooks yet" body="No one has started onboarding as a cook yet." />;
  }

  return (
    <>
      {cooks.map((c) => (
        <article className="moderation-row" key={c.id}>
          <div className="mod-top">
            <h3>{c.kitchenName ?? 'Unnamed kitchen'}</h3>
            <span className="status">{VERIFICATION_LABEL[c.verificationStatus] ?? c.verificationStatus}</span>
          </div>
          <p>
            {c.ownerName ?? 'Unknown owner'} · {c.area ?? 'no area set'} · {c.status === 'DRAFT' ? 'Draft' : 'Submitted'}
          </p>
          {c.phone && <p style={{ fontSize: 13, color: 'var(--muted)' }}>{c.phone}</p>}
          {c.photos.length > 0 && (
            <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
              {c.photos.map((url) => (
                <img key={url} src={url} alt={c.kitchenName} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }} />
              ))}
            </div>
          )}
          {c.rejectionReason && (
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>Rejection reason: {c.rejectionReason}</p>
          )}
        </article>
      ))}
    </>
  );
}

export default function Admin() {
  const navigate = useNavigate();
  const auth = useAppStore((s) => s.auth);
  const adminTab = useAppStore((s) => s.adminTab);
  const setAdminTab = useAppStore((s) => s.setAdminTab);

  useEffect(() => {
    if (!auth || auth.role !== 'ADMIN') {
      navigate('/');
    }
  }, [auth, navigate]);

  if (!auth || auth.role !== 'ADMIN') {
    return null;
  }

  return (
    <>
      <div className="dashboard-greeting">
        <div>
          <p className="eyebrow">LOOM trust desk</p>
          <h1>
            Community,
            <br />
            looked after.
          </h1>
        </div>
        <button onClick={() => navigate('/')}>Exit desk</button>
      </div>
      <div className="admin-tabs">
        {TABS.map((tab) => (
          <button key={tab} className={adminTab === tab ? 'active' : ''} onClick={() => setAdminTab(tab)}>
            {tab}
          </button>
        ))}
      </div>
      <section>
        {adminTab === 'Needs review' ? (
          <NeedsReview />
        ) : adminTab === 'All cooks' ? (
          <AllCooks />
        ) : (
          <EmptyState
            icon="▣"
            title="Not available yet"
            body={`There's no backend support for ${adminTab.toLowerCase()} cases yet.`}
          />
        )}
      </section>
    </>
  );
}
