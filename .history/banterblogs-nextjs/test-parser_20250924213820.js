// Test script to verify the robust parser works with different episode formats
const fs = require('fs');
const path = require('path');

// Import the parser function (simplified for testing)
function parseEpisodeMetadata(content) {
  const metadata = {};
  
  // Try multiple title formats
  const titleFormats = [
    /^# Episode \d+: "(.+)"$/m,
    /^# Episode \d+: (.+)$/m,
    /^# (.+)$/m
  ];
  
  for (const format of titleFormats) {
    const match = content.match(format);
    if (match) {
      metadata.title = match[1];
      break;
    }
  }
  
  // Try multiple subtitle formats
  const subtitleFormats = [
    /^## (.+)$/m,
    /^### (.+)$/m
  ];
  
  for (const format of subtitleFormats) {
    const match = content.match(format);
    if (match) {
      metadata.subtitle = match[1].replace(/^\*/, '').replace(/\*$/, '');
      break;
    }
  }
  
  // Try multiple date formats
  const dateFormats = [
    /### 📅 (.+?) at/m,
    /### Date: (.+?) at/m,
    /## Date: (.+?) at/m,
    /📅 (.+?) at/m
  ];
  
  for (const format of dateFormats) {
    const match = content.match(format);
    if (match) {
      try {
        metadata.date = new Date(match[1]).toISOString();
        break;
      } catch {
        // Try next format
      }
    }
  }
  
  // Try multiple commit formats
  const commitFormats = [
    /### 🔗 Commit: `(.+?)`/m,
    /### Commit: `(.+?)`/m,
    /## Commit: `(.+?)`/m,
    /🔗 Commit: `(.+?)`/m
  ];
  
  for (const format of commitFormats) {
    const match = content.match(format);
    if (match) {
      metadata.commit = match[1];
      break;
    }
  }
  
  // Try multiple files changed formats
  const filesChangedFormats = [
    /- \*\*Files Changed\*\*: (\d+)/,
    /- Files Changed: (\d+)/,
    /Files Changed: (\d+)/,
    /\*\*Files Changed\*\*: (\d+)/
  ];
  
  for (const format of filesChangedFormats) {
    const match = content.match(format);
    if (match) {
      metadata.filesChanged = parseInt(match[1]);
      break;
    }
  }
  
  // Try multiple lines added formats
  const linesAddedFormats = [
    /- \*\*Lines Added\*\*: ([\d,]+)/,
    /- Lines Added: ([\d,]+)/,
    /Lines Added: ([\d,]+)/,
    /\*\*Lines Added\*\*: ([\d,]+)/
  ];
  
  for (const format of linesAddedFormats) {
    const match = content.match(format);
    if (match) {
      metadata.linesAdded = parseInt(match[1].replace(/,/g, ''));
      break;
    }
  }
  
  // Try multiple complexity formats
  const complexityFormats = [
    /- \*\*Complexity Score\*\*: (\d+)/,
    /- Complexity Score: (\d+)/,
    /Complexity Score: (\d+)/,
    /\*\*Complexity Score\*\*: (\d+)/
  ];
  
  for (const format of complexityFormats) {
    const match = content.match(format);
    if (match) {
      metadata.complexity = parseInt(match[1]);
      break;
    }
  }
  
  return metadata;
}

// Test with problematic episodes
const testEpisodes = ['episode-034.md', 'episode-016.md', 'episode-017.md', 'episode-001.md'];

console.log('🧪 Testing Robust Parser with Different Episode Formats\n');

testEpisodes.forEach(filename => {
  try {
    const filePath = path.join(__dirname, 'posts', filename);
    const content = fs.readFileSync(filePath, 'utf8');
    const metadata = parseEpisodeMetadata(content);
    
    console.log(`📄 ${filename}:`);
    console.log(`   Title: ${metadata.title || '❌ Not found'}`);
    console.log(`   Subtitle: ${metadata.subtitle || '❌ Not found'}`);
    console.log(`   Date: ${metadata.date || '❌ Not found'}`);
    console.log(`   Commit: ${metadata.commit || '❌ Not found'}`);
    console.log(`   Files Changed: ${metadata.filesChanged || '❌ Not found'}`);
    console.log(`   Lines Added: ${metadata.linesAdded || '❌ Not found'}`);
    console.log(`   Complexity: ${metadata.complexity || '❌ Not found'}`);
    console.log('');
  } catch (error) {
    console.log(`❌ Error parsing ${filename}: ${error.message}\n`);
  }
});

console.log('✅ Parser test completed!');
