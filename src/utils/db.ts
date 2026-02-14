import { openDB, DBSchema } from 'idb';

interface AppDB extends DBSchema {
    'custom-stickers': {
        key: string;
        value: {
            id: string;
            data: string; // Base64 data or Blob
            type: 'image' | 'video';
            timestamp: number;
        };
    };
    'daily-placements': {
        key: string; // date string YYYY-MM-DD
        value: {
            date: string;
            stickers: any[];
            drawings: any[];
        };
    };
    'events': {
        key: string;
        value: {
            id: string;
            eventType: string;
            title: string;
            date: string;
            blocks: any[];
        };
    };
    'journal-entries': {
        key: string;
        value: {
            id: string;
            date: string;
            time: string;
            content: string;
            createdAt: number;
        };
        indexes: { 'by-date': string };
    };
}

const dbPromise = openDB<AppDB>('sticker-db', 4, {
    upgrade(db, oldVersion, _newVersion, _transaction) {
        if (oldVersion < 1) {
            db.createObjectStore('custom-stickers', { keyPath: 'id' });
            db.createObjectStore('daily-placements', { keyPath: 'date' });
        }
        if (oldVersion < 2) {
            db.createObjectStore('events', { keyPath: 'id' });
        }
        if (oldVersion < 3) {
            const journalStore = db.createObjectStore('journal-entries', { keyPath: 'id' });
            journalStore.createIndex('by-date', 'date');
        }
        // Version 4 adds drawings field to existing daily-placements store structure
        // No schema migration needed for object store structure itself as it's just a property
    },
});

export const dbRequest = {
    // Custom Library Methods
    async saveCustomSticker(data: string, type: 'image' | 'video') {
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const db = await dbPromise;
        await db.put('custom-stickers', {
            id,
            data,
            type,
            timestamp: Date.now(),
        });
        return id;
    },

    async getAllCustomStickers() {
        const db = await dbPromise;
        return db.getAll('custom-stickers');
    },

    async deleteCustomSticker(id: string) {
        const db = await dbPromise;
        await db.delete('custom-stickers', id);
    },

    // Daily Placement Methods
    async saveDailyContent(date: string, stickers: any[], drawings: any[]) {
        const db = await dbPromise;
        await db.put('daily-placements', {
            date,
            stickers,
            drawings,
        });
    },

    async getDailyContent(date: string) {
        const db = await dbPromise;
        const result = await db.get('daily-placements', date);
        return {
            stickers: result?.stickers || [],
            drawings: result?.drawings || []
        };
    },

    // Calendar Event Methods
    async getAllEvents() {
        const db = await dbPromise;
        return db.getAll('events');
    },

    async saveEvent(event: any) {
        const db = await dbPromise;
        await db.put('events', event);
    },

    async deleteEvent(id: string) {
        const db = await dbPromise;
        await db.delete('events', id);
    },

    // Journal Entry Methods
    async saveJournalEntry(entry: any) {
        const db = await dbPromise;
        await db.put('journal-entries', entry);
    },

    async getJournalEntries(date: string) {
        const db = await dbPromise;
        const index = db.transaction('journal-entries').store.index('by-date');
        return index.getAll(date);
    },

    async deleteJournalEntry(id: string) {
        const db = await dbPromise;
        await db.delete('journal-entries', id);
    }
};
