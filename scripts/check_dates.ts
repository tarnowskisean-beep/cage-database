
import { query } from '@/lib/db';

async function checkDates() {
    try {
        const res = await query(`SELECT MIN("GiftDate") as min_date, MAX("GiftDate") as max_date FROM "Donations"`);
        console.log('Donation Date Range:', res.rows[0]);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkDates();
