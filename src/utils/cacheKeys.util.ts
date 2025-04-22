export const cacheKeys = {
  userProfile: (userId) => `social:user:${userId}:profile`,
  userPosts: (userId) => `social:user:${userId}:post`,
  userProfileWithPosts: (userId: number) => `profile:user:${userId}:with-posts`,

  userSessions: (userId) => `chat:user:${userId}:sessions`,
  chatRoomMessages: (roomId) => `chat:room:${roomId}:messages`,
  postLikes: (postId) => `social:post:${postId}:likes`,
  postComments: (postId) => `social:post:${postId}:comments`,
  notificationCount: (userId) => `chat:user:${userId}:notifications`,

  followersList: (userId: number) => `social:user:${userId}:followers`,
  followingList: (userId: number) => `social:user:${userId}:following`,
  followRequests: (userId: number) => `social:user:${userId}:follow-requests`,
  blockedList: (userId: number) => `social:user:${userId}:blocked`,
  mutualFriendsList: (userId: number) => `social:user:${userId}:mutual-friend`,
};
