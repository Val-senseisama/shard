import { create } from 'zustand';
import { z } from 'zod';

// Zod schema for Shard validation
export const ShardSchema = z.object({
    id: z.string().min(1, 'Shard ID is required'),
    title: z.string().min(1, 'Title is required'),
    description: z.string().nullable().optional(),
    image: z.string().url().nullable().optional(),
    progress: z.object({
        completion: z.number().min(0).max(100).default(0),
    }).nullable().optional(),
    // Allow any additional fields from GraphQL
}).passthrough();

// TypeScript type inferred from Zod schema
export type Shard = z.infer<typeof ShardSchema>;

// Schema for array of shards
const ShardsArraySchema = z.array(ShardSchema);

interface ShardState {
    shards: Shard[];
    selectedShard: Shard | null;
    setShards: (shards: unknown[]) => void;
    setSelectedShard: (shard: Shard | null) => void;
    getShardById: (id: string) => Shard | undefined;
}

export const useShardStore = create<ShardState>((set, get) => ({
    shards: [],
    selectedShard: null,
    
    setShards: (shards) => {
        try {
            // Validate incoming data with Zod
            const validatedShards = ShardsArraySchema.parse(shards);
            set({ shards: validatedShards });
        } catch (error) {
            console.error('Failed to validate shards:', error);
            // Still set the shards even if validation fails, but log the error
            set({ shards: shards as Shard[] });
        }
    },
    
    setSelectedShard: (shard) => {
        if (shard === null) {
            set({ selectedShard: null });
            return;
        }
        
        try {
            // Validate single shard
            const validatedShard = ShardSchema.parse(shard);
            set({ selectedShard: validatedShard });
        } catch (error) {
            console.error('Failed to validate shard:', error);
            set({ selectedShard: shard });
        }
    },
    
    getShardById: (id) => get().shards.find((shard) => shard.id === id),
}));
