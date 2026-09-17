import { AgentProfile, DEFAULT_AGENTS } from '../types';

const STORAGE_KEY_AGENTS = 'loyalis_trans_agents_v2';
const STORAGE_KEY_SESSION = 'loyalis_trans_auth_session_v2';

/**
 * Clean up legacy storage or retrieve agents.
 * Ensures Amine (010904 / 010904) is always present as Administrator,
 * and Sofiane is deleted as requested by user.
 */
export function getStoredAgents(): AgentProfile[] {
  if (typeof window === 'undefined') return DEFAULT_AGENTS;

  try {
    const raw = localStorage.getItem(STORAGE_KEY_AGENTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_AGENTS, JSON.stringify(DEFAULT_AGENTS));
      return DEFAULT_AGENTS;
    }

    const parsed: AgentProfile[] = JSON.parse(raw);
    
    // Purge any legacy 'Sofiane' profile
    const cleaned = parsed.filter(a => 
      a.id !== 'agent-sofiane' && 
      a.name?.toLowerCase() !== 'sofiane'
    );

    // Verify Amine exists with correct credentials
    const amineIdx = cleaned.findIndex(a => a.id === 'agent-amine' || a.name?.toLowerCase() === 'amine');
    if (amineIdx === -1) {
      cleaned.unshift(DEFAULT_AGENTS[0]);
    } else {
      // Ensure Amine has login credentials
      cleaned[amineIdx].username = cleaned[amineIdx].username || '010904';
      cleaned[amineIdx].password = cleaned[amineIdx].password || '010904';
      cleaned[amineIdx].role = 'ADMIN';
      cleaned[amineIdx].canDelete = true;
      cleaned[amineIdx].canValidate = true;
    }

    // Save cleaned version if modified
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY_AGENTS, JSON.stringify(cleaned));
    }

    return cleaned;
  } catch (err) {
    console.error('Error reading stored agents:', err);
    return DEFAULT_AGENTS;
  }
}

export function saveStoredAgents(agents: AgentProfile[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_AGENTS, JSON.stringify(agents));
  } catch (err) {
    console.error('Error saving agents:', err);
  }
}

/**
 * Authenticate agent with username & password
 */
export function authenticateAgent(
  usernameInput: string, 
  passwordInput: string
): { success: boolean; agent?: AgentProfile; error?: string } {
  const cleanUser = (usernameInput || '').trim();
  const cleanPass = (passwordInput || '').trim();

  if (!cleanUser || !cleanPass) {
    return { success: false, error: 'Veuillez saisir votre identifiant et mot de passe.' };
  }

  const agents = getStoredAgents();

  // Find matching agent
  const matched = agents.find(a => 
    a.username?.trim().toLowerCase() === cleanUser.toLowerCase() &&
    a.password?.trim() === cleanPass
  );

  if (!matched) {
    return { success: false, error: 'Identifiant ou mot de passe incorrect.' };
  }

  // Create safe session copy
  const sessionUser: AgentProfile = {
    ...matched,
    // Keep password out of session object for hygiene
    password: '***'
  };

  saveCurrentSession(sessionUser);
  return { success: true, agent: sessionUser };
}

/**
 * Get active session agent profile or null
 */
export function getCurrentSession(): AgentProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSION);
    if (!raw) return null;
    const session = JSON.parse(raw) as AgentProfile;
    // Verify agent is not Sofiane
    if (session.id === 'agent-sofiane' || session.name?.toLowerCase() === 'sofiane') {
      clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

/**
 * Save current session
 */
export function saveCurrentSession(agent: AgentProfile | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!agent) {
      localStorage.removeItem(STORAGE_KEY_SESSION);
    } else {
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(agent));
    }
  } catch (err) {
    console.error('Error saving session:', err);
  }
}

/**
 * Clear session (Logout)
 */
export function clearSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY_SESSION);
  } catch (err) {
    console.error('Error clearing session:', err);
  }
}

export const endCurrentSession = clearSession;

/**
 * Add a new agent profile (Only by Admin)
 */
