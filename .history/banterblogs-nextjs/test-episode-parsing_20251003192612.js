const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const postsDirectory = path.join(process.cwd(), 'posts');

// Copy the parsing function from episodes.ts
function parseEpisodeMetadata(content) {
  const metadata = {
    title: '',
    subtitle: '',
    date: '',
    commit: '',
    filesChanged: 0,
    linesAdded: 0,
    complexity: 50
  };
  
  // Try multiple title formats
  const titleFormats = [
    /^# Episode \d+: "(.+)"$/m,
    /^# Episode \d+: (.+)$/m,
    /^# Chimera - Episode \d+: "(.+)"$/m,
    /^# Chimera - Episode \d+: (.+)$/m,
    /^# (.+)$/m
  ];
  
  for (const format of titleFormats) {
    const match = content.match(format);
    if (match) {
      metadata.title = match[1];
      break;
    }
  }
  
  // Extract commit
  const commitMatch = content.match(/### 🔗 Commit[s]?:[\s]*`([a-f0-9]+)`/i);
  if (commitMatch) {
    metadata.commit = commitMatch[1];
  }
  
  // Extract date
  const dateMatch = content.match(/### 📅 (.+?)(?=\s*###|$)/s);
  if (dateMatch) {
    metadata.date = dateMatch[1].trim();
  }
  
  return metadata;
}

// Test episode parsing
console.log('Testing episode parsing...\n');

const fileNames = fs.readdirSync(postsDirectory);
const problematicEpisodes = [];

for (const fileName of fileNames.filter(name => name.endsWith('.md'))) {
  try {
    const fullPath = path.join(postsDirectory, fileName);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    
    // Parse markdown safely
    const { content } = matter(fileContents);
    
    // Extract metadata
    const metadata = parseEpisodeMetadata(content);
    const id = parseInt(fileName.replace(/[^\d]/g, ''), 10);
    
    console.log(`✅ ${fileName}:`);
    console.log(`   Title: ${metadata.title}`);
    console.log(`   Commit: ${metadata.commit}`);
    console.log(`   Date: ${metadata.date}`);
    console.log(`   Content length: ${content.length} chars\n`);
    
  } catch (error) {
    console.error(`❌ ${fileName}: ${error.message}`);
    problematicEpisodes.push(fileName);
  }
}

console.log(`\nSummary:`);
console.log(`Total episodes: ${fileNames.length}`);
console.log(`Successfully parsed: ${fileNames.length - problematicEpisodes.length}`);
console.log(`Failed: ${problematicEpisodes.length}`);

if (problematicEpisodes.length > 0) {
  console.log('\nProblematic episodes:');
  problematicEpisodes.forEach(file => console.log(`  - ${file}`));
}
