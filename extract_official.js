// Script to extract talent data with positions from official HTML
const fs = require('fs');
const path = require('path');

const classes = [
    { name: 'warrior', file: '战士.txt', cn: '战士' },
    { name: 'paladin', file: '圣骑士.txt', cn: '圣骑士' },
    { name: 'hunter', file: '猎人.txt', cn: '猎人' },
    { name: 'rogue', file: '盗贼.txt', cn: '盗贼' },
    { name: 'priest', file: '牧师.txt', cn: '牧师' },
    { name: 'shaman', file: '萨满.txt', cn: '萨满' },
    { name: 'mage', file: '法师.txt', cn: '法师' },
    { name: 'warlock', file: '术士.txt', cn: '术士' },
    { name: 'druid', file: '德鲁伊.txt', cn: '德鲁伊' }
];

function extractTalents(htmlContent) {
    const talents = [];
    
    // Find all talent buttons with their icons and tooltips
    // Pattern: <button ... <img alt="icon_name" ... src="/icons/xxx.png" ... </button>
    // Followed by: <div class="fixed z-10 ... <h4>Name</h4> ... <p>Description</p>
    
    // First extract tree names
    const treeNamePattern = /<span class="h4 grow truncate" title="([^"]+)">/g;
    const treeNames = [];
    let match;
    while ((match = treeNamePattern.exec(htmlContent)) !== null) {
        treeNames.push(match[1]);
    }
    
    // Extract talents with their position info
    // The pattern is: button with img (talent) + div (tooltip)
    const buttonPattern = /<button type="button"[^>]*>[\s\S]*?<\/button>\s*<div[^>]*>[\s\S]*?<\/div>/g;
    
    let buttonIndex = 0;
    let currentCol = 0;
    let talentIndex = 0;
    
    const buttonMatches = htmlContent.match(buttonPattern) || [];
    
    for (const buttonGroup of buttonMatches) {
        // Extract icon
        const iconMatch = buttonGroup.match(/src="(\/icons\/[^"]+\.png)"/);
        if (!iconMatch) continue;
        
        const iconPath = iconMatch[1].replace('/icons/', '').replace('.png', '');
        
        // Skip class icons and hover icons
        if (iconPath.startsWith('class_') || iconPath === 'icon_hover') continue;
        
        // Extract talent name from tooltip
        const nameMatch = buttonGroup.match(/<h4 class="tw-color">([^<]+)<\/h4>/);
        if (!nameMatch) continue;
        
        const talentName = nameMatch[1];
        
        // Extract rank info
        const rankMatch = buttonGroup.match(/Rank\s*(\d+)\s*\/\s*(\d+)/);
        if (!rankMatch) continue;
        
        const maxRanks = parseInt(rankMatch[2]);
        
        // Extract description - everything in whitespace-pre-wrap
        const descMatch = buttonGroup.match(/<p class="whitespace-pre-wrap">([\s\S]*?)<\/p>/);
        let description = '';
        if (descMatch) {
            description = descMatch[1]
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        }
        
        // Check if grayscale (unavailable)
        const isUnavailable = buttonGroup.includes('grayscale');
        
        talents.push({
            index: talentIndex,
            name: talentName,
            icon: iconPath,
            maxRanks: maxRanks,
            description: description,
            unavailable: isUnavailable
        });
        
        talentIndex++;
    }
    
    return { treeNames, talents };
}

for (const cls of classes) {
    const filePath = path.join(__dirname, cls.file);
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const result = extractTalents(content);
        
        console.log(`\n=== ${cls.cn} (${cls.name}) ===`);
        console.log('Trees:', result.treeNames);
        console.log('Talents:', result.talents.length);
        
        // Print first 10 talents with full details
        result.talents.slice(0, 15).forEach((t, i) => {
            console.log(`${i}: ${t.name} | ${t.icon} | ${t.maxRanks} ranks | ${t.unavailable ? 'UNAVAILABLE' : 'available'}`);
            console.log(`   Desc: ${t.description.substring(0, 80)}...`);
        });
    }
}
