import { createEvent, createBusiness } from './firestoreService';
import { MontanitaEvent, Business } from '../types';

export const migrateLocalStorageToFirestore = async () => {
    try {
        console.log('🚀 Starting migration from localStorage to Firestore...');

        // Migrate Events
        const eventsData = localStorage.getItem('montapulse_events');
        if (eventsData) {
            const events: MontanitaEvent[] = JSON.parse(eventsData).map((e: any) => ({
                ...e,
                startAt: new Date(e.startAt),
                endAt: new Date(e.endAt)
            }));

            console.log(`📅 Migrating ${events.length} events...`);
            for (const event of events) {
                const { id, ...eventData } = event;
                try {
                    await createEvent(eventData);
                    console.log(`✅ Migrated event: ${event.title}`);
                } catch (error) {
                    console.error(`❌ Failed to migrate event: ${event.title}`, error);
                }
            }
        }

        // Migrate Businesses
        const businessesData = localStorage.getItem('montapulse_businesses');
        if (businessesData) {
            const businesses: Business[] = JSON.parse(businessesData);

            console.log(`🏢 Migrating ${businesses.length} businesses...`);
            for (const business of businesses) {
                const { id, ...businessData } = business;
                try {
                    await createBusiness(businessData);
                    console.log(`✅ Migrated business: ${business.name}`);
                } catch (error) {
                    console.error(`❌ Failed to migrate business: ${business.name}`, error);
                }
            }
        }

        console.log('✨ Migration completed!');
        console.log('💡 You can now remove localStorage data or keep it as backup.');

        return {
            success: true,
            message: 'Migration completed successfully!'
        };
    } catch (error) {
        console.error('❌ Migration failed:', error);
        return {
            success: false,
            message: 'Migration failed. Check console for details.',
            error
        };
    }
};

// Function to clear localStorage after successful migration
export const clearLocalStorageData = () => {
    const keys = ['montapulse_events', 'montapulse_businesses', 'montapulse_favorites'];
    keys.forEach(key => localStorage.removeItem(key));
    console.log('🗑️ localStorage data cleared');
};

// Function to backup localStorage data before migration
export const backupLocalStorageData = () => {
    const backup: Record<string, any> = {};
    const keys = ['montapulse_events', 'montapulse_businesses', 'montapulse_favorites', 'montapulse_sector_labels', 'montapulse_polygons'];

    keys.forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
            backup[key] = JSON.parse(data);
        }
    });

    const backupString = JSON.stringify(backup, null, 2);
    const blob = new Blob([backupString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `montapulse-backup-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    console.log('💾 Backup downloaded');
};
