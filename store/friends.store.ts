import { create } from "zustand";

export interface Friend {
    id: string;
    username: string;
    profilePic: string;
    email: string;
    isOnline?: boolean;
    lastActive?: string;
}

interface FriendsStore {
    friends: Friend[];
    setFriends: (friends: Friend[]) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    filteredFriends: () => Friend[];
}

export const useFriendsStore = create<FriendsStore>((set, get) => ({
    friends: [],
    searchQuery: "",

    setFriends: (friends) => set({ friends }),

    setSearchQuery: (query) => set({ searchQuery: query }),

    filteredFriends: () => {
        const { friends, searchQuery } = get();
        if (!searchQuery) return friends;

        const lowerQuery = searchQuery.toLowerCase();
        return friends.filter(
            (friend) =>
                friend.username.toLowerCase().includes(lowerQuery) ||
                friend.email?.toLowerCase().includes(lowerQuery)
        );
    },
}));
