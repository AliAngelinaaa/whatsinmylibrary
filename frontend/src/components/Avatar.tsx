import { Link } from 'react-router-dom'

export type AvatarUser = {
  fullName: string
  username?: string
  avatarColor?: string
  avatarUrl?: string
}

export function avatarInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function userProfilePath(user: { username?: string }) {
  return user.username ? `/user/${user.username}` : null
}

type AvatarProps = {
  user: AvatarUser
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero' | 'tumblr'
  className?: string
  link?: boolean
}

export default function Avatar({ user, size = 'md', className = '', link = false }: AvatarProps) {
  const hasImage = !!user.avatarUrl
  const classes = ['avatar', `avatar-${size}`, hasImage ? 'has-image' : '', className]
    .filter(Boolean)
    .join(' ')

  const content = hasImage ? (
    <img src={user.avatarUrl} alt="" className="avatar-img" />
  ) : (
    avatarInitials(user.fullName)
  )

  const el = (
    <span
      className={classes}
      style={hasImage ? undefined : { background: user.avatarColor || '#957DAD' }}
    >
      {content}
    </span>
  )

  const path = link ? userProfilePath(user) : null
  if (path) {
    return (
      <Link to={path} className="avatar-link" title={`View ${user.fullName}'s profile`}>
        {el}
      </Link>
    )
  }

  return el
}
