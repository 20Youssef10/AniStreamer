
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { GoogleGenAI } = require("@google/genai");

admin.initializeApp();

// Helper to create a new client with up-to-date process.env.API_KEY
// Note: In Cloud Functions, environment variables are set via Firebase CLI
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- CONTENT MODERATION TRIGGER ---
// This runs on Firebase servers when a document is created
exports.moderateContent = functions.firestore
    .document("anime/{animeId}/discussions/{commentId}")
    .onCreate(async (snapshot, context) => {
        const comment = snapshot.data();
        if (!comment.content) return;

        try {
            const ai = getAI();
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Analyze this comment for hate speech, harassment, or severe spoilers without warning. Return JSON: {"safe": boolean, "reason": string}. Comment: "${comment.content}"`,
                config: { responseMimeType: 'application/json' }
            });

            const analysis = JSON.parse(response.text);
            
            if (!analysis.safe) {
                await snapshot.ref.update({
                    isFlagged: true,
                    isHidden: true, // Auto-hide
                    flagReason: analysis.reason
                });
                console.log(`Flagged comment ${context.params.commentId}: ${analysis.reason}`);
            }
        } catch (e) {
            console.error("Moderation failed", e);
        }
    });

// --- PUSH NOTIFICATION TRIGGER ---
// This runs on Firebase servers
exports.sendPushNotification = functions.firestore
  .document("users/{userId}/notifications/{notificationId}")
  .onCreate(async (snapshot, context) => {
    const notificationData = snapshot.data();
    const userId = context.params.userId;

    try {
      const userDoc = await admin.firestore().collection("users").doc(userId).get();
      if (!userDoc.exists) return;

      const userData = userDoc.data();
      const fcmToken = userData.fcmToken;
      if (!fcmToken) return;

      const message = {
        notification: {
          title: notificationData.title || "New Notification",
          body: notificationData.body || "",
        },
        data: {
          url: notificationData.link || "/",
          notificationId: context.params.notificationId
        },
        token: fcmToken,
        webpush: {
          fcmOptions: { link: notificationData.link || "/" },
          notification: {
            icon: 'https://anistream-ata1.web.app/logo.png'
          }
        }
      };

      await admin.messaging().send(message);
    } catch (error) {
      console.error("Error sending push notification:", error);
      if (error.code === 'messaging/registration-token-not-registered') {
        await admin.firestore().collection("users").doc(userId).update({
          fcmToken: admin.firestore.FieldValue.delete()
        });
      }
    }
  });
