export default function TabBar({ tabs, value, onChange }) {
return (
<div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
{Object.entries(tabs).map(([k, label]) => (
<button
key={k}
onClick={() => onChange(k)}
style={{
padding: '8px 12px',
borderRadius: 8,
border: '1px solid #ddd',
background: value === k ? '#111' : '#fff',
color: value === k ? '#fff' : '#111',
cursor: 'pointer'
}}
>
{label}
</button>
))}
</div>
);
}