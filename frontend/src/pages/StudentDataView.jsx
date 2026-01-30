import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import Swal from 'sweetalert2';
import './StudentDataView.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function StudentDataView() {
    const { applicantId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [applicant, setApplicant] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [pendingData, setPendingData] = useState(null);
    const [hasActiveLink, setHasActiveLink] = useState(false);
    const [activeLinkExpires, setActiveLinkExpires] = useState(null);
    const [processing, setProcessing] = useState(false);

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await api(`/parent-upload/admin/${applicantId}`);
                setApplicant(data.applicant);
                setDocuments(data.documents || []);
                setPendingData(data.pendingData);
                setHasActiveLink(data.hasActiveLink);
                setActiveLinkExpires(data.activeLinkExpires);
            } catch (e) {
                console.error('Error fetching data:', e);
                Swal.fire('Error', 'Gagal memuat data siswa', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [applicantId]);

    // Generate upload link
    const handleGenerateLink = async () => {
        try {
            setProcessing(true);
            const result = await api(`/parent-upload/admin/generate/${applicantId}`, { method: 'POST' });

            // Open WhatsApp
            window.open(result.wa_url, '_blank');

            setHasActiveLink(true);
            setActiveLinkExpires(result.expires_at);

            Swal.fire({
                title: 'Link Berhasil Dibuat',
                html: `
          <p>Link upload sudah dikirim via WhatsApp.</p>
          <p><strong>URL:</strong></p>
          <input type="text" value="${result.upload_url}" readonly 
                 style="width: 100%; padding: 8px; font-size: 12px; margin-top: 8px;" 
                 onclick="this.select(); document.execCommand('copy');" />
          <p style="font-size: 12px; margin-top: 8px; opacity: 0.7;">Klik untuk menyalin</p>
        `,
                icon: 'success'
            });
        } catch (e) {
            Swal.fire('Error', e.message || 'Gagal membuat link', 'error');
        } finally {
            setProcessing(false);
        }
    };

    // Approve pending data
    const handleApproveData = async () => {
        const result = await Swal.fire({
            title: 'Setujui Perubahan?',
            text: 'Data siswa akan diperbarui dengan data yang diajukan orang tua.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Ya, Setujui',
            cancelButtonText: 'Batal'
        });

        if (result.isConfirmed) {
            try {
                setProcessing(true);
                await api(`/parent-upload/admin/${applicantId}/review`, {
                    method: 'POST',
                    body: { action: 'approve' }
                });

                // Refresh data
                const data = await api(`/parent-upload/admin/${applicantId}`);
                setApplicant(data.applicant);
                setPendingData(data.pendingData);

                Swal.fire('Berhasil', 'Data telah disetujui dan disimpan', 'success');
            } catch (e) {
                Swal.fire('Error', e.message, 'error');
            } finally {
                setProcessing(false);
            }
        }
    };

    // Reject pending data
    const handleRejectData = async () => {
        const result = await Swal.fire({
            title: 'Tolak Perubahan?',
            text: 'Data yang diajukan orang tua akan dihapus.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ya, Tolak',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#ef4444'
        });

        if (result.isConfirmed) {
            try {
                setProcessing(true);
                await api(`/parent-upload/admin/${applicantId}/review`, {
                    method: 'POST',
                    body: { action: 'reject' }
                });

                setPendingData(null);
                Swal.fire('Berhasil', 'Perubahan telah ditolak', 'success');
            } catch (e) {
                Swal.fire('Error', e.message, 'error');
            } finally {
                setProcessing(false);
            }
        }
    };

    // Approve/reject document
    const handleDocumentReview = async (docId, status) => {
        try {
            await api(`/parent-upload/admin/document/${docId}/review`, {
                method: 'POST',
                body: { status }
            });

            setDocuments(docs => docs.map(d =>
                d.id === docId ? { ...d, status } : d
            ));

            Swal.fire('Berhasil', `Dokumen ${status === 'approved' ? 'disetujui' : 'ditolak'}`, 'success');
        } catch (e) {
            Swal.fire('Error', e.message, 'error');
        }
    };

    // Download document
    const handleDownload = (docId) => {
        const token = localStorage.getItem('token');
        window.open(`${API_URL}/api/parent-upload/admin/document/${docId}/download?token=${token}`, '_blank');
    };

    if (loading) {
        return (
            <div className="student-data-page">
                <div className="student-data-container">
                    <div className="loading">Memuat data...</div>
                </div>
            </div>
        );
    }

    if (!applicant) {
        return (
            <div className="student-data-page">
                <div className="student-data-container">
                    <div className="error">Data siswa tidak ditemukan</div>
                </div>
            </div>
        );
    }

    return (
        <div className="student-data-page">
            <div className="student-data-container">
                {/* Header */}
                <div className="page-header">
                    <button className="btn-back" onClick={() => navigate(-1)}>
                        ← Kembali
                    </button>
                    <h1>📋 Data Siswa</h1>
                </div>

                {/* Actions */}
                <div className="actions-bar">
                    <button
                        className="btn btn--primary"
                        onClick={handleGenerateLink}
                        disabled={processing}
                    >
                        📱 Kirim Link ke Orang Tua
                    </button>

                    {hasActiveLink && (
                        <span className="link-status">
                            ✅ Link aktif hingga {new Date(activeLinkExpires).toLocaleString('id-ID')}
                        </span>
                    )}
                </div>

                {/* Student Info */}
                <div className="data-card">
                    <h2>Informasi Siswa</h2>
                    {pendingData?.data && (
                        <div style={{
                            background: 'rgba(251, 191, 36, 0.15)',
                            border: '1px solid rgba(251, 191, 36, 0.4)',
                            borderRadius: '10px',
                            padding: '1rem',
                            marginBottom: '1rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                                <strong style={{ color: '#fbbf24' }}>Ada Data Pending dari Orang Tua</strong>
                                {pendingData.submitted_at && (
                                    <span style={{ fontSize: '0.8rem', color: 'rgba(251, 191, 36, 0.8)' }}>
                                        (Diajukan: {new Date(pendingData.submitted_at).toLocaleString('id-ID')})
                                    </span>
                                )}
                            </div>
                            <div className="pending-actions">
                                <button
                                    className="btn btn--success"
                                    onClick={handleApproveData}
                                    disabled={processing}
                                >
                                    ✅ Setujui Semua Perubahan
                                </button>
                                <button
                                    className="btn btn--danger"
                                    onClick={handleRejectData}
                                    disabled={processing}
                                >
                                    ❌ Tolak Semua Perubahan
                                </button>
                            </div>
                        </div>
                    )}
                    <div className="info-grid">
                        {/* Nama Lengkap */}
                        <div className="info-item">
                            <label style={{ color: '#f7b917', fontWeight: 700 }}>Nama Lengkap</label>
                            <span>{applicant.name}</span>
                            {pendingData?.data?.name && pendingData.data.name !== applicant.name && (
                                <div className="pending-value">
                                    <span className="pending-new">→ {pendingData.data.name}</span>
                                    <span className="pending-badge">⏳ Menunggu</span>
                                </div>
                            )}
                        </div>

                        {/* NISN */}
                        <div className="info-item">
                            <label style={{ color: '#f7b917', fontWeight: 700 }}>NISN</label>
                            <span>{applicant.nisn || '-'}</span>
                            {pendingData?.data?.nisn && pendingData.data.nisn !== applicant.nisn && (
                                <div className="pending-value">
                                    <span className="pending-new">→ {pendingData.data.nisn}</span>
                                    <span className="pending-badge">⏳ Menunggu</span>
                                </div>
                            )}
                        </div>

                        {/* Tanggal Lahir */}
                        <div className="info-item">
                            <label style={{ color: '#f7b917', fontWeight: 700 }}>Tanggal Lahir</label>
                            <span>{applicant.birthdate ? new Date(applicant.birthdate).toLocaleDateString('id-ID') : '-'}</span>
                            {pendingData?.data?.birthdate && pendingData.data.birthdate !== (applicant.birthdate?.split('T')[0] || '') && (
                                <div className="pending-value">
                                    <span className="pending-new">→ {pendingData.data.birthdate}</span>
                                    <span className="pending-badge">⏳ Menunggu</span>
                                </div>
                            )}
                        </div>

                        {/* No. Telepon */}
                        <div className="info-item">
                            <label style={{ color: '#f7b917', fontWeight: 700 }}>No. Telepon Orang Tua</label>
                            <span>{applicant.parent_phone || '-'}</span>
                            {pendingData?.data?.parent_phone && pendingData.data.parent_phone !== applicant.parent_phone && (
                                <div className="pending-value">
                                    <span className="pending-new">→ {pendingData.data.parent_phone}</span>
                                    <span className="pending-badge">⏳ Menunggu</span>
                                </div>
                            )}
                        </div>

                        {/* Email */}
                        <div className="info-item info-item--full">
                            <label style={{ color: '#f7b917', fontWeight: 700 }}>Email</label>
                            <span>{applicant.email || '-'}</span>
                            {pendingData?.data?.email && pendingData.data.email !== applicant.email && (
                                <div className="pending-value">
                                    <span className="pending-new">→ {pendingData.data.email}</span>
                                    <span className="pending-badge">⏳ Menunggu</span>
                                </div>
                            )}
                        </div>

                        {/* Alamat */}
                        <div className="info-item info-item--full">
                            <label style={{ color: '#f7b917', fontWeight: 700 }}>Alamat</label>
                            <span>{applicant.address || '-'}</span>
                            {pendingData?.data?.address && pendingData.data.address !== applicant.address && (
                                <div className="pending-value">
                                    <span className="pending-new">→ {pendingData.data.address}</span>
                                    <span className="pending-badge">⏳ Menunggu</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Documents */}
                <div className="data-card">
                    <h2>Dokumen Upload</h2>

                    {documents.length === 0 ? (
                        <p className="no-docs">Belum ada dokumen yang diupload</p>
                    ) : (
                        <div className="documents-list">
                            {documents.map(doc => (
                                <div key={doc.id} className="document-item">
                                    <div className="doc-info">
                                        <span className="doc-type">{doc.doc_key}</span>
                                        <span className="doc-name">{doc.original_filename || doc.filename}</span>
                                        <span className={`doc-status doc-status--${doc.status}`}>
                                            {doc.status === 'pending' ? '⏳ Menunggu' :
                                                doc.status === 'approved' ? '✅ Disetujui' : '❌ Ditolak'}
                                        </span>
                                    </div>
                                    <div className="doc-actions">
                                        <button
                                            className="btn btn--sm"
                                            style={{
                                                background: 'rgba(247, 185, 23, 0.2)',
                                                border: '2px solid #f7b917',
                                                color: '#f7b917',
                                                fontWeight: 700,
                                                padding: '0.5rem 1rem'
                                            }}
                                            onClick={() => handleDownload(doc.id)}
                                        >
                                            📥 Download
                                        </button>
                                        {doc.status === 'pending' && (
                                            <>
                                                <button
                                                    className="btn btn--sm btn--success"
                                                    onClick={() => handleDocumentReview(doc.id, 'approved')}
                                                >
                                                    ✓
                                                </button>
                                                <button
                                                    className="btn btn--sm btn--danger"
                                                    onClick={() => handleDocumentReview(doc.id, 'rejected')}
                                                >
                                                    ✗
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
