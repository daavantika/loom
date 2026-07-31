import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { apiFetch, ApiError } from '../lib/api';
import PhotoUpload from '../components/PhotoUpload';

export default function SellerRegistration() {
  const navigate = useNavigate();
  const auth = useAppStore((s) => s.auth);
  const cookProfile = useAppStore((s) => s.cookProfile);
  const cookProfileChecked = useAppStore((s) => s.cookProfileChecked);
  const loadCookStatus = useAppStore((s) => s.loadCookStatus);
  const showToast = useAppStore((s) => s.showToast);

  const [kitchenName, setKitchenName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [area, setArea] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState('5');
  const [bio, setBio] = useState('');
  const [minOrderValueRupees, setMinOrderValueRupees] = useState('0');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [fssaiNumber, setFssaiNumber] = useState('');
  const [fssaiDocUrl, setFssaiDocUrl] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'UPI' | 'BANK'>('UPI');
  const [payoutDetails, setPayoutDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    if (auth) loadCookStatus();
  }, [auth, loadCookStatus]);

  // Pre-fill once from an existing DRAFT/REJECTED application, if any.
  useEffect(() => {
    if (!cookProfileChecked || prefilled || !cookProfile) return;
    setKitchenName(cookProfile.kitchenName ?? '');
    setOwnerName(cookProfile.ownerName ?? '');
    setPhone(cookProfile.phone ?? '');
    setArea(cookProfile.area ?? '');
    setAddressLine(cookProfile.addressLine ?? '');
    if (cookProfile.deliveryRadiusKm) setDeliveryRadiusKm(String(cookProfile.deliveryRadiusKm));
    setBio(cookProfile.bio ?? '');
    setMinOrderValueRupees(String(Math.round((cookProfile.minOrderValuePaise ?? 0) / 100)));
    setPhotoUrls(cookProfile.photos.map((p) => p.url));
    setPrefilled(true);
  }, [cookProfileChecked, cookProfile, prefilled]);

  if (!auth) {
    return (
      <>
        <div className="screen-title">
          <h1>Log in first</h1>
        </div>
        <p style={{ padding: '0 20px', color: 'var(--muted)' }}>Log in or create an account before registering a kitchen.</p>
      </>
    );
  }

  if (cookProfile?.verificationStatus === 'VERIFIED') {
    return (
      <>
        <div className="screen-title">
          <h1>You're already selling</h1>
        </div>
        <p style={{ padding: '0 20px', color: 'var(--muted)' }}>Your kitchen is verified.</p>
        <div className="modal-actions">
          <button className="primary-button" onClick={() => navigate('/cook')}>
            Go to kitchen
          </button>
        </div>
      </>
    );
  }

  if (cookProfile?.status === 'PENDING_VERIFICATION' && cookProfile.verificationStatus === 'PENDING') {
    return (
      <>
        <div className="screen-title">
          <h1>Application under review</h1>
        </div>
        <p style={{ padding: '0 20px', color: 'var(--muted)' }}>
          We're reviewing your kitchen details. You'll be able to start selling as soon as it's approved.
        </p>
      </>
    );
  }

  const submit = async () => {
    setError(null);
    if (!kitchenName.trim() || !ownerName.trim() || !area.trim()) {
      setError('Kitchen name, your name, and area are required.');
      return;
    }
    if (!phone.trim() || phone.trim().length < 8) {
      setError('Add a valid phone number — needed so we can pay you out for online orders.');
      return;
    }
    if (photoUrls.length === 0) {
      setError('Add at least one kitchen photo.');
      return;
    }
    if (!payoutDetails.trim()) {
      setError('Add your UPI ID or bank details so we can pay you out.');
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch('/cooks/onboarding', {
        method: 'POST',
        body: {
          kitchenName: kitchenName.trim(),
          ownerName: ownerName.trim(),
          phone: phone.trim(),
          area: area.trim(),
          addressLine: addressLine.trim() || undefined,
          deliveryRadiusKm: Number(deliveryRadiusKm),
          bio: bio.trim() || undefined,
          minOrderValuePaise: Math.round(Number(minOrderValueRupees) * 100),
          photoUrls,
        },
      });
      await apiFetch('/cooks/onboarding/submit', {
        method: 'POST',
        body: {
          fssaiNumber: fssaiNumber.trim() || undefined,
          fssaiDocUrl: fssaiDocUrl || undefined,
          payoutMethod,
          payoutDetails: payoutDetails.trim(),
        },
      });
      await loadCookStatus();
      showToast('Application submitted — we’ll email you once it’s reviewed');
      navigate('/profile');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit your application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="screen-title">
        <h1>{cookProfile?.verificationStatus === 'REJECTED' ? 'Resubmit your kitchen' : 'Register your kitchen'}</h1>
      </div>
      {cookProfile?.verificationStatus === 'REJECTED' && cookProfile.rejectionReason && (
        <p style={{ padding: '0 20px', color: '#c0392b' }}>Previously rejected: {cookProfile.rejectionReason}</p>
      )}
      <div className="seller-form">
        <label htmlFor="reg-kitchen-name">Kitchen name</label>
        <input id="reg-kitchen-name" value={kitchenName} onChange={(e) => setKitchenName(e.target.value)} placeholder="e.g. Meera's Kitchen" />

        <label htmlFor="reg-owner-name">Your name</label>
        <input id="reg-owner-name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Your full name" />

        <label htmlFor="reg-phone">Phone number</label>
        <input
          id="reg-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="For order updates and payouts"
        />

        <label htmlFor="reg-area">Area</label>
        <input id="reg-area" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Area in Coimbatore" />

        <label htmlFor="reg-address">Address (optional)</label>
        <input id="reg-address" value={addressLine} onChange={(e) => setAddressLine(e.target.value)} placeholder="Street, landmark" />

        <label htmlFor="reg-radius">Delivery radius (km)</label>
        <input
          id="reg-radius"
          type="number"
          min={0.5}
          max={25}
          step={0.5}
          value={deliveryRadiusKm}
          onChange={(e) => setDeliveryRadiusKm(e.target.value)}
        />

        <label htmlFor="reg-bio">About your kitchen (optional)</label>
        <textarea id="reg-bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />

        <label htmlFor="reg-min-order">Minimum order value (₹)</label>
        <input
          id="reg-min-order"
          type="number"
          min={0}
          value={minOrderValueRupees}
          onChange={(e) => setMinOrderValueRupees(e.target.value)}
        />
      </div>

      <div className="section-head seller-head">
        <h2>Kitchen photos</h2>
      </div>
      <div style={{ padding: '0 20px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {photoUrls.map((url) => (
          <div key={url} style={{ position: 'relative' }}>
            <img src={url} alt="Kitchen" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }} />
            <button
              type="button"
              aria-label="Remove photo"
              onClick={() => setPhotoUrls((urls) => urls.filter((u) => u !== url))}
              style={{ position: 'absolute', top: -6, right: -6, borderRadius: '50%', width: 20, height: 20 }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div style={{ padding: '8px 20px' }}>
        <PhotoUpload label="+ Add kitchen photo" onUploaded={(url) => setPhotoUrls((urls) => [...urls, url])} />
      </div>

      <div className="section-head seller-head">
        <h2>Verification</h2>
      </div>
      <div className="seller-form">
        <label htmlFor="reg-fssai">FSSAI license number (optional)</label>
        <input id="reg-fssai" value={fssaiNumber} onChange={(e) => setFssaiNumber(e.target.value)} placeholder="14-digit FSSAI number" />

        <label>FSSAI document (optional)</label>
        {fssaiDocUrl ? (
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            Uploaded ✓ <button onClick={() => setFssaiDocUrl('')}>Remove</button>
          </p>
        ) : (
          <PhotoUpload label="Upload FSSAI document" onUploaded={setFssaiDocUrl} />
        )}

        <label htmlFor="reg-payout-method" style={{ marginTop: 12 }}>
          Payout method
        </label>
        <div className="option-grid">
          {(['UPI', 'BANK'] as const).map((method) => (
            <button
              key={method}
              type="button"
              className={`option${payoutMethod === method ? ' selected' : ''}`}
              onClick={() => setPayoutMethod(method)}
            >
              {method === 'UPI' ? 'UPI' : 'Bank transfer'}
            </button>
          ))}
        </div>

        <label htmlFor="reg-payout-details">{payoutMethod === 'UPI' ? 'UPI ID' : 'Bank account details'}</label>
        <input
          id="reg-payout-details"
          value={payoutDetails}
          onChange={(e) => setPayoutDetails(e.target.value)}
          placeholder={payoutMethod === 'UPI' ? 'yourname@upi' : 'Account number, IFSC'}
        />

        {error && (
          <p style={{ color: '#c0392b', fontSize: 13, marginTop: 8 }} role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="modal-actions">
        <button className="primary-button" onClick={submit} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit for verification'}
        </button>
      </div>
    </>
  );
}
