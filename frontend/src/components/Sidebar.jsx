import React, { useEffect, useRef, useState } from 'react'
import io from 'socket.io-client'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Sidebar({
  tab,
  setTab,
  groupedTabs,
  socketUrl = import.meta.env?.VITE_SOCKET_URL, // optional: override via prop
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [socketConnected, setSocketConnected] = useState(false)
  const socketRef = useRef(null)

  // Minimal socket connection just for status light
  useEffect(() => {
    if (!socketUrl) return
    const s = io(socketUrl, { transports: ['websocket', 'polling'] })
    socketRef.current = s

    const onConnect = () => setSocketConnected(true)
    const onDisconnect = () => setSocketConnected(false)
    const onError = () => setSocketConnected(false)

    s.on('connect', onConnect)
    s.on('disconnect', onDisconnect)
    s.on('connect_error', onError)
    s.on('reconnect', onConnect)

    return () => {
      s.off('connect', onConnect)
      s.off('disconnect', onDisconnect)
      s.off('connect_error', onError)
      s.off('reconnect', onConnect)
      s.disconnect()
    }
  }, [socketUrl])

  return (
    <aside
      className={`sidebar${sidebarCollapsed ? ' collapsed' : ''}`}
      role="navigation"
      aria-label="Primary"
      style={{ display: 'flex', flexDirection: 'column' }} // ensure footer sticks to bottom
    >
      <button
        className="sidebar-toggle"
        onClick={() => setSidebarCollapsed(c => !c)}
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >

        {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>

      <div className="sidebar-content" style={{ flex: '1 1 auto', overflowY: 'auto' }}>
        {groupedTabs.map((group) => (
          <div key={group.title} className="sidebar-group">
            {!sidebarCollapsed && (
              <div className="sidebar-group-title">{group.title}</div>
            )}

            <ul className="sidebar-list">
              {group.items.map((item) => {
                const isActive = tab === item.value
                const icon = item.icon ?? null
                return (
                  <li key={item.value}>
                    <button
                      className={`sidebar-item${isActive ? ' active' : ''}`}
                      onClick={() => setTab(item.value)}
                      data-tooltip={sidebarCollapsed ? item.label : undefined}
                      title={sidebarCollapsed ? item.label : undefined}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <span className="sidebar-item-icon" aria-hidden>
                        {icon ? icon : item.label.charAt(0)}
                      </span>
                      {!sidebarCollapsed && (
                        <span className="sidebar-item-label">{item.label}</span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Socket status footer */}
      <div
        className="sidebar-footer"
        role="status"
        aria-live="polite"
        title={socketConnected ? 'Socket connected' : 'Socket disconnected'}
        style={{
          flex: '0 0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
          borderTop: '1px solid #eee',
          borderRadius: '18px',
          background: '#fafafa',
          justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
        }}
      >
        <span
          className="status-dot"
          aria-hidden="true"
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: socketConnected ? '#16a34a' : '#dc2626', // green / red
            boxShadow: '0 0 0 2px #fff inset',
          }}
        />
        {!sidebarCollapsed && (
          <span
            className="status-text"
            style={{ fontSize: 12, color: '#374151', userSelect: 'none' }}
          >
            {socketConnected ? 'Realtime OK' : 'Tidak Terhubung'}
          </span>
        )}
      </div>
    </aside>
  )
}
