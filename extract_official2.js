// Script to extract talent data with positions from official HTML
const fs = require('fs');
const path = require('path');

const classes = [
    { name: 'warrior', file: '战士.txt', cn: '战士' }
];

function extractTalents(htmlContent) {
    // Find all talent buttons - they contain img with src="/icons/xxx.png"
    // and are followed by a tooltip div
    
    // Get all buttons that have talent icons (not class icons)
    const talentButtons = [];
    
    // Split by button tags
    const parts = htmlContent.split('<button type="button"');
    
    for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        
        // Skip class selector buttons - they have different structure
        if (part.includes('class="hocus:tw-highlight')) continue;
        
        // Get the icon
        const iconMatch = part.match(/src="(\/icons\/([^"]+)\.png)"/);
        if (!iconMatch) continue;
        
        const iconPath = iconMatch[1];
        const iconName = iconMatch[2];
        
        // Skip non-talent icons
        if (iconName.startsWith('class_') || iconName === 'icon_hover') continue;
        
        // Find the tooltip that follows this button
        const tooltipMatch = part.match(/<div class="fixed z-10[^]*?<\/div>/);
        if (!tooltipMatch) continue;
        
        const tooltipHtml = tooltipMatch[0];
        
        // Extract talent name
        const nameMatch = tooltipHtml.match(/<h4 class="tw-color">([^<]+)<\/h4>/);
        if (!nameMatch) continue;
        const name = nameMatch[1];
        
        // Extract rank
        const rankMatch = tooltipHtml.match(/Rank\s*(\d+)\s*\/\s*(\d+)/);
        if (!rankMatch) continue;
        const maxRanks = parseInt(rankMatch[2]);
        
        // Extract description - all text content from whitespace-pre-wrap
        const descMatches = tooltipHtml.match(/<p class="whitespace-pre-wrap">([\s\S]*?)<\/p>/g);
        let description = '';
        if (descMatches) {
            description = descMatches.map(m => {
                return m.replace(/<p class="whitespace-pre-wrap">/, '').replace(/<\/p>/, '')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
            }).join(' ');
        }
        
        // Check if unavailable (grayscale)
        const unavailable = part.includes('grayscale');
        
        talentButtons.push({
            name,
            icon: iconName,
            maxRanks,
            description,
            unavailable
        });
    }
    
    return talentButtons;
}

for (const cls of classes) {
    const filePath = path.join(__dirname, cls.file);
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const talents = extractTalents(content);
        
        console.log(`\n=== ${cls.cn} (${cls.name}) ===`);
        console.log(`Total talents: ${talents.length}\n`);
        
        talents.forEach((t, i) => {
            console.log(`${i}: ${t.name}`);
            console.log(`   icon: ${t.icon}`);
            console.log(`   ranks: ${t.maxRanks}`);
            console.log(`   unavailable: ${t.unavailable}`);
            console.log(`   desc: ${t.description.substring(0, 100)}...`);
            console.log('');
        });
    }
}
