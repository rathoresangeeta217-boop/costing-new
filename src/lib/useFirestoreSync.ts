import { useEffect, useRef } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { useAuth } from './AuthContext';
import { db } from './firebase';
import { collection, doc, getDocs, setDoc, query, where, writeBatch } from 'firebase/firestore';

export function useFirestoreSync() {
  const { user } = useAuth();
  const { projects } = useProjectStore();
  const isFirstLoad = useRef(true);

  // Load from Firestore on login
  useEffect(() => {
    async function loadProjects() {
      if (user) {
        try {
          const q = query(collection(db, 'projects'), where('userId', '==', user.uid));
          const snapshot = await getDocs(q);
          const fbProjects = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: data.id,
              name: data.name,
              clientName: data.clientName || '',
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
              items: data.items || []
            };
          });
          
          if (fbProjects.length > 0) {
            // Merge with local projects or replace?
            // For simplicity, we just set the store to use fbProjects if it has any,
            // or maybe combine them avoiding duplicates based on ID.
            useProjectStore.setState(state => {
              const existingIds = new Set(fbProjects.map(p => p.id));
              const localOnly = state.projects.filter(p => !existingIds.has(p.id));
              return { projects: [...fbProjects, ...localOnly] };
            });
          }
        } catch (e) {
          console.error('Error loading projects:', e);
        }
      }
      isFirstLoad.current = false;
    }
    
    if (user) {
      loadProjects();
    } else {
      isFirstLoad.current = false;
    }
  }, [user]);

  // Save to Firestore on change
  useEffect(() => {
    async function syncProjects() {
      if (user && !isFirstLoad.current) {
        try {
          const batch = writeBatch(db);
          for (const project of projects) {
            const docRef = doc(db, 'projects', project.id);
            batch.set(docRef, {
              ...project,
              userId: user.uid
            }, { merge: true });
          }
          await batch.commit();
        } catch (e) {
          console.error('Error saving projects:', e);
        }
      }
    }
    
    syncProjects();
  }, [projects, user]);
}
