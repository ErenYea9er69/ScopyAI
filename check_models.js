// Quick script to discover available models on the LongCat API without any dependencies
const fs = require('fs');
const path = require('path');
const https = require('https');

// Simple .env parser
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '.env.local');
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
      if (match) {
        process.env[match[1].trim()] = match[2].trim();
      }
    });
  } catch (e) {
    console.warn('Could not read .env.local', e.message);
  }
}

loadEnv();

const baseURL = process.env.LONGCAT_BASE_URL || 'https://api.longcat.chat/openai/v1';
const apiKey = process.env.LONGCAT_API_KEY;

console.log(`Querying models at: ${baseURL}/models`);
console.log(`API Key: ${apiKey ? apiKey.slice(0, 8) + '...' : 'MISSING'}`);

async function listModels() {
  try {
    const res = await fetch(`${baseURL}/models`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    console.log(`Status: ${res.status}`);
    
    if (!res.ok) {
      // Try without /v1 in case it's different
      console.log('\nTrying alternate paths...');
      
      for (const alt of [
        'https://api.longcat.chat/v1/models',
        'https://api.longcat.chat/openai/models', 
        'https://api.longcat.chat/models'
      ]) {
        try {
          const r = await fetch(alt, { headers: { 'Authorization': `Bearer ${apiKey}` } });
          console.log(`  ${alt} => ${r.status}`);
          if (r.ok) {
            const d = await r.json();
            console.log('  FOUND MODELS:', JSON.stringify(d, null, 2));
            return;
          }
        } catch (e) { console.log(`  ${alt} => FAILED`); }
      }
      
      const text = await res.text();
      console.log('\nResponse body:', text.slice(0, 500));
      return;
    }
    
    const data = await res.json();
    console.log('\n=== AVAILABLE MODELS ===');
    if (data.data) {
      data.data.forEach(m => console.log(`  - ${m.id}`));
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('Network error:', err.message);
  }
}

listModels();
