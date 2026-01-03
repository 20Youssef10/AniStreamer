
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, limit, getDocs, addDoc, deleteDoc, onSnapshot, orderBy, arrayUnion, arrayRemove } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { UserProfile, UserListEntry, AppConfig, FeatureLockConfig, AppNotification, SavedSearch, DiscussionPost, Episode, ManualChapter, Club, ChatMessage, WatchParty, CollectedCharacter, NewsArticle, CharacterComment, SupportMessage, SupportChat, AppBranding, XPRewardsConfig, AILimitsConfig, AIFeatureConfig } from '../types';
import { DEFAULT_CONFIG } from '../constants';

class FirebaseService {
  private app: any;
  private auth: any;
  private db: any;
  private messaging: any;

  async init() {
    this.app = initializeApp(DEFAULT_CONFIG.firebase);
    this.auth = getAuth(this.app);
    this.db = getFirestore(this.app);
    try {
        this.messaging = getMessaging(this.app);
    } catch (e) {
        console.warn("Messaging not supported");
    }
  }

  getAuthInstance() {
    return this.auth;
  }

  // --- Auth ---
  async loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(this.auth, provider);
    await this.checkUserExists(this.auth.currentUser);
  }

  async loginAnonymously() {
    await signInAnonymously(this.auth);
  }

  async registerWithEmail(email: string, pass: string) {
      const cred = await createUserWithEmailAndPassword(this.auth, email, pass);
      await this.checkUserExists(cred.user);
  }

  async loginWithEmail(email: string, pass: string) {
      await signInWithEmailAndPassword(this.auth, email, pass);
  }

  async logout() {
    await signOut(this.auth);
  }

  async checkUserExists(user: any) {
      if (!user) return;
      const ref = doc(this.db, "users", user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
          const newUser: UserProfile = {
              uid: user.uid,
              displayName: user.displayName || 'User',
              photoURL: user.photoURL || '',
              email: user.email || '',
              level: 1,
              xp: 0,
              settings: {} as any
          };
          await setDoc(ref, newUser);
      }
  }

  // --- User ---
  async getUserData(uid: string): Promise<UserProfile | null> {
    const snap = await getDoc(doc(this.db, "users", uid));
    return snap.exists() ? (snap.data() as UserProfile) : null;
  }

  async getUserByUsername(username: string): Promise<UserProfile | null> {
    const q = query(collection(this.db, "users"), where("username", "==", username), limit(1));
    const snap = await getDocs(q);
    return !snap.empty ? (snap.docs[0].data() as UserProfile) : null;
  }

  async checkUsernameAvailability(username: string, currentUid: string): Promise<boolean> {
      const q = query(collection(this.db, "users"), where("username", "==", username));
      const snap = await getDocs(q);
      if (snap.empty) return true;
      return snap.docs[0].id === currentUid;
  }

  async updateUserProfile(displayName: string, photoURL: string, bio: string, username: string) {
      if (!this.auth.currentUser) return;
      await updateDoc(doc(this.db, "users", this.auth.currentUser.uid), { displayName, photoURL, bio, username });
      await updateProfile(this.auth.currentUser, { displayName, photoURL });
  }

  async getAllUsers(): Promise<UserProfile[]> {
      const snap = await getDocs(collection(this.db, "users"));
      return snap.docs.map(d => d.data() as UserProfile);
  }

  async updateUserSettings(uid: string, settings: any) {
      await updateDoc(doc(this.db, "users", uid), { settings });
  }

  // --- List ---
  async getUserAnimeList(uid: string): Promise<UserListEntry[]> {
      const snap = await getDocs(collection(this.db, "users", uid, "list"));
      return snap.docs.map(d => d.data() as UserListEntry);
  }

  subscribeToUserList(uid: string, callback: (data: UserListEntry[]) => void) {
      return onSnapshot(collection(this.db, "users", uid, "list"), (snap) => {
          callback(snap.docs.map(d => d.data() as UserListEntry));
      });
  }

  async updateUserAnimeEntry(uid: string, entry: UserListEntry) {
      await setDoc(doc(this.db, "users", uid, "list", entry.animeId.toString()), entry);
  }

  async importUserList(uid: string, entries: UserListEntry[]) {
      const batch = await import('firebase/firestore').then(m => m.writeBatch(this.db));
      entries.forEach(entry => {
          const ref = doc(this.db, "users", uid, "list", entry.animeId.toString());
          batch.set(ref, entry);
      });
      await batch.commit();
  }

  // --- XP & Rewards ---
  async awardXP(uid: string, amount: number, source: string = 'generic') {
      const ref = doc(this.db, "users", uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) return { newLevel: 0 };
      
      const data = snap.data() as UserProfile;
      const newXP = data.xp + amount;
      const newLevel = Math.floor(Math.sqrt(newXP / 100)) + 1;
      
      const updates: any = { xp: newXP, level: newLevel };
      let unlockedBadge = undefined;

      // Badge Logic (Simplified Probabilistic)
      const badges = data.badges || [];
      const hasBadge = (name: string) => badges.some(b => b.name === name);

      if (source === 'trivia' && !hasBadge('Brainiac') && Math.random() > 0.7) {
          unlockedBadge = { name: 'Brainiac', description: 'Master of anime knowledge', icon: '🧠', unlockedAt: Date.now() };
      } else if (source === 'gacha' && !hasBadge('Whale') && Math.random() > 0.9) {
          unlockedBadge = { name: 'Whale', description: 'Gacha addict', icon: '🐳', unlockedAt: Date.now() };
      } else if (source === 'reflex' && !hasBadge('Ninja') && Math.random() > 0.8) {
          unlockedBadge = { name: 'Ninja', description: 'Lightning fast reflexes', icon: '⚡', unlockedAt: Date.now() };
      } else if (source === 'memory' && !hasBadge('Eidetic') && Math.random() > 0.8) {
          unlockedBadge = { name: 'Eidetic', description: 'Perfect memory', icon: '🃏', unlockedAt: Date.now() };
      } else if (newLevel >= 10 && !hasBadge('Veteran')) {
          unlockedBadge = { name: 'Veteran', description: 'Reached Level 10', icon: '🎖️', unlockedAt: Date.now() };
      }

      if (unlockedBadge) {
          updates.badges = arrayUnion(unlockedBadge);
      }
      
      await updateDoc(ref, updates);
      return { newLevel: newLevel > data.level ? newLevel : 0, unlockedBadge };
  }

  // --- System ---
  async getSystemConfig() {
      const snap = await getDoc(doc(this.db, "system", "config"));
      return snap.exists() ? snap.data() : null;
  }

  async updateSystemConfig(config: any) {
      await setDoc(doc(this.db, "system", "config"), config, { merge: true });
  }

  async getTranslations() {
      const snap = await getDoc(doc(this.db, "system", "translations"));
      return snap.exists() ? snap.data() : null;
  }

  async saveTranslations(translations: any) {
      await setDoc(doc(this.db, "system", "translations"), translations);
  }

  async getAIFeatures(): Promise<AIFeatureConfig> {
      const snap = await getDoc(doc(this.db, "system", "ai_features"));
      return snap.exists() ? snap.data() as AIFeatureConfig : {};
  }

  // --- Content ---
  async getEpisodes(animeId: number): Promise<Episode[]> {
      const snap = await getDocs(collection(this.db, "anime", animeId.toString(), "episodes"));
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Episode));
  }

  subscribeToEpisodes(animeId: number, callback: (episodes: Episode[]) => void) {
      return onSnapshot(collection(this.db, "anime", animeId.toString(), "episodes"), (snap) => {
          callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as Episode)).sort((a,b) => a.number - b.number));
      });
  }

  async addEpisode(animeId: number, episode: any) {
      await addDoc(collection(this.db, "anime", animeId.toString(), "episodes"), { ...episode, createdAt: Date.now() });
  }

  async deleteEpisode(animeId: number, episodeId: string) {
      await deleteDoc(doc(this.db, "anime", animeId.toString(), "episodes", episodeId));
  }

  subscribeToChapters(mangaId: number, callback: (chapters: ManualChapter[]) => void) {
      return onSnapshot(collection(this.db, "manga", mangaId.toString(), "chapters"), (snap) => {
          callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as ManualChapter)).sort((a,b) => a.number - b.number));
      });
  }

  async addChapter(mangaId: number, chapter: any) {
      await addDoc(collection(this.db, "manga", mangaId.toString(), "chapters"), { ...chapter, createdAt: Date.now() });
  }

  async deleteChapter(mangaId: number, chapterId: string) {
      await deleteDoc(doc(this.db, "manga", mangaId.toString(), "chapters", chapterId));
  }

  // --- Social ---
  async toggleFavorite(uid: string, itemId: number, isFavorite: boolean, type: 'ANIME' | 'MANGA' | 'CHARACTER' = 'ANIME') {
      const ref = doc(this.db, "users", uid);
      const field = type === 'CHARACTER' ? 'favoriteChars' : 'favorites';
      if (isFavorite) {
          await updateDoc(ref, { [field]: arrayUnion(itemId) });
      } else {
          await updateDoc(ref, { [field]: arrayRemove(itemId) });
      }
  }

  subscribeToDiscussions(mediaId: number, callback: (posts: DiscussionPost[]) => void) {
      const q = query(collection(this.db, "anime", mediaId.toString(), "discussions"), orderBy("createdAt", "desc"));
      return onSnapshot(q, (snap) => {
          callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as DiscussionPost)));
      });
  }

  async addDiscussionPost(mediaId: number, post: DiscussionPost) {
      await addDoc(collection(this.db, "anime", mediaId.toString(), "discussions"), post);
  }

  async deleteDiscussionPost(mediaId: string | number, postId: string) {
      await deleteDoc(doc(this.db, "anime", mediaId.toString(), "discussions", postId));
  }

  async getFlaggedContent() {
      // In real app, querying across subcollections requires group query or dedicated collection
      // For simplicity, we assume a root 'flags' collection or we just check specific logic
      // Here implementing a placeholder for the Admin Dashboard usage
      return []; 
  }

  async unflagPost(mediaId: string | number, postId: string) {
      await updateDoc(doc(this.db, "anime", mediaId.toString(), "discussions", postId), { isFlagged: false });
  }

  subscribeToCharacterComments(charId: number, callback: (comments: CharacterComment[]) => void) {
      const q = query(collection(this.db, "characters", charId.toString(), "comments"), orderBy("createdAt", "desc"));
      return onSnapshot(q, (snap) => {
          callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as CharacterComment)));
      });
  }

  async addCharacterComment(charId: number, comment: CharacterComment) {
      await addDoc(collection(this.db, "characters", charId.toString(), "comments"), comment);
  }

  // --- Communities / Clubs ---
  async getClubs(): Promise<Club[]> {
      const snap = await getDocs(collection(this.db, "clubs"));
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Club));
  }

  async createClub(club: any) {
      await addDoc(collection(this.db, "clubs"), { ...club, memberCount: 1, members: [club.ownerId] });
  }

  subscribeToClubChat(clubId: string, callback: (msgs: ChatMessage[]) => void) {
      const q = query(collection(this.db, "clubs", clubId, "messages"), orderBy("timestamp", "asc"));
      return onSnapshot(q, (snap) => {
          callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as ChatMessage)));
      });
  }

  async sendClubMessage(clubId: string, msg: ChatMessage) {
      await addDoc(collection(this.db, "clubs", clubId, "messages"), msg);
  }

  // --- Global Chat ---
  subscribeToGlobalChat(room: string, callback: (msgs: ChatMessage[]) => void) {
      const q = query(collection(this.db, "chat_rooms", room, "messages"), orderBy("timestamp", "asc"), limit(50));
      return onSnapshot(q, (snap) => {
          callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as ChatMessage)));
      });
  }

  async sendGlobalMessage(room: string, msg: ChatMessage) {
      await addDoc(collection(this.db, "chat_rooms", room, "messages"), msg);
  }

  // --- Watch Party ---
  async createWatchParty(hostId: string, animeId: number, title: string): Promise<string> {
      const docRef = await addDoc(collection(this.db, "watch_parties"), {
          hostId, animeId, animeTitle: title, currentTime: 0, isPlaying: false, participants: [hostId], status: 'active', videoUrl: ''
      });
      return docRef.id;
  }

  async joinWatchParty(partyId: string, userId: string) {
      await updateDoc(doc(this.db, "watch_parties", partyId), { participants: arrayUnion(userId) });
  }

  subscribeToWatchParty(partyId: string, callback: (data: WatchParty) => void) {
      return onSnapshot(doc(this.db, "watch_parties", partyId), (doc) => {
          if (doc.exists()) callback({ ...doc.data(), id: doc.id } as WatchParty);
      });
  }

  async updateWatchPartyState(partyId: string, state: any) {
      await updateDoc(doc(this.db, "watch_parties", partyId), state);
  }

  subscribeToPartyMessages(partyId: string, callback: (msgs: ChatMessage[]) => void) {
      const q = query(collection(this.db, "watch_parties", partyId, "messages"), orderBy("timestamp", "asc"));
      return onSnapshot(q, (snap) => {
          callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as ChatMessage)));
      });
  }

  async sendPartyMessage(partyId: string, msg: ChatMessage) {
      await addDoc(collection(this.db, "watch_parties", partyId, "messages"), msg);
  }

  // --- Notifications ---
  subscribeToNotifications(uid: string, callback: (notifs: AppNotification[]) => void) {
      const q = query(collection(this.db, "users", uid, "notifications"), orderBy("timestamp", "desc"), limit(20));
      return onSnapshot(q, (snap) => {
          callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as AppNotification)));
      });
  }

  async requestNotificationPermission(uid: string) {
      if (!this.messaging) return;
      try {
          const token = await getToken(this.messaging, { vapidKey: DEFAULT_CONFIG.firebase.vapidKey });
          if (token) {
              await updateDoc(doc(this.db, "users", uid), { fcmToken: token });
          }
      } catch (e) {
          console.error("Notification permission denied", e);
      }
  }

  async markNotificationRead(uid: string, notifId: string) {
      await updateDoc(doc(this.db, "users", uid, "notifications", notifId), { read: true });
  }

  async clearAllNotifications(uid: string) {
      const snap = await getDocs(collection(this.db, "users", uid, "notifications"));
      const batch = await import('firebase/firestore').then(m => m.writeBatch(this.db));
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
  }

  async broadcastNotification(notification: { title: string; body: string; link?: string }) {
      // In a real app, this should be a cloud function to send to all users
      // For this client-side demo, we'll assume there's a 'broadcasts' collection that users subscribe to or cloud function logic
      await addDoc(collection(this.db, "system_broadcasts"), { ...notification, timestamp: Date.now() });
  }

  // --- Saved Searches ---
  async saveSearchQuery(uid: string, name: string, filters: any) {
      await addDoc(collection(this.db, "users", uid, "saved_searches"), { name, filters, createdAt: Date.now() });
  }

  async getSavedSearches(uid: string): Promise<SavedSearch[]> {
      const snap = await getDocs(collection(this.db, "users", uid, "saved_searches"));
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as SavedSearch));
  }

  async deleteSavedSearch(uid: string, id: string) {
      await deleteDoc(doc(this.db, "users", uid, "saved_searches", id));
  }

  // --- Custom Content / Description overrides ---
  async getCustomDescription(type: string, id: number): Promise<Record<string, string> | null> {
      const snap = await getDoc(doc(this.db, "content", type, "overrides", id.toString()));
      return snap.exists() ? snap.data().descriptions : null;
  }

  // --- Admin Stats ---
  async getAdminStats() {
      // Mock stats or dedicated aggregation doc
      return { totalUsers: 100, totalEpisodes: 500, totalReviews: 50, maintenance: false };
  }

  // --- Support Chat ---
  subscribeToSupportChat(uid: string, callback: (msgs: SupportMessage[]) => void) {
      const q = query(collection(this.db, "support_chats", uid, "messages"), orderBy("timestamp", "asc"));
      return onSnapshot(q, (snap) => {
          callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as SupportMessage)));
      });
  }

  async sendSupportMessage(uid: string, text: string, isAdmin: boolean) {
      await addDoc(collection(this.db, "support_chats", uid, "messages"), { text, isAdmin, timestamp: Date.now() });
      await setDoc(doc(this.db, "support_chats", uid), { 
          id: uid,
          lastMessage: text, 
          updatedAt: Date.now(),
          hasUnreadAdmin: isAdmin, 
          hasUnreadUser: !isAdmin 
      }, { merge: true });
  }

  subscribeToAllSupportChats(callback: (chats: SupportChat[]) => void) {
      const q = query(collection(this.db, "support_chats"), orderBy("updatedAt", "desc"));
      return onSnapshot(q, (snap) => {
          callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as SupportChat)));
      });
  }

  async markSupportChatRead(uid: string, isAdminReading: boolean) {
      await updateDoc(doc(this.db, "support_chats", uid), {
          [isAdminReading ? 'hasUnreadUser' : 'hasUnreadAdmin']: false
      });
  }

  // --- Friend System ---
  async sendFriendRequest(fromUser: UserProfile, toUid: string) {
      // Add to target user's requests
      const request = { fromId: fromUser.uid, fromName: fromUser.displayName, fromAvatar: fromUser.photoURL, timestamp: Date.now() };
      await updateDoc(doc(this.db, "users", toUid), { friendRequests: arrayUnion(request) });
  }

  // --- Custom Lists ---
  subscribeToCustomLists(uid: string, callback: (lists: any[]) => void) {
      return onSnapshot(collection(this.db, "users", uid, "custom_lists"), (snap) => {
          callback(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      });
  }

  async createCustomList(uid: string, list: any) {
      await addDoc(collection(this.db, "users", uid, "custom_lists"), list);
  }

  async deleteCustomList(uid: string, listId: string) {
      await deleteDoc(doc(this.db, "users", uid, "custom_lists", listId));
  }

  // --- Recommendations ---
  subscribeToRecommendations(uid: string, callback: (recs: any[]) => void) {
      return onSnapshot(collection(this.db, "users", uid, "recommendations"), (snap) => {
          callback(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      });
  }

  async createRecommendation(uid: string, rec: any) {
      await addDoc(collection(this.db, "users", uid, "recommendations"), rec);
  }

  async deleteRecommendation(uid: string, recId: string) {
      await deleteDoc(doc(this.db, "users", uid, "recommendations", recId));
  }

  // --- News ---
  async getPublishedNews(limitCount: number = 10): Promise<NewsArticle[]> {
      const q = query(collection(this.db, "news"), where("status", "==", "PUBLISHED"), orderBy("createdAt", "desc"), limit(limitCount));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as NewsArticle));
  }

  async getPendingNews(): Promise<NewsArticle[]> {
      const q = query(collection(this.db, "news"), where("status", "==", "PENDING"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as NewsArticle));
  }

  async submitNews(article: any) {
      await addDoc(collection(this.db, "news"), article);
  }

  async updateNewsStatus(id: string, status: string) {
      await updateDoc(doc(this.db, "news", id), { status });
  }

  // --- Admin Actions ---
  async makeAdmin(uid: string) {
      await updateDoc(doc(this.db, "users", uid), { isAdmin: true });
  }

  async removeAdmin(uid: string) {
      await updateDoc(doc(this.db, "users", uid), { isAdmin: false });
  }

  async banUser(uid: string, ban: boolean) {
      await updateDoc(doc(this.db, "users", uid), { isBanned: ban });
  }

  // --- Collections ---
  async claimCharacter(uid: string, char: CollectedCharacter) {
      await updateDoc(doc(this.db, "users", uid), { 
          collection: arrayUnion(char),
          lastDailySummon: Date.now() 
      });
  }

  async getLeaderboard(): Promise<UserProfile[]> {
      const q = query(collection(this.db, "users"), orderBy("xp", "desc"), limit(50));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as UserProfile);
  }

  // --- Integrations ---
  async connectAniList(uid: string, token: string) {
      await updateDoc(doc(this.db, "users", uid), { "integrations.anilistToken": token });
  }

  async connectMAL(uid: string, tokenData: any) {
      await updateDoc(doc(this.db, "users", uid), { "integrations.malToken": tokenData });
  }
}

export const firebaseService = new FirebaseService();
