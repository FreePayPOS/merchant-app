// Simple broadcast utility for testing
export function broadcast(message: object) {
  // In test environment, just log the message
  if (process.env.NODE_ENV === 'test') {
    console.log('Broadcast:', message);
    return;
  }
  
  // In production, this would be replaced by the actual WebSocket broadcast
  // For now, just log
  console.log('Broadcast:', message);
} 