export function cleanText(str: string | null | undefined): string | null {
    if (!str) return null;
    return str.trim().replace(/\s+/g, ' ');
}

export function formatName(str: string | null | undefined): string | null {
    if (!str) return null;
    return cleanText(str)!
        .toLowerCase()
        .replace(/\b(\w)/g, s => s.toUpperCase()); // Simple Title Case
}

export function formatState(str: string | null | undefined): string | null {
    if (!str) return null;
    const clean = cleanText(str)!.toUpperCase();
    if (clean.length === 2) return clean;

    // Basic mapping for full names to codes
    const states: Record<string, string> = {
        'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR', 'CALIFORNIA': 'CA',
        'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE', 'FLORIDA': 'FL', 'GEORGIA': 'GA',
        'HAWAII': 'HI', 'IDAHO': 'ID', 'ILLINOIS': 'IL', 'INDIANA': 'IN', 'IOWA': 'IA',
        'KANSAS': 'KS', 'KENTUCKY': 'KY', 'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD',
        'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN', 'MISSISSIPPI': 'MS', 'MISSOURI': 'MO',
        'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV', 'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ',
        'NEW MEXICO': 'NM', 'NEW YORK': 'NY', 'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', 'OHIO': 'OH',
        'OKLAHOMA': 'OK', 'OREGON': 'OR', 'PENNSYLVANIA': 'PA', 'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC',
        'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN', 'TEXAS': 'TX', 'UTAH': 'UT', 'VERMONT': 'VT',
        'VIRGINIA': 'VA', 'WASHINGTON': 'WA', 'WEST VIRGINIA': 'WV', 'WISCONSIN': 'WI', 'WYOMING': 'WY',
        'DISTRICT OF COLUMBIA': 'DC'
    };

    return states[clean] || clean.substring(0, 2); // Fallback
}

export function formatAddress(str: string | null | undefined): string | null {
    if (!str) return null;
    let formatted = formatName(str)!;

    // Standard Abbreviations
    const replacements: Record<string, string> = {
        ' Street': ' St', ' Road': ' Rd', ' Avenue': ' Ave', ' Drive': ' Dr', ' Lane': ' Ln',
        ' Blvd': ' Blvd', ' Boulevard': ' Blvd', ' Court': ' Ct', ' Circle': ' Cir',
        ' North ': ' N ', ' South ': ' S ', ' East ': ' E ', ' West ': ' W ',
        ' Ne ': ' NE ', ' Nw ': ' NW ', ' Se ': ' SE ', ' Sw ': ' SW ', // Quadrants
        ' Apt': ' Apt', ' Apartment': ' Apt', ' Suite': ' Ste', ' Unit': ' Unit'
    };

    Object.entries(replacements).forEach(([full, abbr]) => {
        // Case-insensitive regex replacement for end of words
        const regex = new RegExp(`${full}\\b`, 'gi');
        formatted = formatted.replace(regex, abbr);
    });

    return formatted;
}

export function formatZip(str: string | null | undefined): string | null {
    if (!str) return null;
    const clean = str.replace(/[^0-9]/g, '');
    if (clean.length === 9) return `${clean.substring(0, 5)}-${clean.substring(5)}`;
    if (clean.length > 5) return clean.substring(0, 5);
    return clean.padStart(5, '0');
}

export function formatEmail(str: string | null | undefined): string | null {
    if (!str) return null;
    return cleanText(str)!.toLowerCase();
}

export function formatPhone(str: string | null | undefined): string | null {
    if (!str) return null;
    // Strip non-digits
    const clean = str.replace(/[^0-9]/g, '');

    // Format as (XXX) XXX-XXXX if 10 digits
    if (clean.length === 10) {
        return `(${clean.substring(0, 3)}) ${clean.substring(3, 6)}-${clean.substring(6)}`;
    }
    // If 11 digits and starts with 1, remove 1 and format
    if (clean.length === 11 && clean.startsWith('1')) {
        const ten = clean.substring(1);
        return `(${ten.substring(0, 3)}) ${ten.substring(3, 6)}-${ten.substring(6)}`;
    }

    return str; // Return original if unknown format, or maybe just clean digits? Let's return original for now but trimmed.
}
