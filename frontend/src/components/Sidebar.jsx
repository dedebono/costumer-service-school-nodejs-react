import React, { useState } from 'react';

export default function Sidebar({ tab, setTab, groupedTabs }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <aside className={`sidebar${sidebarCollapsed ? ' collapsed' : ''}`}>
      <button className="sidebar-toggle" onClick={() => setSidebarCollapsed(c => !c)} aria-label="Toggle sidebar">
        {sidebarCollapsed ? '▶' : '◀'}
      </button>
      <div className="sidebar-content">
        {groupedTabs.map((group) => (
          <div key={group.title} className="sidebar-group">
            {!sidebarCollapsed && <div className="sidebar-group-title">{group.title}</div>}
            <ul className="sidebar-list">
              {group.items.map((item) => (
                <li key={item.value}>
                  <button
                    className={`sidebar-item${tab === item.value ? ' active' : ''}`}
                    onClick={() => setTab(item.value)}
                    title={sidebarCollapsed ? item.label : undefined}
                    aria-current={tab === item.value ? 'page' : undefined}
                  >
                    {!sidebarCollapsed ? item.label : item.label.charAt(0)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
