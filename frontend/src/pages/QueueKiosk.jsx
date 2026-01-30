import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '../api'
import { toLocalTime } from '../lib/utils'
import io from 'socket.io-client'
import Swal from 'sweetalert2'
import dingSound from '../sounds/ding.mp3'
import './OptionsKiosk.css'

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
  const [remainingQueue, setRemainingQueue] = useState(0)
  const [queuePosition, setQueuePosition] = useState(null)
  const socketRef = useRef(null)

  const playSound = () => {
    const audio = new Audio(dingSound)
    audio.play().catch(err => console.error('Failed to play sound:', err))
  }

  const showStatusToast = (status, ticketNumber) => {
    let title = ''
    let icon = 'info'

    switch (status) {
      case 'CALLED':
        title = `Nomor antrian ${ticketNumber} sedang dipanggil!`
        icon = 'info'
        break
      case 'IN_SERVICE':
        title = 'Anda sekarang sedang dilayani.'
        icon = 'success'
        break
      case 'DONE':
        title = 'Layanan Anda telah selesai. Terima kasih!'
        icon = 'success'
        break
      case 'WAITING':
        title = 'Anda telah dimasukkan kembali ke dalam antrian.'
        icon = 'info'
        break
      case 'NO_SHOW':
        title = 'Anda ditandai tidak hadir.'
        icon = 'warning'
        break
      case 'CANCELED':
        title = 'Antrian Anda telah dibatalkan.'
        icon = 'error'
        break
      default:
        return
    }

    Swal.fire({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 5000,
      timerProgressBar: true,
      icon: icon,
      title: title,
    })
  }

  // Effect for establishing and managing the socket connection itself.
  // This runs only once when the component mounts.
  useEffect(() => {
    socketRef.current = io(import.meta.env.VITE_SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current.on('connect', () => {
      console.log('Socket.IO connection established.');
    });

    socketRef.current.on('disconnect', () => {
      console.log('Socket.IO connection disconnected.');
    });

    // Cleanup the connection when the component unmounts
    return () => {
      if (socketRef.current) {
        console.log('Disconnecting Socket.IO.');
        socketRef.current.disconnect();
      }
    };
  }, []); // Empty dependency array ensures this runs only once.

  // Effect for handling ticket-specific logic, including data fetching and event listeners.
  // This runs whenever currentTicket changes.
  useEffect(() => {
    if (currentTicket && socketRef.current) {
      const socket = socketRef.current;

      const fetchAndUpdateQueue = async () => {
        console.log('Fetching and updating queue status...');
        try {
          const queue = await api.kiosk.getQueue(currentTicket.service_id, null, 100);
          const waitingTickets = queue.filter((t) => t.status === 'WAITING');
          const ticketIndex = waitingTickets.findIndex((t) => t.id === currentTicket.id);

          if (ticketIndex !== -1) {
            setRemainingQueue(ticketIndex);
            setQueuePosition(ticketIndex + 1);
          } else {
            setRemainingQueue(0);
            if (currentTicket.status !== 'WAITING') {
              setQueuePosition(null);
            }
          }
        } catch (err) {
          console.error('Failed to update queue position:', err);
        }
      };

      // Fetch queue data initially for the current ticket
      fetchAndUpdateQueue();

      // Join rooms for this specific ticket and service
      socket.emit('join-ticket', currentTicket.id);
      socket.emit('join-queue', currentTicket.service_id);
      console.log(`Joined rooms for ticket ${currentTicket.id} and service ${currentTicket.service_id}`);

      // Define event handlers
      const handleTicketUpdate = (data) => {
        console.log('Event "ticket-update" received:', data)
        setCurrentTicket(prev => ({ ...prev, ...data }))
        if (data.status) {
          playSound()
          showStatusToast(data.status, data.number || currentTicket.number)
        }
      };

      const handleQueueUpdate = (data) => {
        console.log('Event "queue-update" received:', data)

        // If the update is for the specific ticket shown on the kiosk
        if (data.ticketId && String(data.ticketId) === String(currentTicket.id)) {
          let newStatus = null
          if (data.action === 'start') {
            newStatus = 'IN_SERVICE'
          } else if (data.action === 'resolve') {
            newStatus = 'DONE'
          } else if (data.action === 'requeue') {
            newStatus = 'WAITING'
          } else if (data.action === 'no-show') {
            newStatus = 'NO_SHOW'
          }

          if (newStatus) {
            playSound()
            setCurrentTicket(prev => ({ ...prev, status: newStatus }))
            showStatusToast(newStatus, currentTicket.number)
          }
        }

        // If the update is a general one for the queue this ticket is in,
        // or if our ticket's status changed, we should refetch the queue position.
        if (data.serviceId === currentTicket.service_id || (data.ticketId && data.ticketId === currentTicket.id)) {
          fetchAndUpdateQueue()
        }
      };

      // Register event handlers
      socket.on('ticket-update', handleTicketUpdate);
      socket.on('queue-update', handleQueueUpdate);

      // Cleanup function to remove listeners when the ticket changes or component unmounts
      return () => {
        console.log('Cleaning up socket listeners for ticket', currentTicket.id);
        socket.off('ticket-update', handleTicketUpdate);
        socket.off('queue-update', handleQueueUpdate);
      };
    }
  }, [currentTicket]); // Dependency on currentTicket ensures this logic re-runs if the ticket changes.

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
        <div>Tiket tidak ditemukan. Kembali ke
          <button
            className='btn primary'
            style={{ padding: '0.2rem', margin: '0 10px' }}
            onClick={() => navigate('/kiosk')}>Depan</button></div>
      </div>
    )
  }

  return (
    <div className="kiosk-page" style={{ alignItems: 'center' }}>
      <div className="kiosk-container">
        <div className="kiosk-content" style={{ textAlign: 'center', padding: '2rem' }}>
          {/* Success Icon */}
          <div style={{
            width: '4rem',
            height: '4rem',
            background: 'rgba(247, 185, 23, 0.2)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem'
          }}>
            <svg style={{ width: '2rem', height: '2rem', color: '#f7b917' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: 'clamp(1.5rem, 5vw, 2rem)',
            fontWeight: '800',
            margin: '0 0 0.5rem',
            background: 'linear-gradient(135deg, #ffffff 0%, #cbe2f0 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            🏫 EduConsult
          </h1>
          <p style={{ fontSize: '0.9rem', opacity: '0.8', margin: '0 0 1.5rem', color: 'rgba(203, 226, 240, 0.8)' }}>
            <strong style={{ color: '#f7b917' }}>{currentTicket.service_name}</strong>
          </p>

          {/* Queue Number Card */}
          <div style={{
            background: 'rgba(247, 185, 23, 0.1)',
            border: '1px solid rgba(247, 185, 23, 0.3)',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              fontSize: 'clamp(1.5rem, 8vw, 2.5rem)',
              fontWeight: '800',
              color: '#f7b917',
              marginBottom: '0.5rem'
            }}>
              {currentTicket.number}
            </div>
            <div style={{ fontSize: '0.85rem', opacity: '0.7', color: 'rgba(203, 226, 240, 0.7)' }}>
              Simpan nomor antrian ini
            </div>
          </div>

          {/* Details */}
          <div style={{
            textAlign: 'left',
            display: 'grid',
            gap: '0.5rem',
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
            color: 'rgba(203, 226, 240, 0.9)'
          }}>
            <div><strong style={{ color: '#fff' }}>Nama:</strong> {currentTicket.queue_customer_name}</div>
            <div><strong style={{ color: '#fff' }}>Telepon:</strong> {currentTicket.queue_customer_phone}</div>
            <div><strong style={{ color: '#fff' }}>Dibuat:</strong> {toLocalTime(currentTicket.created_at)}</div>
            <div>
              <strong style={{ color: '#fff' }}>Status:</strong>
              <span style={{
                marginLeft: '0.5rem',
                padding: '0.25rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: '600',
                backgroundColor: currentTicket.status === 'WAITING' ? 'rgba(59, 130, 246, 0.2)' :
                  currentTicket.status === 'CALLED' ? 'rgba(247, 185, 23, 0.2)' :
                    currentTicket.status === 'IN_SERVICE' ? 'rgba(16, 185, 129, 0.2)' :
                      currentTicket.status === 'DONE' ? 'rgba(16, 185, 129, 0.2)' :
                        'rgba(239, 68, 68, 0.2)',
                color: currentTicket.status === 'WAITING' ? '#60a5fa' :
                  currentTicket.status === 'CALLED' ? '#f7b917' :
                    currentTicket.status === 'IN_SERVICE' ? '#34d399' :
                      currentTicket.status === 'DONE' ? '#34d399' :
                        '#f87171'
              }}>
                {STATUS_LABEL_ID[currentTicket.status] || currentTicket.status}
              </span>
            </div>

            {currentTicket.status === 'WAITING' && (
              <>
                <div><strong style={{ color: '#fff' }}>Sisa Antrian:</strong> {remainingQueue}</div>
                {queuePosition && (
                  <div><strong style={{ color: '#fff' }}>Posisi Antrian:</strong> {queuePosition}</div>
                )}
              </>
            )}
          </div>

          {/* Status Message */}
          <div style={{
            fontSize: '0.85rem',
            opacity: '0.8',
            marginBottom: '1.5rem',
            lineHeight: '1.6',
            color: 'rgba(203, 226, 240, 0.8)',
            padding: '1rem',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '8px'
          }}>
            {currentTicket.status === 'WAITING' && (
              <p style={{ margin: 0 }}>⏳ Silakan menunggu sampai nomor Anda dipanggil.</p>
            )}
            {currentTicket.status === 'CALLED' && (
              <p style={{ margin: 0 }}>📢 Nomor Anda sedang dipanggil. Silakan menuju loket!</p>
            )}
            {currentTicket.status === 'IN_SERVICE' && (
              <p style={{ margin: 0 }}>✅ Anda sedang dilayani.</p>
            )}
            {currentTicket.status === 'DONE' && (
              <p style={{ margin: 0 }}>🎉 Layanan Anda telah selesai. Terima kasih!</p>
            )}
            {currentTicket.status === 'NO_SHOW' && (
              <p style={{ margin: 0 }}>⚠️ Anda tidak hadir saat dipanggil.</p>
            )}
            {currentTicket.status === 'CANCELED' && (
              <p style={{ margin: 0 }}>❌ Antrian Anda telah dibatalkan.</p>
            )}
          </div>

          {/* New Queue Button */}
          <button
            onClick={resetForm}
            style={{
              width: '100%',
              padding: '1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '0.95rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            🎫 Ambil Antrian Baru
          </button>
        </div>
      </div>
    </div>
  )
}
