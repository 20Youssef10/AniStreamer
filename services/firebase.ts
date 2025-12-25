
import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, 
  signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  Auth, onAuthStateChanged, User 
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, 
  query, where, orderBy, limit, onSnapshot, setDoc, getDoc, Firestore, 
  DocumentData, Timestamp 
} from 'firebase/firestore';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { configService } from './config';
import { 
  UserListEntry, UserProfile, NewsArticle, AppNotification, 
  Club, ChatMessage, WatchParty, Episode, ManualChapter, 
  CollectedCharacter, SupportChat, SupportMessage, AIFeatureConfig, 
  AppBranding, XPRewardsConfig, AILimitsConfig, UserSettings, SavedSearch,
  MediaType, UserRecommendation, DiscussionPost, CharacterComment, CustomList
} from '../types';

class FirebaseService {
  private app: FirebaseApp | undefined;
  private auth: Auth | undefined;
  private db: Firestore | undefined;
  private messaging: Messaging | undefined;
  private initPromise: Promise<void> | null = null;

  async init() {
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = (async () => {
      const config = await configService.loadConfig();
      if (!config.firebase || !config.firebase.apiKey) {
          console.error("Firebase config missing");
          return;
      }
      
      this.app = initializeApp(config.firebase);
      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);
      
      try {
        this.messaging = getMessaging(this.app);
      } catch (e) {
        console.warn("Messaging not supported (likely http localhost)");
      }
    })();
    return this.initPromise;
  }

  getAuthInstance(): Auth {
      if (!this.auth) throw new Error("Firebase not initialized");
      return this.auth;
  }

  // --- Auth Methods ---

  async loginWithGoogle() {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(this.auth!, provider);
      await this.ensureUserProfile(res.user);
      return res;
  }

  async loginAnonymously() {
      return signInAnonymously(this.auth!);
  }

  async loginWithEmail(email: string, pass: string) {
      return signInWithEmailAndPassword(this.auth!, email, pass);
  }

  async registerWithEmail(email: string, pass: string) {
      const res = await createUserWithEmailAndPassword(this.auth!, email, pass);
      await this.ensureUserProfile(res.user);
      return res;
  }

  async logout() {
      return signOut(this.auth!);
  }

  private async ensureUserProfile(user: User) {
      if (!this.db) return;
      const userRef = doc(this.db, "users", user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
          const profile: UserProfile = {
              uid: user.uid,
              displayName: user.displayName || 'User',
              email: user.email || '',
              photoURL: user.photoURL || '',
              level: 1,
              xp: 0,
              isAdmin: false,
              isPremium: false
          };
          await setDoc(userRef, profile);
      }
  }

  async getUserData(uid: string): Promise<UserProfile | null> {
      if (!this.db) return null;
      const snap = await getDoc(doc(this.db, "users", uid));
      return snap.exists() ? (snap.data() as UserProfile) : null;
  }

  async getUserByUsername(username: string): Promise<UserProfile | null> {
      if (!this.db) return null;
      const q = query(collection(this.db, "users"), where("username", "==", username), limit(1));
      const snap = await getDocs(q);
      return !snap.empty ? (snap.docs[0].data() as UserProfile) : null;
  }

  async getAllUsers(): Promise<UserProfile[]> {
      if (!this.db) return [];
      const snap = await getDocs(collection(this.db, "users"));
      return snap.docs.map(d => d.data() as UserProfile);
  }

  async updateUserProfile(displayName: string, photoURL: string, bio: string, username: string) {
      if (!this.auth?.currentUser || !this.db) return;
      await updateDoc(doc(this.db, "users", this.auth.currentUser.uid), {
          displayName, photoURL, bio, username
      });
  }

  async updateUserSettings(uid: string, settings: UserSettings) {
      if (!this.db) return;
      await updateDoc(doc(this.db, "users", uid), { settings });
  }

  async checkUsernameAvailability(username: string, currentUid: string): Promise<boolean> {
      if (!this.db) return false;
      const q = query(collection(this.db, "users"), where("username", "==", username));
      const snap = await getDocs(q);
      if (snap.empty) return true;
      return snap.docs[0].id === currentUid;
  }

  // --- Content & Lists ---

  async getUserAnimeList(uid: string): Promise<UserListEntry[]> {
      if (!this.db) return [];
      const snap = await getDocs(collection(this.db, "users", uid, "animelist"));
      return snap.docs.map(d => d.data() as UserListEntry);
  }

  subscribeToUserList(uid: string, cb: (data: UserListEntry[]) => void) {
      if (!this.db) return () => {};
      return onSnapshot(collection(this.db, "users", uid, "animelist"), (snap) => {
          cb(snap.docs.map(d => d.data() as UserListEntry));
      });
  }

  async updateUserAnimeEntry(uid: string, entry: UserListEntry) {
      if (!this.db) return;
      // Use composite key or animeId as string
      await setDoc(doc(this.db, "users", uid, "animelist", entry.animeId.toString()), entry);
  }

  async importUserList(uid: string, entries: UserListEntry[]) {
      if (!this.db) return;
      const batchLimit = 500;
      // In a real app, use writeBatch. For this demo, Promise.all is used for simplicity/speed but batch is safer
      // Using simple parallel sets for now
      const promises = entries.map(e => setDoc(doc(this.db!, "users", uid, "animelist", e.animeId.toString()), e));
      await Promise.all(promises);
  }

  async toggleFavorite(uid: string, id: number, status: boolean, type: 'ANIME' | 'MANGA' | 'CHARACTER' = 'ANIME') {
      if (!this.db) return;
      const userRef = doc(this.db, "users", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
          const data = userSnap.data();
          let favorites = data.favorites || [];
          let favChars = data.favoriteChars || [];
          
          if (type === 'CHARACTER') {
              if (status) {
                  if (!favChars.includes(id)) favChars.push(id);
              } else {
                  favChars = favChars.filter((i: number) => i !== id);
              }
              await updateDoc(userRef, { favoriteChars: favChars });
          } else {
              if (status) {
                  if (!favorites.includes(id)) favorites.push(id);
              } else {
                  favorites = favorites.filter((i: number) => i !== id);
              }
              await updateDoc(userRef, { favorites });
          }
      }
  }

  // --- XP & Economy ---

  async awardXP(uid: string, amount: number, source: string = 'action') {
      if (!this.db) return { newLevel: null, unlockedBadge: null };
      const userRef = doc(this.db, "users", uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return { newLevel: null, unlockedBadge: null };
      
      const userData = userSnap.data() as UserProfile;
      const newXP = (userData.xp || 0) + amount;
      const newLevel = Math.floor(Math.sqrt(newXP / 100)) + 1; // Simple quadratic curve
      
      const updates: any = { xp: newXP };
      let levelUp = null;
      
      if (newLevel > userData.level) {
          updates.level = newLevel;
          levelUp = newLevel;
      }

      await updateDoc(userRef, updates);
      return { newLevel: levelUp, unlockedBadge: null };
  }

  async claimCharacter(uid: string, char: CollectedCharacter) {
      if (!this.db) return;
      const userRef = doc(this.db, "users", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
          const collection = userSnap.data().collection || [];
          await updateDoc(userRef, { collection: [char, ...collection] });
      }
  }

  // --- Notifications ---

  async broadcastNotification(notification: { title: string; body: string; link?: string }) {
      if (!this.db) return;
      await addDoc(collection(this.db, "system_broadcasts"), { ...notification, timestamp: Date.now() });
  }

  async sendUserNotification(uid: string, notification: { title: string; body: string; link?: string }) {
      if (!this.db) return;
      await addDoc(collection(this.db, "users", uid, "notifications"), {
          ...notification,
          timestamp: Date.now(),
          read: false
      });
  }

  subscribeToNotifications(uid: string, cb: (data: AppNotification[]) => void) {
      if (!this.db) return () => {};
      const q = query(collection(this.db, "users", uid, "notifications"), orderBy("timestamp", "desc"), limit(20));
      return onSnapshot(q, (snap) => {
          const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
          cb(notifs);
      });
  }

  async markNotificationRead(uid: string, notifId: string) {
      if (!this.db) return;
      await updateDoc(doc(this.db, "users", uid, "notifications", notifId), { read: true });
  }

  async clearAllNotifications(uid: string) {
      if (!this.db) return;
      const q = query(collection(this.db, "users", uid, "notifications"));
      const snap = await getDocs(q);
      const batch = snap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(batch);
  }

  async requestNotificationPermission(uid: string) {
      if (!this.messaging || !this.db) return;
      try {
          const token = await getToken(this.messaging, { vapidKey: configService.getConfig().firebase.vapidKey });
          if (token) {
              await updateDoc(doc(this.db, "users", uid), { fcmToken: token });
          }
      } catch (e) {
          console.warn("Notification permission denied", e);
      }
  }

  // --- Community & Social ---

  async getClubs(): Promise<Club[]> {
      if (!this.db) return [];
      const snap = await getDocs(collection(this.db, "clubs"));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Club));
  }

  async createClub(clubData: Partial<Club>) {
      if (!this.db) return;
      await addDoc(collection(this.db, "clubs"), { ...clubData, memberCount: 1, members: [clubData.ownerId] });
  }

  subscribeToClubChat(clubId: string, cb: (msgs: ChatMessage[]) => void) {
      if (!this.db) return () => {};
      const q = query(collection(this.db, "clubs", clubId, "messages"), orderBy("timestamp", "asc"), limit(50));
      return onSnapshot(q, (snap) => cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage))));
  }

  async sendClubMessage(clubId: string, msg: ChatMessage) {
      if (!this.db) return;
      await addDoc(collection(this.db, "clubs", clubId, "messages"), msg);
  }

  subscribeToGlobalChat(room: string, cb: (msgs: ChatMessage[]) => void) {
      if (!this.db) return () => {};
      const q = query(collection(this.db, "global_chat", room, "messages"), orderBy("timestamp", "desc"), limit(50));
      return onSnapshot(q, (snap) => cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)).reverse()));
  }

  async sendGlobalMessage(room: string, msg: ChatMessage) {
      if (!this.db) return;
      await addDoc(collection(this.db, "global_chat", room, "messages"), msg);
  }

  async getLeaderboard(): Promise<UserProfile[]> {
      if (!this.db) return [];
      const q = query(collection(this.db, "users"), orderBy("xp", "desc"), limit(50));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as UserProfile);
  }

  async sendFriendRequest(sender: UserProfile, targetUid: string) {
      if (!this.db) return;
      await updateDoc(doc(this.db, "users", targetUid), {
          friendRequests: [{
              fromId: sender.uid,
              fromName: sender.displayName,
              fromAvatar: sender.photoURL,
              timestamp: Date.now()
          }]
      });
  }

  // --- Watch Party ---

  async createWatchParty(hostId: string, animeId: number, title: string): Promise<string> {
      if (!this.db) throw new Error("DB not init");
      const ref = await addDoc(collection(this.db, "watch_parties"), {
          hostId,
          animeId,
          animeTitle: title,
          currentTime: 0,
          isPlaying: false,
          participants: [hostId],
          status: 'active',
          createdAt: Date.now()
      });
      return ref.id;
  }

  async joinWatchParty(partyId: string, userId: string) {
      if (!this.db) return;
      const ref = doc(this.db, "watch_parties", partyId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
          const data = snap.data();
          const participants = data.participants || [];
          if (!participants.includes(userId)) {
              await updateDoc(ref, { participants: [...participants, userId] });
          }
      } else {
          throw new Error("Party not found");
      }
  }

  subscribeToWatchParty(partyId: string, cb: (party: WatchParty) => void) {
      if (!this.db) return () => {};
      return onSnapshot(doc(this.db, "watch_parties", partyId), (doc) => {
          if (doc.exists()) cb({ id: doc.id, ...doc.data() } as WatchParty);
      });
  }

  async updateWatchPartyState(partyId: string, state: Partial<WatchParty> & { videoUrl?: string }) {
      if (!this.db) return;
      await updateDoc(doc(this.db, "watch_parties", partyId), state);
  }

  subscribeToPartyMessages(partyId: string, cb: (msgs: ChatMessage[]) => void) {
      if (!this.db) return () => {};
      const q = query(collection(this.db, "watch_parties", partyId, "messages"), orderBy("timestamp", "asc"));
      return onSnapshot(q, (snap) => cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage))));
  }

  async sendPartyMessage(partyId: string, msg: ChatMessage) {
      if (!this.db) return;
      await addDoc(collection(this.db, "watch_parties", partyId, "messages"), msg);
  }

  // --- System & Config ---

  async getSystemConfig() {
      if (!this.db) return null;
      const snap = await getDoc(doc(this.db, "system", "config"));
      return snap.exists() ? snap.data() : null;
  }

  async updateSystemConfig(config: any) {
      if (!this.db) return;
      await setDoc(doc(this.db, "system", "config"), config, { merge: true });
  }

  async getAdminStats() {
      if (!this.db) return { totalUsers: 0, totalEpisodes: 0, totalReviews: 0, maintenance: false };
      // This is expensive in Firestore, usually would use aggregated counters
      // For this demo, we estimate or use separate counters doc
      const conf = await this.getSystemConfig();
      const usersSnap = await getDocs(collection(this.db, "users")); // Beware read costs
      return {
          totalUsers: usersSnap.size,
          totalEpisodes: 0, 
          totalReviews: 0,
          maintenance: conf?.maintenanceMode || false
      };
  }

  async getTranslations() {
      if (!this.db) return null;
      const snap = await getDoc(doc(this.db, "system", "translations"));
      return snap.exists() ? snap.data() : null;
  }

  async saveTranslations(translations: any) {
      if (!this.db) return;
      await setDoc(doc(this.db, "system", "translations"), translations);
  }

  async getPublishedNews(limitCount: number = 5): Promise<NewsArticle[]> {
      if (!this.db) return [];
      // Optimization: Fetch by status only, then sort client-side to avoid composite index requirement
      const q = query(collection(this.db, "news"), where("status", "==", "PUBLISHED"));
      const snap = await getDocs(q);
      const articles = snap.docs.map(d => ({ id: d.id, ...d.data() } as NewsArticle));
      return articles.sort((a, b) => b.createdAt - a.createdAt).slice(0, limitCount);
  }

  async getPendingNews(): Promise<NewsArticle[]> {
      if (!this.db) return [];
      // Optimization: Fetch by status only, then sort client-side to avoid composite index requirement
      const q = query(collection(this.db, "news"), where("status", "==", "PENDING"));
      const snap = await getDocs(q);
      const articles = snap.docs.map(d => ({ id: d.id, ...d.data() } as NewsArticle));
      return articles.sort((a, b) => b.createdAt - a.createdAt);
  }

  async submitNews(article: Omit<NewsArticle, 'id'>) {
      if (!this.db) return;
      await addDoc(collection(this.db, "news"), article);
  }

  async updateNewsStatus(id: string, status: 'PUBLISHED' | 'REJECTED') {
      if (!this.db) return;
      await updateDoc(doc(this.db, "news", id), { status });
  }

  async getAIFeatures(): Promise<AIFeatureConfig> {
      if (!this.db) return {};
      const snap = await getDoc(doc(this.db, "system", "ai_features"));
      return snap.exists() ? (snap.data() as AIFeatureConfig) : {};
  }

  // --- Content Management (Episodes/Chapters) ---

  async getEpisodes(animeId: number): Promise<Episode[]> {
      if (!this.db) return [];
      // Client-side sorting to avoid index requirements
      const q = query(collection(this.db, "content", animeId.toString(), "episodes"));
      const snap = await getDocs(q);
      const episodes = snap.docs.map(d => ({ id: d.id, ...d.data() } as Episode));
      return episodes.sort((a, b) => a.number - b.number);
  }

  subscribeToEpisodes(animeId: number, cb: (eps: Episode[]) => void) {
      if (!this.db) return () => {};
      // Removed orderBy to prevent missing index errors
      const q = query(collection(this.db, "content", animeId.toString(), "episodes"));
      return onSnapshot(q, (snap) => {
          const episodes = snap.docs.map(d => ({ id: d.id, ...d.data() } as Episode));
          episodes.sort((a, b) => a.number - b.number);
          cb(episodes);
      });
  }

  async addEpisode(animeId: number, episode: Partial<Episode>) {
      if (!this.db) return;
      await addDoc(collection(this.db, "content", animeId.toString(), "episodes"), { ...episode, createdAt: Date.now() });
  }

  async deleteEpisode(animeId: number, episodeId: string) {
      if (!this.db) return;
      await deleteDoc(doc(this.db, "content", animeId.toString(), "episodes", episodeId));
  }

  subscribeToChapters(mangaId: number, cb: (chapters: ManualChapter[]) => void) {
      if (!this.db) return () => {};
      // Removed orderBy to prevent missing index errors
      const q = query(collection(this.db, "content", mangaId.toString(), "chapters"));
      return onSnapshot(q, (snap) => {
          const chapters = snap.docs.map(d => ({ id: d.id, ...d.data() } as ManualChapter));
          chapters.sort((a, b) => b.number - a.number); // Descending for manga
          cb(chapters);
      });
  }

  async addChapter(mangaId: number, chapter: Partial<ManualChapter>) {
      if (!this.db) return;
      await addDoc(collection(this.db, "content", mangaId.toString(), "chapters"), { ...chapter, createdAt: Date.now() });
  }

  async deleteChapter(mangaId: number, chapterId: string) {
      if (!this.db) return;
      await deleteDoc(doc(this.db, "content", mangaId.toString(), "chapters", chapterId));
  }

  async getCustomDescription(type: 'anime' | 'manga' | 'character' | 'studio', id: number) {
      if (!this.db) return null;
      const snap = await getDoc(doc(this.db, "custom_descriptions", `${type}_${id}`));
      return snap.exists() ? snap.data() : null;
  }

  // --- Search & Saved ---

  async getSavedSearches(uid: string): Promise<SavedSearch[]> {
      if (!this.db) return [];
      const snap = await getDocs(collection(this.db, "users", uid, "saved_searches"));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as SavedSearch));
  }

  async saveSearchQuery(uid: string, name: string, filters: any) {
      if (!this.db) return;
      await addDoc(collection(this.db, "users", uid, "saved_searches"), {
          name, filters, createdAt: Date.now()
      });
  }

  async deleteSavedSearch(uid: string, id: string) {
      if (!this.db) return;
      await deleteDoc(doc(this.db, "users", uid, "saved_searches", id));
  }

  // --- Discussions & Comments ---

  subscribeToDiscussions(mediaId: number, cb: (posts: DiscussionPost[]) => void) {
      if (!this.db) return () => {};
      const q = query(collection(this.db, "discussions", mediaId.toString(), "posts"), orderBy("createdAt", "desc"));
      return onSnapshot(q, (snap) => cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as DiscussionPost))));
  }

  async addDiscussionPost(mediaId: number, post: DiscussionPost) {
      if (!this.db) return;
      await addDoc(collection(this.db, "discussions", mediaId.toString(), "posts"), post);
  }

  async deleteDiscussionPost(mediaId: number | string, postId: string) {
      if (!this.db) return;
      await deleteDoc(doc(this.db, "discussions", mediaId.toString(), "posts", postId));
  }

  async getFlaggedContent() {
      if (!this.db) return [];
      // In a real app, this would query a collection group or specific flagged collection.
      // For demo, assume "flagged_posts" collection
      const snap = await getDocs(collection(this.db, "flagged_posts"));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async unflagPost(mediaId: number | string, postId: string) {
      if (!this.db) return;
      // Logic to unflag
      await updateDoc(doc(this.db, "discussions", mediaId.toString(), "posts", postId), { isFlagged: false });
      // Remove from flagged collection
      const q = query(collection(this.db, "flagged_posts"), where("postId", "==", postId));
      const snap = await getDocs(q);
      snap.forEach(d => deleteDoc(d.ref));
  }

  subscribeToCharacterComments(charId: number, cb: (comments: CharacterComment[]) => void) {
      if (!this.db) return () => {};
      const q = query(collection(this.db, "character_comments", charId.toString(), "posts"), orderBy("createdAt", "desc"));
      return onSnapshot(q, (snap) => cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as CharacterComment))));
  }

  async addCharacterComment(charId: number, comment: CharacterComment) {
      if (!this.db) return;
      await addDoc(collection(this.db, "character_comments", charId.toString(), "posts"), comment);
  }

  // --- Admin User Management ---

  async makeAdmin(uid: string) {
      if (!this.db) return;
      await updateDoc(doc(this.db, "users", uid), { isAdmin: true });
  }

  async removeAdmin(uid: string) {
      if (!this.db) return;
      await updateDoc(doc(this.db, "users", uid), { isAdmin: false });
  }

  async banUser(uid: string, ban: boolean) {
      if (!this.db) return;
      await updateDoc(doc(this.db, "users", uid), { isBanned: ban });
  }

  // --- Support System ---

  subscribeToSupportChat(userId: string, cb: (msgs: SupportMessage[]) => void) {
      if (!this.db) return () => {};
      const q = query(collection(this.db, "support_chats", userId, "messages"), orderBy("timestamp", "asc"));
      return onSnapshot(q, (snap) => cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as SupportMessage))));
  }

  async sendSupportMessage(userId: string, text: string, isAdmin: boolean) {
      if (!this.db) return;
      const chatRef = doc(this.db, "support_chats", userId);
      await setDoc(chatRef, { 
          id: userId,
          lastMessage: text,
          updatedAt: Date.now(),
          hasUnreadAdmin: isAdmin,
          hasUnreadUser: !isAdmin
      }, { merge: true });
      
      await addDoc(collection(this.db, "support_chats", userId, "messages"), {
          text, isAdmin, timestamp: Date.now()
      });
  }

  subscribeToAllSupportChats(cb: (chats: SupportChat[]) => void) {
      if (!this.db) return () => {};
      const q = query(collection(this.db, "support_chats"), orderBy("updatedAt", "desc"));
      return onSnapshot(q, (snap) => cb(snap.docs.map(d => d.data() as SupportChat)));
  }

  async markSupportChatRead(userId: string, isAdmin: boolean) {
      if (!this.db) return;
      const update = isAdmin ? { hasUnreadAdmin: false } : { hasUnreadUser: false };
      await updateDoc(doc(this.db, "support_chats", userId), update);
  }

  // --- Custom Lists & Recs ---

  subscribeToCustomLists(uid: string, cb: (lists: CustomList[]) => void) {
      if (!this.db) return () => {};
      const q = query(collection(this.db, "users", uid, "custom_lists"));
      return onSnapshot(q, (snap) => cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomList))));
  }

  async createCustomList(uid: string, list: Omit<CustomList, 'id'>) {
      if (!this.db) return;
      await addDoc(collection(this.db, "users", uid, "custom_lists"), list);
  }

  async deleteCustomList(uid: string, listId: string) {
      if (!this.db) return;
      await deleteDoc(doc(this.db, "users", uid, "custom_lists", listId));
  }

  subscribeToRecommendations(uid: string, cb: (recs: UserRecommendation[]) => void) {
      if (!this.db) return () => {};
      const q = query(collection(this.db, "users", uid, "recommendations"));
      return onSnapshot(q, (snap) => cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserRecommendation))));
  }

  async createRecommendation(uid: string, rec: Omit<UserRecommendation, 'id'>) {
      if (!this.db) return;
      await addDoc(collection(this.db, "users", uid, "recommendations"), rec);
  }

  async deleteRecommendation(uid: string, recId: string) {
      if (!this.db) return;
      await deleteDoc(doc(this.db, "users", uid, "recommendations", recId));
  }

  async connectAniList(uid: string, token: string) {
      if (!this.db) return;
      await updateDoc(doc(this.db, "users", uid), { anilistToken: token });
  }

  async connectMAL(uid: string, tokenData: any) {
      if (!this.db) return;
      await updateDoc(doc(this.db, "users", uid), { malToken: tokenData });
  }
}

export const firebaseService = new FirebaseService();
