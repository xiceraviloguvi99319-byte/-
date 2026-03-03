// Script to extract clean talent data from the messy JS files
const fs = require('fs');

// Read the warrior talent file
const content = fs.readFileSync('./talent_warrior.js', 'utf8');

// Extract talents with proper parsing
const talents = [];

// Look for pattern: "name": "X", "icon": "\"icon_name\",\"ranks\":N
const nameIconPattern = /"name":\s*"([^"]+)",\s*"icon":\s*"\\\\([^"]+)",\\"ranks\\":(\d+)/g;

let match;
while ((match = nameIconPattern.exec(content)) !== null) {
    talents.push({
        name: match[1],
        icon: match[2],
        maxRanks: parseInt(match[3])
    });
}

console.log('Extracted talents:');
talents.forEach((t, i) => {
    console.log(`${i+1}. ${t.name} - ${t.icon} (${t.maxRanks} ranks)`);
});

// Also look for talents with descriptions (from tooltip field)
const descPattern = /"name":\s*"([^"]+)",\s*"icon":\s*"\\\\([^"]+)",\\"ranks\\":(\d+),\\"tooltip\\":\[\[([^\]]+)\]\]/g;

console.log('\n\nTalents with descriptions:');
let match2;
while ((match2 = descPattern.exec(content)) !== null) {
    // Extract description from tooltip
    const tooltipContent = match2[4];
    // Find the description text
    const descMatch = tooltipContent.match(/children\\":\\"([^\\"]+)/);
    const desc = descMatch ? descMatch[1].replace(/\\"/g, '"') : '';
    console.log(`${match2[1]}: ${desc.substring(0, 80)}...`);
}
