import { supabase } from './supabase';

const QUEUE_KEY = 'pulse_offline_queue';

export const queueMutation = (action, table, payload, matchCriteria = null, tempId = null) => {
  const queue = JSON.parse(window.localStorage.getItem(QUEUE_KEY) || '[]');
  
  if (tempId) {
    // Check if there is already a pending insert for this tempId
    const pendingInsertIndex = queue.findIndex(m => m.tempId === tempId && m.action === 'insert');
    
    if (pendingInsertIndex !== -1) {
      if (action === 'update') {
        // Merge the update into the pending insert payload
        // Note: For upsert/insert the payload might be an array, but in this app it's often a single object or an array of one
        if (Array.isArray(queue[pendingInsertIndex].payload) && queue[pendingInsertIndex].payload.length > 0) {
            queue[pendingInsertIndex].payload[0] = {
                ...queue[pendingInsertIndex].payload[0],
                ...payload
            };
        } else {
            queue[pendingInsertIndex].payload = {
                ...queue[pendingInsertIndex].payload,
                ...payload
            };
        }
        window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        return;
      } else if (action === 'delete') {
        // If it's a delete for a pending insert, just remove the insert from the queue
        queue.splice(pendingInsertIndex, 1);
        window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        return;
      }
    }
  }

  queue.push({
    id: Date.now().toString(),
    action,
    table,
    payload,
    matchCriteria,
    tempId,
    timestamp: new Date().toISOString()
  });
  
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const syncOfflineQueue = async () => {
  if (!navigator.onLine) return;

  const queue = JSON.parse(window.localStorage.getItem(QUEUE_KEY) || '[]');
  if (queue.length === 0) return;

  const remainingQueue = [];

  for (const mutation of queue) {
    try {
      let query = supabase.from(mutation.table);
      
      switch (mutation.action) {
        case 'insert':
          query = query.insert(mutation.payload);
          break;
        case 'update':
          query = query.update(mutation.payload);
          if (mutation.matchCriteria) {
             for (const [key, value] of Object.entries(mutation.matchCriteria)) {
                query = query.eq(key, value);
             }
          }
          break;
        case 'upsert':
          query = query.upsert(mutation.payload, mutation.matchCriteria);
          break;
        case 'delete':
          query = query.delete();
          if (mutation.matchCriteria) {
             for (const [key, value] of Object.entries(mutation.matchCriteria)) {
                query = query.eq(key, value);
             }
          }
          break;
      }
      
      const { error } = await query;
      
      if (error) {
        console.error(`Failed to sync mutation ${mutation.id}:`, error);
        // If it's a network error during sync, we keep it in the queue
        if (error.message === 'Failed to fetch' || error.message.includes('NetworkError')) {
           remainingQueue.push(mutation);
        }
      }
    } catch (e) {
      console.error('Unexpected error during sync:', e);
      if (e.message === 'Failed to fetch' || e.message.includes('NetworkError')) {
        remainingQueue.push(mutation);
      }
    }
  }

  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(remainingQueue));
};
