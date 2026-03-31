/**
 * Returns the user's profile pic URI, or a generated avatar from their username.
 */
export const avatarUri = (profilePic?: string | null, username?: string | null): string => {
  if (profilePic) return profilePic;
  const name = encodeURIComponent(username || 'U');
  return `https://ui-avatars.com/api/?name=${name}&size=128&background=7c3aed&color=fff&bold=true`;
};
