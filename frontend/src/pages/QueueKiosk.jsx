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
  const [remainingQueue, setRemainingQueue] = useState(0)
  const [queuePosition, setQueuePosition] = useState(null)
  const socketRef = useRef(null)

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
          style={{padding:'0.2rem', margin:'0 10px'}}
          onClick={() => navigate('/kiosk')}>Depan</button></div>
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
<div
  className="surface-queue"
  style={{
    maxWidth: '480px',
    width: '100%',
    minHeight: '280px',
    padding: 'var(--space-8)',
    textAlign: 'center',
  }}
>
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
            Education Counsultant
          </h1>
          <p style={{
            fontSize: 'var(--fs-400)',
            opacity: '0.8',
            margin: 0
          }}>
            <strong>{currentTicket.service_name}</strong>
          </p>
        </div>

        <div className="surface" style={{
          background: 'var(--clr-surface-2)',
          padding: 'var(--space-6)',
          marginBottom: 'var(--space-6)'
        }}>
          <div style={{
            fontSize: 'clamp(.9rem, 4vw, 1.3rem)',
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
            Simpan nomor antrian ini.
          </div>
        </div>

        <div style={{
          textAlign: 'left',
          display: 'grid',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-6)',
          fontSize: 'var(--fs-400)'
        }}>
          <div><strong>Nama:</strong> {currentTicket.queue_customer_name}</div>
          <div><strong>Telepon:</strong> {currentTicket.queue_customer_phone}</div>
          <div><strong>Dibuat:</strong> {toLocalTime(currentTicket.created_at)}</div>
          <div>
            <strong>Status:</strong>
            <span className="badge" style={{ marginLeft: 'var(--space-2)' }}>
              {STATUS_LABEL_ID[currentTicket.status] || currentTicket.status}
            </span>
          </div>

          {currentTicket.status === 'WAITING' && (
            <div><strong>Sisa Antrian:</strong> {remainingQueue}</div>
          )}
          
          {queuePosition && currentTicket.status === 'WAITING' && (
            <div><strong>Posisi Antrian:</strong> {queuePosition}</div>
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
          {currentTicket.status === 'NO_SHOW' && (
            <p>Anda tidak hadir saat nomor antrian Anda dipanggil.</p>
          )}
          {currentTicket.status === 'CANCELED' && (
            <p>Antrian Anda telah dibatalkan.</p>
          )}
        </div>

      </div>
    </div>
  )
}
