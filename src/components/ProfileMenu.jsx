import { useCallback, useRef, useState } from 'react';
import { useToast } from './Toast.jsx';
import { MoreIcon, FlagIcon, BlockIcon } from './Icons.jsx';
import { useReport } from './Report.jsx';
import PopMenu from './PopMenu.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useBlocks, block, unblock } from '../lib/blocks.js';
import { useI18n, errorText } from '../lib/i18n.jsx';

// „⋯“ an Profilen und im Chat: Person melden, blockieren oder Blockierung aufheben
export default function ProfileMenu({
  kind,
  targetId,
  userId,
  name,
  className = 'ghost-btn icon-only',
  onBlockChange,
  align = 'right',
}) {
  const { t } = useI18n();
  const toast = useToast();
  const report = useReport();
  const { user } = useAuth();
  const { ids } = useBlocks();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const blocked = Boolean(userId && ids.has(userId));

  const close = useCallback(() => setOpen(false), []);

  async function toggleBlock() {
    setOpen(false);
    if (!blocked && !window.confirm(t('block.confirm', { name }))) return;
    try {
      if (blocked) await unblock(userId, user.id);
      else await block(userId, user.id);
      toast(blocked ? t('block.removed', { name }) : t('block.done', { name }));
      onBlockChange?.(!blocked);
    } catch (err) {
      toast(errorText(t, err));
    }
  }

  return (
    <div className="profile-menu" ref={ref}>
      <button
        type="button"
        className={className}
        aria-label={t('feed.options')}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <MoreIcon />
      </button>
      <PopMenu open={open} onClose={close} anchorRef={ref} width={220} align={align}>
        <button
          type="button"
          className="menu-item"
          onClick={() => {
            setOpen(false);
            report({ kind, targetId, name });
          }}
        >
          <FlagIcon /> {t('report.action')}
        </button>
        {userId && (
          <button type="button" className={`menu-item ${blocked ? '' : 'danger'}`} onClick={toggleBlock}>
            <BlockIcon /> {blocked ? t('block.unblock') : t('block.block')}
          </button>
        )}
      </PopMenu>
    </div>
  );
}
