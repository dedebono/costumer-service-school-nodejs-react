import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '../api'
import { toLocalTime } from '../lib/utils'
import io from 'socket.io-client'
import Swal from 'sweetalert2'

const STATUS_LABEL_ID = {
  WAITING: 'Menunggu',
  CALLED: 'Dipanggil',
  IN_SERVICE: 'Sedang Dilayani',
  DONE: 'Selesai',
  NO_SHOW: 'Tidak Hadir',
  CANCELED: 'Dibatalkan',
}

export default function QueueKiosk() {
  const location = useLocation()
  const navigate = useNavigate()
  const ticket = location.state?.ticket
  const [currentTicket, setCurrentTicket] = useState(ticket)
  const socketRef = useRef(null)

  useEffect(() => {
    if (currentTicket) {
      socketRef.current = io(import.meta.env.VITE_SOCKET_URL, {
        transports: ['websocket', 'polling']
      });

      socketRef.current.on('connect', () => {
        console.log('Terhubung ke server socket untuk pembaruan tiket');
        socketRef.current.emit('join-ticket', currentTicket.id);
      });

      socketRef.current.on('ticket-update', (data) => {
        console.log('Pembaruan tiket diterima:', data);
        setCurrentTicket(prev => ({ ...prev, ...data }));
        if (data.status === 'CALLED') {
          Swal.fire({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 5000,
            timerProgressBar: true,
            icon: 'info',
            title: `Nomor antrian ${data.number || currentTicket.number} sedang dipanggil!`
          });
        }
      });

      socketRef.current.on('disconnect', () => {
        console.log('Terputus dari server socket');
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [currentTicket])

  const resetForm = () => {
    navigate('/kiosk')
  }

  if (!currentTicket) {
    return (
      <div className="page safe" style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)'
      }}>
        <div>Tiket tidak ditemukan. Kembali ke <button onClick={() => navigate('/kiosk')}>kios</button></div>
      </div>
    )
  }

  return (
    <div className="page safe" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-4)'
    }}>
      <div className="surface" style={{
        maxWidth: '480px',
        width: '100%',
        padding: 'var(--space-8)',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{
            width: '4rem',
            height: '4rem',
            background: 'color-mix(in oklab, var(--clr-accent) 20%, var(--clr-bg))',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--space-4)'
          }}>
            <svg style={{ width: '2rem', height: '2rem', color: 'var(--clr-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 style={{
            fontSize: 'var(--fs-700)',
            fontWeight: '700',
            margin: '0 0 var(--space-2)',
            color: 'var(--clr-text)'
          }}>
            Nomor Antrian Berhasil Dibuat!
          </h1>
          <p style={{
            fontSize: 'var(--fs-400)',
            opacity: '0.8',
            margin: 0
          }}>
            Simpan nomor antrian ini.
          </p>
        </div>

        <div className="surface" style={{
          background: 'var(--clr-surface-2)',
          padding: 'var(--space-6)',
          marginBottom: 'var(--space-6)'
        }}>
          <div style={{
            fontSize: 'clamp(2rem, 8vw, 3rem)',
            fontWeight: '700',
            color: 'var(--clr-primary)',
            marginBottom: 'var(--space-2)'
          }}>
            {currentTicket.number}
          </div>
          <div style={{
            fontSize: 'var(--fs-300)',
            opacity: '0.7'
          }}>
            Nomor Antrian
          </div>
        </div>

        <div style={{
          textAlign: 'left',
          display: 'grid',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-6)',
          fontSize: 'var(--fs-400)'
        }}>
          <div><strong>Layanan:</strong> {currentTicket.service_name}</div>
          <div><strong>Dibuat:</strong> {toLocalTime(currentTicket.created_at)}</div>
          <div>
            <strong>Status:</strong>
            <span className="badge" style={{ marginLeft: 'var(--space-2)' }}>
              {STATUS_LABEL_ID[currentTicket.status] || currentTicket.status}
            </span>
          </div>
          {currentTicket.queue_position && currentTicket.status === 'WAITING' && (
            <div><strong>Posisi Antrian:</strong> {currentTicket.queue_position}</div>
          )}
        </div>

        <div style={{
          fontSize: 'var(--fs-300)',
          opacity: '0.8',
          marginBottom: 'var(--space-6)',
          lineHeight: '1.6'
        }}>
          {currentTicket.status === 'WAITING' && (
            <p>Silakan menunggu sampai nomor Anda dipanggil. Anda dapat melihat posisi antrian di layar.</p>
          )}
          {currentTicket.status === 'CALLED' && (
            <p>Nomor Anda sedang dipanggil. Silakan menuju loket.</p>
          )}
          {currentTicket.status === 'IN_SERVICE' && (
            <p>Anda sedang dilayani.</p>
          )}
          {currentTicket.status === 'DONE' && (
            <p>Layanan Anda telah selesai.</p>
          )}
        </div>

        <button
          onClick={resetForm}
          className="btn btn--primary btn--lg w-full"
          style={{
            minHeight: '3.5rem',
            fontSize: 'var(--fs-500)',
            fontWeight: '600'
          }}
        >
          Buat Tiket Lain
        </button>
      </div>
    </div>
  )
}
