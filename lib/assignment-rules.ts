
import { query } from '@/lib/db';

export type AssignmentRule = {
    RuleID: number;
    Name: string;
    Priority: number;
    IsActive: boolean;
    AssignToUserID: number;
    AmountMin?: number;
    AmountMax?: number;
    State?: string;
    ZipPrefix?: string;
    CampaignID?: string;
};

export async function findAssignedUser(donation: any): Promise<number | null> {
    try {
        // 1. Fetch Active Rules sorted by Priority
        const res = await query(`
            SELECT * FROM "AssignmentRules" 
            WHERE "IsActive" = TRUE 
            ORDER BY "Priority" ASC
        `);
        const rules: AssignmentRule[] = res.rows;

        if (rules.length === 0) return null;

        // 2. Evaluate Rules
        for (const rule of rules) {
            let match = true;

            // Check Amount
            const amount = parseFloat(donation.amount || 0);
            if (rule.AmountMin != null && amount < rule.AmountMin) match = false;
            if (rule.AmountMax != null && amount > rule.AmountMax) match = false;

            // Check State (Exact match for now, could be list later if needed)
            if (match && rule.State) {
                const donorState = (donation.donorState || '').trim().toUpperCase();
                const ruleState = rule.State.trim().toUpperCase();
                if (donorState !== ruleState) match = false;
            }

            // Check Zip Prefix
            if (match && rule.ZipPrefix) {
                const donorZip = (donation.donorZip || '').trim();
                if (!donorZip.startsWith(rule.ZipPrefix)) match = false;
            }

            // Check Campaign
            if (match && rule.CampaignID) {
                const campaign = (donation.campaignId || '').trim();
                // Simple partial or exact match? Let's do exact for ID usually.
                if (campaign !== rule.CampaignID) match = false;
            }

            if (match) {
                console.log(`Donation matched Assignment Rule: "${rule.Name}" -> Assign to UserID ${rule.AssignToUserID}`);
                return rule.AssignToUserID;
            }
        }

        return null; // No assignment found

    } catch (e) {
        console.error('Error evaluating assignment rules:', e);
        return null;
    }
}
