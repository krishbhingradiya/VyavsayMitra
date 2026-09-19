import { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { INDIAN_STATES } from '../../types/user';
import './Profile.css';

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const addToast = useUIStore((s) => s.addToast);

  const [activeTab, setActiveTab] = useState<'personal' | 'business' | 'preferences' | 'security'>('personal');

  const [form, setForm] = useState({
    name: user?.name || 'Ramesh Patel',
    email: user?.email || 'ramesh.patel@gmail.com',
    phone: user?.phone || '+91 98765 43210',
    state: user?.location?.state || 'Gujarat',
    district: user?.location?.district || 'Anand',
    taluka: user?.location?.block || 'Petlad',
    village: user?.location?.village || 'Changa',
  });

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({
      name: form.name,
      email: form.email,
      phone: form.phone,
      location: {
        state: form.state,
        district: form.district,
        block: form.taluka,
        village: form.village,
      },
    });
    addToast({ type: 'success', message: 'Profile updated successfully!' });
  };

  return (
    <div className="prof-page page-enter">
      {/* Page Header */}
      <div className="prof-page__header">
        <h1 className="prof-page__title">My Profile</h1>
        <p className="prof-page__subtitle">Manage your personal information and preferences.</p>
      </div>

      {/* Tabs */}
      <div className="prof-page__tabs">
        <button
          type="button"
          className={`prof-page__tab ${activeTab === 'personal' ? 'prof-page__tab--active' : ''}`}
          onClick={() => setActiveTab('personal')}
        >
          Personal Information
        </button>
        <button
          type="button"
          className={`prof-page__tab ${activeTab === 'business' ? 'prof-page__tab--active' : ''}`}
          onClick={() => setActiveTab('business')}
        >
          Business Information
        </button>
        <button
          type="button"
          className={`prof-page__tab ${activeTab === 'preferences' ? 'prof-page__tab--active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          Preferences
        </button>
        <button
          type="button"
          className={`prof-page__tab ${activeTab === 'security' ? 'prof-page__tab--active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          Security
        </button>
      </div>

      {/* Main Profile Card */}
      <div className="prof-card">
        {/* Left Column: Avatar & Role */}
        <div className="prof-card__left">
          <div className="prof-card__avatar-wrap">
            <img
              src="/ramesh-avatar.png"
              alt={form.name}
              className="prof-card__avatar-img"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <h2 className="prof-card__name">{form.name}</h2>
          <span className="prof-card__role">Entrepreneur</span>
          <button
            type="button"
            className="prof-card__change-btn"
            onClick={() => addToast({ type: 'info', message: 'Photo upload dialog' })}
          >
            Change Photo
          </button>
        </div>

        {/* Right Column: Profile Form */}
        <div className="prof-card__right">
          <form onSubmit={handleUpdate}>
            <div className="prof-form-grid">
              {/* Full Name */}
              <div className="prof-form-group">
                <label className="prof-form-label">Full Name</label>
                <input
                  type="text"
                  className="prof-form-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ramesh Patel"
                  required
                />
              </div>

              {/* Email Address */}
              <div className="prof-form-group">
                <label className="prof-form-label">Email Address</label>
                <input
                  type="email"
                  className="prof-form-input"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="ramesh.patel@gmail.com"
                  required
                />
              </div>

              {/* Mobile Number */}
              <div className="prof-form-group">
                <label className="prof-form-label">Mobile Number</label>
                <input
                  type="text"
                  className="prof-form-input"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  required
                />
              </div>

              {/* State */}
              <div className="prof-form-group">
                <label className="prof-form-label">State</label>
                <select
                  className="prof-form-select"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                >
                  <option value="Gujarat">Gujarat</option>
                  {INDIAN_STATES.filter((s) => s !== 'Gujarat').map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* District */}
              <div className="prof-form-group">
                <label className="prof-form-label">District</label>
                <select
                  className="prof-form-select"
                  value={form.district}
                  onChange={(e) => setForm({ ...form, district: e.target.value })}
                >
                  <option value="Anand">Anand</option>
                  <option value="Ahmedabad">Ahmedabad</option>
                  <option value="Vadodara">Vadodara</option>
                  <option value="Surat">Surat</option>
                  <option value="Rajkot">Rajkot</option>
                  <option value="Kheda">Kheda</option>
                  <option value="Mehsana">Mehsana</option>
                </select>
              </div>

              {/* Taluka */}
              <div className="prof-form-group">
                <label className="prof-form-label">Taluka</label>
                <select
                  className="prof-form-select"
                  value={form.taluka}
                  onChange={(e) => setForm({ ...form, taluka: e.target.value })}
                >
                  <option value="Petlad">Petlad</option>
                  <option value="Anand">Anand</option>
                  <option value="Borsad">Borsad</option>
                  <option value="Khambhat">Khambhat</option>
                  <option value="Sojitra">Sojitra</option>
                  <option value="Tarapur">Tarapur</option>
                  <option value="Umreth">Umreth</option>
                </select>
              </div>

              {/* Village */}
              <div className="prof-form-group">
                <label className="prof-form-label">Village</label>
                <select
                  className="prof-form-select"
                  value={form.village}
                  onChange={(e) => setForm({ ...form, village: e.target.value })}
                >
                  <option value="Changa">Changa</option>
                  <option value="Dharmaj">Dharmaj</option>
                  <option value="Karamsad">Karamsad</option>
                  <option value="Bakrol">Bakrol</option>
                  <option value="Vasad">Vasad</option>
                  <option value="Valasan">Valasan</option>
                </select>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="prof-form-actions">
              <button type="submit" className="prof-update-btn">
                Update Profile
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