export function createNewAgentProfile(data: {
  name: string;
  username: string;
  password: string;
  role: 'ADMIN' | 'AGENT';
  agencyCity: string;
  canDelete: boolean;
  canValidate: boolean;
  phone?: string;
}): { success: boolean; agent?: AgentProfile; error?: string } {
  const cleanName = data.name.trim();
  const cleanUsername = data.username.trim();
  const cleanPassword = data.password.trim();

  if (!cleanName) {
    return { success: false, error: 'Le nom du profil est obligatoire.' };
  }
  if (!cleanUsername) {
    return { success: false, error: "L'identifiant est obligatoire." };
  }
  if (!cleanPassword) {
    return { success: false, error: 'Le mot de passe est obligatoire.' };
  }

  const agents = getStoredAgents();

  // Check username uniqueness
  const exists = agents.some(a => a.username?.toLowerCase() === cleanUsername.toLowerCase());
  if (exists) {
    return { success: false, error: `L'identifiant "${cleanUsername}" est déjà utilisé par un autre profil.` };
  }

  const newId = `agent-${Date.now()}`;
  const initials = cleanName
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2) || cleanName.substring(0, 2).toUpperCase();

  const newAgent: AgentProfile = {
    id: newId,
    name: cleanName,
    username: cleanUsername,
    password: cleanPassword,
    role: data.role,
    agencyCity: data.agencyCity.trim() || 'Casablanca',
    canDelete: data.role === 'ADMIN' ? true : data.canDelete,
    canValidate: data.role === 'ADMIN' ? true : data.canValidate,
    color: data.role === 'ADMIN' ? 'orange' : 'blue',
    avatarInitials: initials,
    phone: data.phone?.trim() || '',
    createdAt: new Date().toISOString()
  };

  const updated = [...agents, newAgent];
  saveStoredAgents(updated);

  return { success: true, agent: newAgent };
}

/**
 * Update an existing agent (roles, permissions, password)
 */
export function updateAgentProfile(
  agentId: string, 
  updates: Partial<AgentProfile>
): { success: boolean; agent?: AgentProfile; error?: string } {
  const agents = getStoredAgents();
  const idx = agents.findIndex(a => a.id === agentId);
  if (idx === -1) {
    return { success: false, error: 'Profil introuvable.' };
  }

  // Check username collision if username is being changed
  if (updates.username) {
    const cleanUser = updates.username.trim();
    const collision = agents.some(a => a.id !== agentId && a.username?.toLowerCase() === cleanUser.toLowerCase());
    if (collision) {
      return { success: false, error: `L'identifiant "${cleanUser}" est déjà utilisé.` };
    }
  }

  const current = agents[idx];
  const updatedAgent: AgentProfile = {
    ...current,
    ...updates,
    // If role is set to ADMIN, automatically grant canDelete & canValidate
    canDelete: updates.role === 'ADMIN' ? true : (updates.canDelete !== undefined ? updates.canDelete : current.canDelete),
    canValidate: updates.role === 'ADMIN' ? true : (updates.canValidate !== undefined ? updates.canValidate : current.canValidate)
  };

  agents[idx] = updatedAgent;
  saveStoredAgents(agents);

  // If current session is this agent, update session as well
  const currentSession = getCurrentSession();
  if (currentSession && currentSession.id === agentId) {
    saveCurrentSession({
      ...updatedAgent,
      password: '***'
    });
  }

  return { success: true, agent: updatedAgent };
}

/**
 * Delete an agent profile
 * Note: Amine cannot be deleted.
 */
export function deleteAgentProfile(agentId: string): { success: boolean; error?: string } {
  if (agentId === 'agent-amine') {
    return { success: false, error: "Le profil principal d'Amine (Administrateur) ne peut pas être supprimé." };
  }

  const agents = getStoredAgents();
  const filtered = agents.filter(a => a.id !== agentId);
  if (filtered.length === agents.length) {
    return { success: false, error: 'Profil introuvable.' };
  }

  saveStoredAgents(filtered);

  // If current session was this user, logout
  const session = getCurrentSession();
  if (session && session.id === agentId) {
    clearSession();
  }

  return { success: true };
}
