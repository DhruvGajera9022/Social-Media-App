export const cacheKeys = {
  userProfile: (userId: number) => `social:user:${userId}:profile`,
  userPosts: (userId: number) => `social:user:${userId}:post`,
  userProfileWithPosts: (userId: number) => `profile:user:${userId}:with-posts`,

  userSessions: (userId: number) => `chat:user:${userId}:sessions`,
  chatRoomMessages: (roomId: number) => `chat:room:${roomId}:messages`,
  posts: () => `social:posts`,
  postId: (postId: number) => `social:post:${postId}`,
  postLikes: (postId: number) => `social:post:${postId}:likes`,
  postComments: (postId: number) => `social:post:${postId}:comments`,
  postBookmarks: (userId: number) => `social:post:${userId}:bookmark`,
  notificationCount: (userId: number) => `chat:user:${userId}:notifications`,

  followersList: (userId: number) => `social:user:${userId}:followers`,
  followingList: (userId: number) => `social:user:${userId}:following`,
  followRequests: (userId: number) => `social:user:${userId}:follow-requests`,
  blockedList: (userId: number) => `social:user:${userId}:blocked`,
  mutualFriendsList: (userId: number) => `social:user:${userId}:mutual-friend`,
};
