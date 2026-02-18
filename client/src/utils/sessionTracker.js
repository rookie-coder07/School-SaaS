/**
 * Session Tracker - Tracks user login/logout and session duration
 * Minimal footprint - uses existing auth endpoints for tracking
 */

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

class SessionTracker {
  constructor() {
    this.sessionStartTime = null;
    this.userId = null;
    this.role = null;
    this.schoolId = null;
    this.sessionTimeout = null;
  }

  /**
   * Start tracking a user session
   */
  startSession(userId, role, schoolId) {
    if (!userId || !role || !schoolId) {
      console.error('❌ SessionTracker: Invalid session data -', { userId, role, schoolId });
      return;
    }

    this.userId = userId;
    this.role = role;
    this.schoolId = schoolId;
    this.sessionStartTime = Date.now();

    console.log('🟢 SessionTracker: Session started -', {
      userId,
      role,
      schoolId,
      timestamp: new Date().toISOString(),
    });

    // Save to sessionStorage for current session
    sessionStorage.setItem('session_start', JSON.stringify({
      userId,
      role,
      schoolId,
      startTime: this.sessionStartTime,
      timestamp: new Date().toISOString(),
    }));

    // Send to backend immediately
    this.logSession('login');

    // Auto-logout after 24 hours of inactivity/activity
    this.setupSessionTimeout();
  }

  /**
   * End tracking a user session
   */
  async endSession() {
    if (!this.userId) return;

    const duration = Math.floor((Date.now() - this.sessionStartTime) / 1000); // in seconds

    // Clear sessionStorage
    sessionStorage.removeItem('session_start');

    // Send logout event
    await this.logSession('logout', duration);

    // Clear timeout
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
    }

    // Reset state
    this.sessionStartTime = null;
    this.userId = null;
    this.role = null;
    this.schoolId = null;
  }

  /**
   * Log session event to backend
   */
  async logSession(eventType, duration = 0) {
    try {
      const token = this.getToken();
      if (!token) {
        console.warn('⚠️ SessionTracker: No token found');
        return;
      }

      const payload = {
        userId: this.userId,
        role: this.role,
        schoolId: this.schoolId,
        eventType, // 'login' | 'logout'
        startTime: this.sessionStartTime,
        duration, // in seconds (only for logout)
        date: new Date().toISOString(),
      };

      console.log('📤 SessionTracker: Sending', eventType, 'event:', payload);

      const response = await fetch(`${API_URL}/api/tracking/session-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.warn('⚠️ SessionTracker: Server error:', errorData);
        return;
      }

      console.log('✅ SessionTracker: Event logged successfully');
    } catch (err) {
      console.warn('⚠️ SessionTracker: Failed to log session:', err.message);
      // Silently fail - don't disrupt user experience
    }
  }

  /**
   * Get token based on role
   */
  getToken() {
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) return adminToken;

    const teacherToken = localStorage.getItem('teacherToken');
    if (teacherToken) return teacherToken;

    const studentToken = localStorage.getItem('studentToken');
    if (studentToken) return studentToken;

    return null;
  }

  /**
   * Setup auto-logout timeout (24 hours)
   */
  setupSessionTimeout() {
    if (this.sessionTimeout) clearTimeout(this.sessionTimeout);
    const TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours
    this.sessionTimeout = setTimeout(() => {
      this.endSession();
    }, TIMEOUT_MS);
  }

  /**
   * Check if session exists in sessionStorage
   */
  hasActiveSession() {
    const sessionData = sessionStorage.getItem('session_start');
    return !!sessionData;
  }

  /**
   * Get current session info
   */
  getSessionInfo() {
    const sessionData = sessionStorage.getItem('session_start');
    if (!sessionData) return null;
    return JSON.parse(sessionData);
  }
}

// Export singleton instance
export const sessionTracker = new SessionTracker();
export default sessionTracker;
