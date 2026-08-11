import type { Role } from '../../types'

export default function RoleBadge({ role, small = false }: { role: Role; small?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${small ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'}`}
      style={{ backgroundColor: `${role.color}1A`, color: role.color }}
      title={role.role_type === 'year' ? 'Year role' : 'Club role'}
    >
      {role.name}
    </span>
  )
}
