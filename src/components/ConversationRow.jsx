import { Link } from 'react-router-dom';
import Avatar from './Avatar.jsx';
import { useI18n } from '../lib/i18n.jsx';
import { timeAgo } from '../lib/time.js';

// Link zur Gegenseite einer Unterhaltung (Mitgliederprofile nur für Escorts und Admins)
export function otherLink(other, viewer) {
  if (other.kind === 'escort') return `/escort/${other.slug}`;
  if (viewer && (viewer.role === 'escort' || viewer.isAdmin)) return `/member/${other.memberId}`;
  return null;
}

export function ConversationRow({ c, compact = false }) {
  const { t, locale } = useI18n();
  return (
    <Link to={`/messages/${c.id}`} className={`conv-row ${compact ? 'compact' : ''} ${c.unread ? 'unread' : ''}`}>
      <Avatar name={c.other.name} thumb={c.other.thumb} size={compact ? 38 : 48} />
      <span className="conv-main">
        <span className="conv-top">
          <b>{c.other.name}</b>
          <small>{c.last ? timeAgo(c.last.at, locale, 'short') : ''}</small>
        </span>
        <span className="conv-snippet">{c.last ? `${c.last.mine ? `${t('msg.you')}: ` : ''}${c.last.body}` : ''}</span>
      </span>
      {c.unread > 0 && <span className="count-badge">{c.unread}</span>}
    </Link>
  );
}
