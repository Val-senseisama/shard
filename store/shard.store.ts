import { create } from 'zustand';

export interface Shard {
    id: string;
    title: string;
    summary: string;
    image: string;
    completionRate: number;
}

interface ShardState {
    shards: Shard[];
    selectedShard: Shard | null;
    setShards: (shards: Shard[]) => void;
    setSelectedShard: (shard: Shard | null) => void;
    getShardById: (id: string) => Shard | undefined;
}

export const useShardStore = create<ShardState>((set, get) => ({
    shards: [],
    selectedShard: null,
    setShards: (shards) => set({ shards }),
    setSelectedShard: (shard) => set({ selectedShard: shard }),
    getShardById: (id) => get().shards.find((shard) => shard.id === id),
}));
