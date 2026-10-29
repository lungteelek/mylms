'use client';

type WorkspaceSidebarGroup = {
  label: string;
  items: Array<{
    key: string;
    label: string;
    note?: string;
    active?: boolean;
  }>;
};

type WorkspaceSidebarProps = {
  groups: WorkspaceSidebarGroup[];
  onNavigate: (key: string) => void;
};

export function WorkspaceSidebar({ groups, onNavigate }: WorkspaceSidebarProps) {
  return (
    <aside className="workspace-nav" aria-label="Workspace navigation">
      {groups.map((group) => (
        <div key={group.label} className="nav-group">
          <span className="nav-group-title">{group.label}</span>
          <div className="nav-group-items">
            {group.items.map((item) => (
              <button
                key={item.key}
                className={`nav-link${item.active ? ' is-active' : ''}`}
                type="button"
                onClick={() => onNavigate(item.key)}
                aria-current={item.active ? 'page' : undefined}
              >
                <span className="nav-link-label">{item.label}</span>
                {item.note ? <span className="nav-link-note">{item.note}</span> : null}
              </button>
            ))}
          </div>
        </div>
      ))}
    </aside>
  );
}
