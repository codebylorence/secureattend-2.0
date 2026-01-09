// Team Leader Event System
// This utility helps coordinate team leader updates across components

class TeamLeaderEventManager {
  constructor() {
    this.listeners = [];
  }

  // Subscribe to team leader updates
  subscribe(callback) {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Notify all subscribers that team leaders need to be refreshed
  notifyTeamLeaderUpdate() {
    console.log('🔄 TeamLeaderEventManager: Notifying team leader update to', this.listeners.length, 'listeners');
    this.listeners.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in team leader update callback:', error);
      }
    });
  }
}

// Create a singleton instance
const teamLeaderEventManager = new TeamLeaderEventManager();

export default teamLeaderEventManager;