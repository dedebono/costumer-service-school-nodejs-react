// Sidebar.jsx
import React, { useState } from 'react';

export default function Sidebar({ tab, setTab, groupedTabs }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <aside
      className={`sidebar${sidebarCollapsed ? ' collapsed' : ''}`}
      role="navigation"
      aria-label="Primary"
    >
      <button
        className="sidebar-toggle"
        onClick={() => setSidebarCollapsed(c => !c)}
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {sidebarCollapsed ? '▶' : '◀'}
      </button>

      <div className="sidebar-content">
        {groupedTabs.map((group) => (
          <div key={group.title} className="sidebar-group">
            {!sidebarCollapsed && (
              <div className="sidebar-group-title">{group.title}</div>
            )}

            <ul className="sidebar-list">
              {group.items.map((item) => {
                const isActive = tab === item.value;
                const icon = item.icon ?? null; // optional: pass <svg/> or emoji from caller
                return (
                  <li key={item.value}>
                    <button
                      className={`sidebar-item${isActive ? ' active' : ''}`}
                      onClick={() => setTab(item.value)}
                      // tooltip when collapsed
                      data-tooltip={sidebarCollapsed ? item.label : undefined}
                      title={sidebarCollapsed ? item.label : undefined}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {/* Left icon / initial */}
                      <span className="sidebar-item-icon" aria-hidden>
                        {icon ? icon : item.label.charAt(0)}
                      </span>

                      {/* Label (hidden in collapsed) */}
                      {!sidebarCollapsed && (
                        <span className="sidebar-item-label">{item.label}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
