import React, { useState, useMemo, useRef } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { INDIAN_STATES } from '../../types/user';
import {
  MapPin, Sprout, Calendar, Camera, Edit2, ArrowRight,
  Check, AlertCircle, User, Store,
  IndianRupee, Target, Settings, X
} from 'lucide-react';
import './Profile.css';

// Gujarat District -> Talukas -> Villages mapping
const GUJARAT_LOCATIONS: Record<string, { talukas: string[]; villages: string[] }> = {
  Anand: {
    talukas: ['Anand', 'Petlad', 'Borsad', 'Khambhat', 'Sojitra', 'Tarapur', 'Umreth'],
    villages: ['Changa', 'Dharmaj', 'Karamsad', 'Bakrol', 'Vasad', 'Valasan', 'Mogri'],
  },
  Ahmedabad: {
    talukas: ['Daskroi', 'Sanand', 'Bavla', 'Dholka', 'Viramgam', 'Mandal'],
    villages: ['Bopal', 'Ghuma', 'Changodar', 'Moraiya', 'Vasna'],
  },
  Vadodara: {
    talukas: ['Vadodara', 'Padra', 'Karjan', 'Dabhoi', 'Savli', 'Waghodia'],
    villages: ['Bajwa', 'Chhani', 'Ranoli', 'Koyali', 'Por'],
  },
  Surat: {
    talukas: ['Chorasi', 'Olpad', 'Bardoli', 'Kamrej', 'Mandvi'],
    villages: ['Sayan', 'Kim', 'Palsana', 'Kadodara'],
  },
  Rajkot: {
    talukas: ['Rajkot', 'Gondal', 'Jasdan', 'Jetpur', 'Dhoraji'],
    villages: ['Shapar', 'Ribda', 'Virpur', 'Bhadla'],
  },
  Kheda: {
    talukas: ['Nadiad', 'Kapadvanj', 'Matar', 'Mehmedabad', 'Thasra'],
    villages: ['Vaso', 'Alindra', 'Uttarsanda', 'Kanjari'],
  },
};

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const addToast = useUIStore((s) => s.addToast);

  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  // -------------------------------------------------------------
  // Form State: Personal Information
  // -------------------------------------------------------------
  const [personalForm, setPersonalForm] = useState({
    name: user?.name || 'Ramesh Patel',
    email: user?.email && !user.email.includes('example.com') ? user.email : 'ramesh.patel@gmail.com',
    phone: user?.phone || '+91 98765 43210',
    state: user?.location?.state || 'Gujarat',
    district: user?.location?.district || 'Anand',
    taluka: user?.location?.block || 'Anand',
    village: user?.location?.village || 'Changa',
  });

  // -------------------------------------------------------------
  // Pending Details State: Investment Range & Business Goal
  // By default, pending so 4 of 6 are complete (78% completion)
  // -------------------------------------------------------------
  const [investmentRange, setInvestmentRange] = useState<string>(
    (user as any)?.investmentRange || ''
  );
  const [businessGoal, setBusinessGoal] = useState<string>(user?.businessGoal || '');

  // -------------------------------------------------------------
  // Location cascading options
  // -------------------------------------------------------------
  const currentDistrictData = useMemo(() => {
    return GUJARAT_LOCATIONS[personalForm.district] || GUJARAT_LOCATIONS['Anand'];
  }, [personalForm.district]);

  // -------------------------------------------------------------
  // Dynamic Profile Completion Calculation
  // -------------------------------------------------------------
  const isPersonalComplete = Boolean(
    personalForm.name.trim() && personalForm.email.trim() && personalForm.phone.trim()
  );
  const isLocationComplete = Boolean(
    personalForm.state.trim() && personalForm.district.trim() && personalForm.village.trim()
  );
  const isBusinessInfoComplete = Boolean(user?.businessInterest || 'dairy');
  const isInvestmentComplete = Boolean(investmentRange.trim());
  const isGoalComplete = Boolean(businessGoal.trim());
  const isPreferencesComplete = true; // Default system preferences active

  const completedCount = useMemo(() => {
    let count = 0;
    if (isPersonalComplete) count++;
    if (isLocationComplete) count++;
    if (isBusinessInfoComplete) count++;
    if (isInvestmentComplete) count++;
    if (isGoalComplete) count++;
    if (isPreferencesComplete) count++;
    return count;
  }, [
    isPersonalComplete,
    isLocationComplete,
    isBusinessInfoComplete,
    isInvestmentComplete,
    isGoalComplete,
    isPreferencesComplete,
  ]);

  // 78% when 4 of 6 completed, 89% when 5 of 6, 100% when 6 of 6 completed
  const completionPercentage = useMemo(() => {
    let pct = 0;
    if (isPersonalComplete) pct += 22;
    if (isLocationComplete) pct += 22;
    if (isBusinessInfoComplete) pct += 18;
    if (isPreferencesComplete) pct += 16;
    if (isInvestmentComplete) pct += 11;
    if (isGoalComplete) pct += 11;
    return Math.min(100, pct);
  }, [
    isPersonalComplete,
    isLocationComplete,
    isBusinessInfoComplete,
    isPreferencesComplete,
    isInvestmentComplete,
    isGoalComplete,
  ]);

  // Missing details list
  const pendingDetailsList = useMemo(() => {
    const list: string[] = [];
    if (!isInvestmentComplete) list.push('Investment Range');
    if (!isGoalComplete) list.push('Business Goal');
    return list;
  }, [isInvestmentComplete, isGoalComplete]);

  // Formatted location display
  const locationDisplay = useMemo(() => {
    const parts = [personalForm.village, personalForm.district, personalForm.state].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Changa, Anand, Gujarat';
  }, [personalForm.village, personalForm.district, personalForm.state]);

  // Business Category display
  const businessCategoryDisplay = useMemo(() => {
    const interest = user?.businessInterest || 'dairy';
    if (interest === 'dairy') return 'Dairy / Milk Products';
    if (interest === 'agriculture') return 'Agriculture / Food Processing';
    if (interest === 'retail') return 'Retail & Rural Kirana';
    if (interest === 'textile') return 'Handloom & Textile';
    return interest.charAt(0).toUpperCase() + interest.slice(1);
  }, [user?.businessInterest]);

  // Member Since display
  const memberSinceDisplay = useMemo(() => {
    if (!user?.createdAt) return 'Sep 2026';
    try {
      const d = new Date(user.createdAt);
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch {
      return 'Sep 2026';
    }
  }, [user?.createdAt]);

  // -------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------
  const handleToggleEdit = () => {
    setIsEditing((prev) => !prev);
    if (!isEditing) {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      updateUser({
        name: personalForm.name,
        email: personalForm.email,
        phone: personalForm.phone,
        location: {
          state: personalForm.state,
          district: personalForm.district,
          block: personalForm.taluka,
          village: personalForm.village,
        },
      });

      setIsEditing(false);
      addToast({ type: 'success', message: 'Profile updated successfully!' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      addToast({ type: 'error', message: msg });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSavePendingDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!investmentRange && !businessGoal) {
      addToast({ type: 'error', message: 'Please select an investment range or goal.' });
      return;
    }

    let capNum = 200000;
    if (investmentRange.includes('50,000')) capNum = 75000;
    else if (investmentRange.includes('1–3')) capNum = 200000;
    else if (investmentRange.includes('3–5') || investmentRange.includes('1–5')) capNum = 400000;
    else if (investmentRange.includes('5–10')) capNum = 750000;
    else if (investmentRange.includes('10')) capNum = 1200000;

    updateUser({
      capital: capNum,
      businessGoal: businessGoal || 'Business Expansion',
      investmentRange,
    } as any);

    setShowCompletionModal(false);
    addToast({ type: 'success', message: 'Profile details saved! Your profile completion increased.' });
  };

  return (
    <div className="prof-page page-enter">
      {/* =========================================================
          A. PAGE HEADER: Title + Compact Rural Banner
          ========================================================= */}
      <div className="prof-header">
        <div className="prof-header__left">
          <h1 className="prof-header__title">My Profile</h1>
          <p className="prof-header__subtitle">
            Manage your personal information and keep your profile up to date.
          </p>
        </div>

        <div className="prof-header__banner" role="img" aria-label="Empowered Entrepreneurs Stronger Villages">
          <img
            src="/profile-empowered-banner.png"
            alt="Empowered Entrepreneurs Stronger Villages"
            className="prof-header__banner-img"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/dashboard-banner.png';
            }}
          />
        </div>
      </div>

      {/* =========================================================
          B. & C. TOP ROW: Profile Summary Card + Profile Completion
          ========================================================= */}
      <div className="prof-top-row">
        {/* Card 1: Spacious Profile Summary Card */}
        <div className="prof-summary-card">
          <div className="prof-summary-card__left">
            <div className="prof-summary-card__avatar-wrap">
              <div className="prof-summary-card__avatar-ring">
                <img
                  src="/ramesh-avatar.png"
                  alt={personalForm.name}
                  className="prof-summary-card__avatar-img"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/logo-icon.png';
                  }}
                />
                <button
                  type="button"
                  className="prof-summary-card__camera-btn"
                  onClick={() => addToast({ type: 'info', message: 'Photo upload dialog' })}
                  aria-label="Change profile photo"
                  title="Change photo"
                >
                  <Camera size={12} />
                </button>
              </div>
            </div>

            <div className="prof-summary-card__info">
              <div className="prof-summary-card__name-row">
                <h2 className="prof-summary-card__name">{personalForm.name}</h2>
                <span className="prof-summary-card__check-badge" title="Verified Account">
                  <Check size={12} strokeWidth={3} />
                </span>
              </div>
              <div className="prof-summary-card__role">Entrepreneur</div>

              <div className="prof-summary-card__meta-list">
                <div className="prof-summary-card__meta-item">
                  <MapPin size={13} className="prof-summary-card__meta-icon" />
                  <span>{locationDisplay}</span>
                </div>
                <div className="prof-summary-card__meta-item">
                  <Sprout size={13} className="prof-summary-card__meta-icon text-green" />
                  <span>{businessCategoryDisplay}</span>
                </div>
                <div className="prof-summary-card__meta-item">
                  <Calendar size={13} className="prof-summary-card__meta-icon" />
                  <span>Member Since {memberSinceDisplay}</span>
                </div>
              </div>

              <div className="prof-summary-card__badge-wrap">
                <span className="prof-summary-card__verified-badge">
                  <Check size={11} strokeWidth={3} />
                  <span>Verified Entrepreneur</span>
                </span>
              </div>
            </div>
          </div>

          <div className="prof-summary-card__right">
            <div className="prof-summary-card__quote-box">
              <p className="prof-summary-card__quote">
                "Small Steps Today,<br />A Prosperous<br />Tomorrow."
              </p>
              <svg
                className="prof-summary-card__leaf"
                width="18"
                height="18"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <path d="M4 16C3.5 10 7.5 4 15 3C15 10.5 9 14.5 4 16Z" fill="#16834A" />
                <path d="M10 11C11.5 8 14 6.5 18 6C18 9.5 16 12 12.5 12.5" fill="#2E7D32" />
                <path d="M5 15C8 12 11 8.5 14 4.5" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" opacity="0.65" />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 2: Profile Completion Card */}
        <div className="prof-completion-card">
          <div className="prof-completion-card__top">
            <h3 className="prof-completion-card__title">Profile Completion</h3>
            <span className="prof-completion-card__pill">
              {completionPercentage}% Complete
            </span>
          </div>

          {/* Horizontal Progress Bar */}
          <div className="prof-completion-card__bar-wrap">
            <div
              className="prof-completion-card__bar-fill"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>

          <p className="prof-completion-card__desc">
            You're almost there! Complete your profile to get better scheme matches, financial support and personalized guidance.
          </p>

          <div className="prof-completion-card__bottom">
            {pendingDetailsList.length > 0 ? (
              <div className="prof-completion-card__alert">
                <AlertCircle size={15} className="prof-completion-card__alert-icon" />
                <div className="prof-completion-card__alert-text">
                  <span className="prof-completion-card__alert-title">
                    {pendingDetailsList.length} important {pendingDetailsList.length === 1 ? 'detail' : 'details'} remaining
                  </span>
                  <span className="prof-completion-card__alert-sub">
                    {pendingDetailsList.join(', ')}
                  </span>
                </div>
              </div>
            ) : (
              <div className="prof-completion-card__alert prof-completion-card__alert--success">
                <span className="prof-status-dot prof-status-dot--completed">✓</span>
                <div className="prof-completion-card__alert-text">
                  <span className="prof-completion-card__alert-title text-green">
                    All details completed!
                  </span>
                  <span className="prof-completion-card__alert-sub">
                    Your profile is fully optimized
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              className="prof-completion-card__cta-btn"
              onClick={() => setShowCompletionModal(true)}
            >
              <span>Complete Profile</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================
          D. COMPLETE YOUR PROFILE: 6 Horizontal Status Cards
          ========================================================= */}
      <div className="prof-breakdown-section">
        <div className="prof-breakdown-section__header">
          <div className="prof-breakdown-section__title-wrap">
            <div className="prof-breakdown-section__icon-badge">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#078B4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
            </div>
            <div>
              <h3 className="prof-breakdown-section__title">Complete Your Profile</h3>
              <p className="prof-breakdown-section__subtitle">
                Fill in the remaining details to unlock more opportunities.
              </p>
            </div>
          </div>
          <div className="prof-breakdown-section__counter">
            {completedCount} of 6 completed
          </div>
        </div>

        <div className="prof-breakdown-grid">
          {/* 1. Personal Information */}
          <div
            className="prof-status-card"
            onClick={handleToggleEdit}
            role="button"
            tabIndex={0}
            title="Click to edit personal details"
          >
            <span className="prof-status-dot prof-status-dot--completed">✓</span>
            <div className="prof-status-card__icon-wrap prof-status-card__icon-wrap--green">
              <User size={17} />
            </div>
            <div className="prof-status-card__info">
              <h4 className="prof-status-card__title">Personal Information</h4>
              <p className="prof-status-card__subtitle">Basic details</p>
            </div>
          </div>

          {/* 2. Location Details */}
          <div
            className="prof-status-card"
            onClick={handleToggleEdit}
            role="button"
            tabIndex={0}
            title="Click to edit location"
          >
            <span className="prof-status-dot prof-status-dot--completed">✓</span>
            <div className="prof-status-card__icon-wrap prof-status-card__icon-wrap--green">
              <MapPin size={17} />
            </div>
            <div className="prof-status-card__info">
              <h4 className="prof-status-card__title">Location Details</h4>
              <p className="prof-status-card__subtitle">State, District, Village</p>
            </div>
          </div>

          {/* 3. Business Information */}
          <div
            className="prof-status-card"
            onClick={() => addToast({ type: 'info', message: 'Category: ' + businessCategoryDisplay })}
            role="button"
            tabIndex={0}
          >
            <span className="prof-status-dot prof-status-dot--completed">✓</span>
            <div className="prof-status-card__icon-wrap prof-status-card__icon-wrap--green">
              <Store size={17} />
            </div>
            <div className="prof-status-card__info">
              <h4 className="prof-status-card__title">Business Information</h4>
              <p className="prof-status-card__subtitle">Business type & products</p>
            </div>
          </div>

          {/* 4. Investment Range */}
          <div
            className={`prof-status-card ${!isInvestmentComplete ? 'prof-status-card--pending' : ''}`}
            onClick={() => setShowCompletionModal(true)}
            role="button"
            tabIndex={0}
            title={isInvestmentComplete ? 'Investment range set' : 'Click to add investment range'}
          >
            {isInvestmentComplete ? (
              <span className="prof-status-dot prof-status-dot--completed">✓</span>
            ) : (
              <span className="prof-status-dot prof-status-dot--pending">!</span>
            )}
            <div className={`prof-status-card__icon-wrap ${isInvestmentComplete ? 'prof-status-card__icon-wrap--green' : 'prof-status-card__icon-wrap--orange'}`}>
              <IndianRupee size={17} />
            </div>
            <div className="prof-status-card__info">
              <h4 className="prof-status-card__title">Investment Range</h4>
              <p className="prof-status-card__subtitle">
                {investmentRange || 'Add investment range'}
              </p>
            </div>
          </div>

          {/* 5. Business Goal */}
          <div
            className={`prof-status-card ${!isGoalComplete ? 'prof-status-card--pending' : ''}`}
            onClick={() => setShowCompletionModal(true)}
            role="button"
            tabIndex={0}
            title={isGoalComplete ? 'Business goal set' : 'Click to tell us your goal'}
          >
            {isGoalComplete ? (
              <span className="prof-status-dot prof-status-dot--completed">✓</span>
            ) : (
              <span className="prof-status-dot prof-status-dot--pending">!</span>
            )}
            <div className={`prof-status-card__icon-wrap ${isGoalComplete ? 'prof-status-card__icon-wrap--green' : 'prof-status-card__icon-wrap--orange'}`}>
              <Target size={17} />
            </div>
            <div className="prof-status-card__info">
              <h4 className="prof-status-card__title">Business Goal</h4>
              <p className="prof-status-card__subtitle">
                {businessGoal || 'Tell us your goal'}
              </p>
            </div>
          </div>

          {/* 6. Preferences */}
          <div
            className="prof-status-card"
            onClick={() => addToast({ type: 'info', message: 'Preferences configured' })}
            role="button"
            tabIndex={0}
          >
            <span className="prof-status-dot prof-status-dot--completed">✓</span>
            <div className="prof-status-card__icon-wrap prof-status-card__icon-wrap--green">
              <Settings size={17} />
            </div>
            <div className="prof-status-card__info">
              <h4 className="prof-status-card__title">Preferences</h4>
              <p className="prof-status-card__subtitle">Your preferences</p>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          E. PERSONAL INFORMATION: Main Form Card
          ========================================================= */}
      <div className="prof-form-card">
        <div className="prof-form-card__header">
          <div className="prof-form-card__title-wrap">
            <div className="prof-form-card__icon-badge">
              <User size={18} className="text-green" />
            </div>
            <div>
              <h3 className="prof-form-card__title">Personal Information</h3>
              <p className="prof-form-card__subtitle">
                Your basic details and contact information.
              </p>
            </div>
          </div>

          <button
            type="button"
            className={`prof-form-card__edit-btn ${isEditing ? 'prof-form-card__edit-btn--active' : ''}`}
            onClick={handleToggleEdit}
          >
            <Edit2 size={14} />
            <span>{isEditing ? 'Cancel' : 'Edit'}</span>
          </button>
        </div>

        <form ref={formRef} onSubmit={handleUpdateProfile} className="prof-form">
          <div className="prof-form__grid">
            {/* Row 1: Full Name & Email Address */}
            <div className="prof-form__field">
              <label className="prof-form__label">Full Name</label>
              <input
                type="text"
                className={`prof-form__input ${!isEditing ? 'prof-form__input--readonly' : ''}`}
                value={personalForm.name}
                onChange={(e) => setPersonalForm({ ...personalForm, name: e.target.value })}
                placeholder="Ramesh Patel"
                readOnly={!isEditing}
                required
              />
            </div>

            <div className="prof-form__field">
              <label className="prof-form__label">Email Address</label>
              <input
                type="email"
                className={`prof-form__input ${!isEditing ? 'prof-form__input--readonly' : ''}`}
                value={personalForm.email}
                onChange={(e) => setPersonalForm({ ...personalForm, email: e.target.value })}
                placeholder="ramesh.patel@gmail.com"
                readOnly={!isEditing}
                required
              />
            </div>

            {/* Row 2: Mobile Number & State */}
            <div className="prof-form__field">
              <label className="prof-form__label">Mobile Number</label>
              <input
                type="text"
                className={`prof-form__input ${!isEditing ? 'prof-form__input--readonly' : ''}`}
                value={personalForm.phone}
                onChange={(e) => setPersonalForm({ ...personalForm, phone: e.target.value })}
                placeholder="+91 98765 43210"
                readOnly={!isEditing}
                required
              />
            </div>

            <div className="prof-form__field">
              <label className="prof-form__label">State</label>
              {isEditing ? (
                <select
                  className="prof-form__select"
                  value={personalForm.state}
                  onChange={(e) => setPersonalForm({ ...personalForm, state: e.target.value })}
                >
                  <option value="Gujarat">Gujarat</option>
                  {INDIAN_STATES.filter((s) => s !== 'Gujarat').map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="prof-form__select-wrap">
                  <input
                    type="text"
                    className="prof-form__input prof-form__input--readonly"
                    value={personalForm.state}
                    readOnly
                  />
                  <span className="prof-form__select-arrow">▾</span>
                </div>
              )}
            </div>
          </div>

          {/* Row 3: District, Taluka, Village (3 columns on desktop) */}
          <div className="prof-form__grid prof-form__grid--three">
            <div className="prof-form__field">
              <label className="prof-form__label">District</label>
              {isEditing ? (
                <select
                  className="prof-form__select"
                  value={personalForm.district}
                  onChange={(e) => {
                    const newDist = e.target.value;
                    const talukas = GUJARAT_LOCATIONS[newDist]?.talukas || ['Anand'];
                    const villages = GUJARAT_LOCATIONS[newDist]?.villages || ['Changa'];
                    setPersonalForm({
                      ...personalForm,
                      district: newDist,
                      taluka: talukas[0],
                      village: villages[0],
                    });
                  }}
                >
                  {Object.keys(GUJARAT_LOCATIONS).map((dist) => (
                    <option key={dist} value={dist}>
                      {dist}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="prof-form__select-wrap">
                  <input
                    type="text"
                    className="prof-form__input prof-form__input--readonly"
                    value={personalForm.district}
                    readOnly
                  />
                  <span className="prof-form__select-arrow">▾</span>
                </div>
              )}
            </div>

            <div className="prof-form__field">
              <label className="prof-form__label">Taluka</label>
              {isEditing ? (
                <select
                  className="prof-form__select"
                  value={personalForm.taluka}
                  onChange={(e) => setPersonalForm({ ...personalForm, taluka: e.target.value })}
                >
                  {currentDistrictData.talukas.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="prof-form__select-wrap">
                  <input
                    type="text"
                    className="prof-form__input prof-form__input--readonly"
                    value={personalForm.taluka}
                    readOnly
                  />
                  <span className="prof-form__select-arrow">▾</span>
                </div>
              )}
            </div>

            <div className="prof-form__field">
              <label className="prof-form__label">Village</label>
              {isEditing ? (
                <select
                  className="prof-form__select"
                  value={personalForm.village}
                  onChange={(e) => setPersonalForm({ ...personalForm, village: e.target.value })}
                >
                  {currentDistrictData.villages.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="prof-form__select-wrap">
                  <input
                    type="text"
                    className="prof-form__input prof-form__input--readonly"
                    value={personalForm.village}
                    readOnly
                  />
                  <span className="prof-form__select-arrow">▾</span>
                </div>
              )}
            </div>
          </div>

          {/* Update Profile Button at bottom right when editing */}
          {isEditing && (
            <div className="prof-form__actions">
              <button
                type="submit"
                className="prof-form__submit-btn"
                disabled={isUpdating}
              >
                {isUpdating ? 'Updating...' : 'Update Profile'}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* =========================================================
          F. PENDING DETAILS MODAL: Investment Range & Goal
          ========================================================= */}
      {showCompletionModal && (
        <div className="prof-modal-overlay" onClick={() => setShowCompletionModal(false)}>
          <div
            className="prof-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="completion-modal-title"
          >
            <div className="prof-modal-card__header">
              <div className="prof-modal-card__title-wrap">
                <div className="prof-modal-card__icon-badge">
                  <Target size={20} className="text-green" />
                </div>
                <div>
                  <h3 id="completion-modal-title" className="prof-modal-card__title">
                    Complete Remaining Details
                  </h3>
                  <p className="prof-modal-card__subtitle">
                    Add your investment range and business goal to unlock personalized scheme matching.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="prof-modal-card__close-btn"
                onClick={() => setShowCompletionModal(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePendingDetails} className="prof-modal-card__form">
              <div className="prof-form__field">
                <label className="prof-form__label">
                  Investment Range <span className="prof-required">*</span>
                </label>
                <select
                  className="prof-form__select"
                  value={investmentRange}
                  onChange={(e) => setInvestmentRange(e.target.value)}
                  required
                >
                  <option value="">Select your available capital</option>
                  <option value="₹50,000 – ₹1 Lakh">₹50,000 – ₹1 Lakh (Micro)</option>
                  <option value="₹1–3 Lakh">₹1–3 Lakh (Small Rural Startup)</option>
                  <option value="₹1–5 Lakh">₹1–5 Lakh (Standard Feasibility)</option>
                  <option value="₹5–10 Lakh">₹5–10 Lakh (Commercial Farm/Unit)</option>
                  <option value="₹10 Lakh+">₹10 Lakh+ (Scale Entrepreneur)</option>
                </select>
              </div>

              <div className="prof-form__field">
                <label className="prof-form__label">
                  Business Goal <span className="prof-required">*</span>
                </label>
                <select
                  className="prof-form__select"
                  value={businessGoal}
                  onChange={(e) => setBusinessGoal(e.target.value)}
                  required
                >
                  <option value="">Select your primary goal</option>
                  <option value="Business Expansion">Business Expansion</option>
                  <option value="New Rural Startup">New Rural Startup</option>
                  <option value="Modernization & Tech">Modernization & Tech Upgrade</option>
                  <option value="Market Linkage & Mandi Sales">Market Linkage & Mandi Sales</option>
                  <option value="Government Scheme Funding">Apply for Government Scheme Subsidy</option>
                </select>
              </div>

              <div className="prof-modal-card__actions">
                <button
                  type="button"
                  className="prof-modal-card__cancel-btn"
                  onClick={() => setShowCompletionModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="prof-form__submit-btn">
                  Save & Complete (100%)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
