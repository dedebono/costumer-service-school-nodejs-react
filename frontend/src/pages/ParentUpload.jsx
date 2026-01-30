import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { XCircle, Clock, Save, Upload, FolderOpen, Info, CheckCircle, FileEdit, CreditCard, FileText, Users, GraduationCap, ClipboardList, Camera, Paperclip, Check } from 'lucide-react';
import './ParentUpload.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function ParentUpload() {
    const { token } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expired, setExpired] = useState(false);
    const [applicant, setApplicant] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [expiresAt, setExpiresAt] = useState(null);
    const [timeLeft, setTimeLeft] = useState('');
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        nisn: '',
        birthdate: '',
        parent_phone: '',
        email: '',
        address: '',
        notes: ''
    });

    // Fetch applicant data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`${API_URL}/api/parent-upload/${token}`);
                const data = await res.json();

                if (!res.ok) {
                    if (data.expired) {
                        setExpired(true);
                    }
                    throw new Error(data.message || 'Gagal memuat data');
                }

                setApplicant(data.applicant);
                setDocuments(data.documents || []);
                setExpiresAt(new Date(data.expires_at));
                setFormData({
                    name: data.applicant.name || '',
                    nisn: data.applicant.nisn || '',
                    birthdate: data.applicant.birthdate ? data.applicant.birthdate.split('T')[0] : '',
                    parent_phone: data.applicant.parent_phone || '',
                    email: data.applicant.email || '',
                    address: data.applicant.address || '',
                    notes: data.applicant.notes || ''
                });
            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [token]);

    // Countdown timer
    useEffect(() => {
        if (!expiresAt) return;

        const updateTimer = () => {
            const now = new Date();
            const diff = expiresAt - now;

            if (diff <= 0) {
                setExpired(true);
                setTimeLeft('Waktu habis');
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft(`${hours}j ${minutes}m ${seconds}d`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [expiresAt]);

    // Handle form input change
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Save form data
    const handleSaveData = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await fetch(`${API_URL}/api/parent-upload/${token}/data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Gagal menyimpan data');
            }

            setSuccess('Data berhasil disimpan! Petugas akan mereview perubahan Anda.');
        } catch (e) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    // Handle file upload
    const handleFileUpload = async (e, docKey) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            setError('Ukuran file maksimal 10MB');
            return;
        }

        setUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('doc_key', docKey);

            const res = await fetch(`${API_URL}/api/parent-upload/${token}/upload`, {
                method: 'POST',
                body: formData
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Gagal mengupload file');
            }

            // Add to documents list
            setDocuments(prev => [...prev, {
                id: data.document.id,
                doc_key: data.document.doc_key,
                original_filename: data.document.filename,
                status: 'pending'
            }]);

            setSuccess(`File "${file.name}" berhasil diupload!`);
            e.target.value = ''; // Reset input
        } catch (e) {
            setError(e.message);
        } finally {
            setUploading(false);
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className="parent-upload-page">
                <div className="parent-upload-container">
                    <div className="loading-spinner">Memuat data...</div>
                </div>
            </div>
        );
    }

    // Expired state
    if (expired) {
        return (
            <div className="parent-upload-page">
                <div className="parent-upload-container">
                    <div className="parent-upload-card">
                        <div className="expired-notice">
                            <span className="expired-icon">⏰</span>
                            <h2>Link Sudah Kadaluarsa</h2>
                            <p>Maaf, link ini sudah tidak berlaku. Silakan hubungi sekolah untuk mendapatkan link baru.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Error state (non-expired)
    if (error && !applicant) {
        return (
            <div className="parent-upload-page">
                <div className="parent-upload-container">
                    <div className="parent-upload-card">
                        <div className="error-notice">
                            <XCircle size={48} style={{ color: '#ef4444', marginBottom: '1rem' }} />
                            <h2>Terjadi Kesalahan</h2>
                            <p>{error}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="parent-upload-page">
            <div className="parent-upload-container">
                {/* Header */}
                <div className="parent-upload-header">
                    <h1><FileEdit size={28} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> Edit Data Siswa</h1>
                    <p>Silakan lengkapi atau perbaiki data siswa dan upload dokumen yang diperlukan.</p>
                    <div className="timer-badge">
                        <Clock size={18} style={{ marginRight: '0.5rem' }} />
                        <span>Sisa waktu: <strong>{timeLeft}</strong></span>
                    </div>
                </div>

                {/* Messages */}
                {error && (
                    <div className="message message--error">{error}</div>
                )}
                {success && (
                    <div className="message message--success">{success}</div>
                )}

                {/* Student Info Card */}
                <div className="parent-upload-card">
                    <h2>Data Siswa</h2>
                    <p className="card-subtitle">Data yang diubah akan direview oleh petugas sebelum disimpan.</p>

                    <div className="form-grid">
                        <div className="form-group">
                            <label style={{ color: '#f7b917', fontWeight: 700, fontSize: '0.9rem' }}>Nama Lengkap</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Nama lengkap siswa"
                            />
                        </div>

                        <div className="form-group">
                            <label style={{ color: '#f7b917', fontWeight: 700, fontSize: '0.9rem' }}>NISN</label>
                            <input
                                type="text"
                                name="nisn"
                                value={formData.nisn}
                                onChange={handleChange}
                                placeholder="Nomor Induk Siswa Nasional"
                            />
                        </div>

                        <div className="form-group">
                            <label style={{ color: '#f7b917', fontWeight: 700, fontSize: '0.9rem' }}>Tanggal Lahir</label>
                            <input
                                type="date"
                                name="birthdate"
                                value={formData.birthdate}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label style={{ color: '#f7b917', fontWeight: 700, fontSize: '0.9rem' }}>No. Telepon Orang Tua</label>
                            <input
                                type="tel"
                                name="parent_phone"
                                value={formData.parent_phone}
                                onChange={handleChange}
                                placeholder="08xxxxxxxxxx"
                            />
                        </div>

                        <div className="form-group form-group--full">
                            <label style={{ color: '#f7b917', fontWeight: 700, fontSize: '0.9rem' }}>Email</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="email@contoh.com"
                            />
                        </div>

                        <div className="form-group form-group--full">
                            <label style={{ color: '#f7b917', fontWeight: 700, fontSize: '0.9rem' }}>Alamat</label>
                            <textarea
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                placeholder="Alamat lengkap"
                                rows={3}
                            />
                        </div>

                        <div className="form-group form-group--full">
                            <label style={{ color: '#f7b917', fontWeight: 700, fontSize: '0.9rem' }}>Catatan Tambahan</label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                placeholder="Catatan atau informasi tambahan"
                                rows={2}
                            />
                        </div>
                    </div>

                    <button
                        className="btn btn--save"
                        onClick={handleSaveData}
                        disabled={saving}
                    >
                        {saving ? 'Menyimpan...' : <><Save size={18} style={{ marginRight: '0.5rem' }} /> Simpan Data</>}
                    </button>
                </div>

                {/* Document Upload Card */}
                <div className="parent-upload-card">
                    <h2>Upload Dokumen</h2>
                    <p className="card-subtitle">Format yang diterima: PDF, JPEG, PNG, DOC, DOCX (Maks 10MB)</p>

                    {/* Document Types */}
                    <div className="upload-sections">
                        {[
                            { key: 'ktp_ortu', label: 'KTP Orang Tua', icon: <CreditCard size={18} /> },
                            { key: 'akta_kelahiran', label: 'Akta Kelahiran', icon: <FileText size={18} /> },
                            { key: 'kartu_keluarga', label: 'Kartu Keluarga', icon: <Users size={18} /> },
                            { key: 'ijazah', label: 'Ijazah / SKHUN', icon: <GraduationCap size={18} /> },
                            { key: 'rapor', label: 'Rapor', icon: <ClipboardList size={18} /> },
                            { key: 'foto', label: 'Pas Foto', icon: <Camera size={18} /> },
                            { key: 'dokumen_lain', label: 'Dokumen Lainnya', icon: <Paperclip size={18} /> }
                        ].map(doc => {
                            const uploaded = documents.filter(d => d.doc_key === doc.key);

                            return (
                                <div key={doc.key} className="upload-section">
                                    <div className="upload-section-header">
                                        <span className="upload-icon">{doc.icon}</span>
                                        <span className="upload-label">{doc.label}</span>
                                        {uploaded.length > 0 && (
                                            <span className="upload-status upload-status--uploaded">
                                                <Check size={14} style={{ marginRight: '0.25rem' }} /> {uploaded.length} file
                                            </span>
                                        )}
                                    </div>

                                    <div className="upload-area">
                                        <input
                                            type="file"
                                            id={`upload-${doc.key}`}
                                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                            onChange={(e) => handleFileUpload(e, doc.key)}
                                            disabled={uploading}
                                        />
                                        <label htmlFor={`upload-${doc.key}`} className="upload-btn">
                                            {uploading ? <><Upload size={16} style={{ marginRight: '0.35rem' }} /> Mengupload...</> : <><FolderOpen size={16} style={{ marginRight: '0.35rem' }} /> Pilih File</>}
                                        </label>
                                    </div>

                                    {/* Show uploaded files */}
                                    {uploaded.length > 0 && (
                                        <div className="uploaded-files">
                                            {uploaded.map(file => (
                                                <div key={file.id} className="uploaded-file">
                                                    <span className="file-name">{file.original_filename}</span>
                                                    <span className={`file-status file-status--${file.status}`}>
                                                        {file.status === 'pending' ? <><Clock size={14} style={{ marginRight: '0.25rem' }} /> Menunggu review</> :
                                                            file.status === 'approved' ? <><CheckCircle size={14} style={{ marginRight: '0.25rem' }} /> Disetujui</> : <><XCircle size={14} style={{ marginRight: '0.25rem' }} /> Ditolak</>}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Info Notice */}
                <div className="info-notice">
                    <Info size={20} style={{ color: '#60a5fa', marginRight: '0.5rem', flexShrink: 0 }} />
                    <p>
                        Setelah Anda menyimpan data dan mengupload dokumen, petugas akan mereview dan
                        mengkonfirmasi perubahan. Anda akan dihubungi jika ada yang perlu diperbaiki.
                    </p>
                </div>
            </div>
        </div>
    );
}
