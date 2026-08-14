import { Router } from 'express';
import { all, get, run, localNow } from '../db/database.js';
import { authMiddleware, verifiedMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);
router.use(verifiedMiddleware);

// Get my family group
router.get('/group', async (req, res) => {
  const group = await get(`
    SELECT fg.* FROM family_groups fg
    JOIN family_members fm ON fg.id = fm.group_id
    WHERE fm.user_id = ?
  `, [req.userId]);
  if (!group) return res.json({ group: null, members: [] });

  const members = await all(`
    SELECT fm.role, fm.joined_at, u.id, u.name, u.surname, u.email, u.avatar
    FROM family_members fm
    JOIN users u ON fm.user_id = u.id
    WHERE fm.group_id = ?
    ORDER BY fm.role DESC, fm.joined_at
  `, [group.id]);

  res.json({ group, members });
});

// Create family group
router.post('/group', async (req, res) => {
  const existing = await get(`
    SELECT fg.id FROM family_groups fg
    JOIN family_members fm ON fg.id = fm.group_id
    WHERE fm.user_id = ?
  `, [req.userId]);
  if (existing) return res.status(400).json({ error: 'Fai già parte di un gruppo famiglia' });

  const { name } = req.body;
  if (!name || name.trim().length < 2) return res.status(400).json({ error: 'Nome gruppo obbligatorio' });

  const result = await run(
    'INSERT INTO family_groups (name, owner_id, created_at) VALUES (?, ?, ?)',
    [name.trim(), req.userId, localNow()]
  );
  const groupId = result.lastInsertRowid;

  await run(
    'INSERT INTO family_members (group_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)',
    [groupId, req.userId, 'owner', localNow()]
  );

  res.status(201).json({ message: 'Gruppo creato', groupId });
});

// Search user by email to invite
router.get('/search', async (req, res) => {
  const { email } = req.query;
  if (!email || email.trim().length < 3) return res.json([]);

  const users = await all(`
    SELECT id, name, surname, email FROM users
    WHERE email ILIKE ? AND id != ? AND email_verified = true
    LIMIT 10
  `, [`%${email.trim()}%`, req.userId]);

  res.json(users);
});

// Send invite
router.post('/invite', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email obbligatoria' });

  const group = await get(`
    SELECT fg.id FROM family_groups fg
    JOIN family_members fm ON fg.id = fm.group_id
    WHERE fm.user_id = ?
  `, [req.userId]);
  if (!group) return res.status(400).json({ error: 'Devi prima creare un gruppo famiglia' });

  const invitee = await get('SELECT id, name, email FROM users WHERE email = ? AND email_verified = true', [email]);
  if (!invitee) return res.status(404).json({ error: 'Utente non trovato' });
  if (invitee.id === req.userId) return res.status(400).json({ error: 'Non puoi invitare te stesso' });

  const alreadyMember = await get(
    'SELECT id FROM family_members WHERE group_id = ? AND user_id = ?',
    [group.id, invitee.id]
  );
  if (alreadyMember) return res.status(400).json({ error: 'Utente già nel gruppo' });

  const existingInvite = await get(
    "SELECT id FROM family_invites WHERE group_id = ? AND invitee_id = ? AND status = 'pending'",
    [group.id, invitee.id]
  );
  if (existingInvite) return res.status(400).json({ error: 'Invito già inviato' });

  await run(
    'INSERT INTO family_invites (group_id, inviter_id, invitee_id, status, created_at) VALUES (?, ?, ?, ?, ?)',
    [group.id, req.userId, invitee.id, 'pending', localNow()]
  );

  res.status(201).json({ message: `Invito inviato a ${invitee.name || invitee.email}` });
});

// Get my pending invites
router.get('/invites', async (req, res) => {
  const invites = await all(`
    SELECT fi.id, fi.created_at, fg.name as group_name, u.name as inviter_name, u.surname as inviter_surname, u.email as inviter_email
    FROM family_invites fi
    JOIN family_groups fg ON fi.group_id = fg.id
    JOIN users u ON fi.inviter_id = u.id
    WHERE fi.invitee_id = ? AND fi.status = 'pending'
    ORDER BY fi.created_at DESC
  `, [req.userId]);
  res.json(invites);
});

// Accept invite
router.post('/invites/:id/accept', async (req, res) => {
  const invite = await get(
    'SELECT * FROM family_invites WHERE id = ? AND invitee_id = ? AND status = ?',
    [req.params.id, req.userId, 'pending']
  );
  if (!invite) return res.status(404).json({ error: 'Invito non trovato' });

  const existingGroup = await get(`
    SELECT fg.id FROM family_groups fg
    JOIN family_members fm ON fg.id = fm.group_id
    WHERE fm.user_id = ?
  `, [req.userId]);
  if (existingGroup) return res.status(400).json({ error: 'Fai già parte di un gruppo famiglia' });

  await run("UPDATE family_invites SET status = 'accepted' WHERE id = ?", [invite.id]);
  await run(
    'INSERT INTO family_members (group_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)',
    [invite.group_id, req.userId, 'member', localNow()]
  );

  res.json({ message: 'Invito accettato' });
});

// Reject invite
router.post('/invites/:id/reject', async (req, res) => {
  const invite = await get(
    'SELECT * FROM family_invites WHERE id = ? AND invitee_id = ? AND status = ?',
    [req.params.id, req.userId, 'pending']
  );
  if (!invite) return res.status(404).json({ error: 'Invito non trovato' });

  await run("UPDATE family_invites SET status = 'rejected' WHERE id = ?", [invite.id]);
  res.json({ message: 'Invito rifiutato' });
});

// Remove member (owner only)
router.delete('/members/:userId', async (req, res) => {
  const group = await get(`
    SELECT fg.id FROM family_groups fg
    JOIN family_members fm ON fg.id = fm.group_id
    WHERE fm.user_id = ? AND fm.role = 'owner'
  `, [req.userId]);
  if (!group) return res.status(403).json({ error: 'Solo il proprietario può rimuovere membri' });
  if (parseInt(req.params.userId) === req.userId) return res.status(400).json({ error: 'Non puoi rimuovere te stesso' });

  await run('DELETE FROM family_members WHERE group_id = ? AND user_id = ?', [group.id, req.params.userId]);
  res.json({ message: 'Membro rimosso' });
});

// Leave group
router.post('/leave', async (req, res) => {
  const member = await get(
    'SELECT * FROM family_members WHERE user_id = ?', [req.userId]
  );
  if (!member) return res.status(400).json({ error: 'Non fai parte di nessun gruppo' });
  if (member.role === 'owner') return res.status(400).json({ error: 'Il proprietario non può lasciare il gruppo. Trasferisci la proprietà o elimina il gruppo.' });

  await run('DELETE FROM family_members WHERE user_id = ?', [req.userId]);
  res.json({ message: 'Hai lasciato il gruppo' });
});

// Delete group (owner only)
router.delete('/group', async (req, res) => {
  const group = await get(`
    SELECT fg.id FROM family_groups fg
    JOIN family_members fm ON fg.id = fm.group_id
    WHERE fm.user_id = ? AND fm.role = 'owner'
  `, [req.userId]);
  if (!group) return res.status(403).json({ error: 'Solo il proprietario può eliminare il gruppo' });

  await run('DELETE FROM family_groups WHERE id = ?', [group.id]);
  res.json({ message: 'Gruppo eliminato' });
});

export default router;
