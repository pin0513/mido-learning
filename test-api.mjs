#!/usr/bin/env node

/**
 * API Test Script for Mido Learning
 * Tests: Create Component → Upload Material → View Materials
 *
 * Usage: node test-api.mjs <email> <password>
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FIREBASE_API_KEY = 'AIzaSyC36zbChe174ZzwN9c_fgBKntq5JSUdF84';
const API_BASE = 'http://localhost:5000';

async function signIn(email, password) {
  console.log(`\n📧 Signing in as ${email}...`);

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Sign in failed: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  console.log('✅ Signed in successfully');
  return data.idToken;
}

async function createComponent(token) {
  console.log('\n📝 Creating test component...');

  const component = {
    title: `測試教材 ${new Date().toISOString()}`,
    theme: '測試主題',
    description: 'API 測試用教材',
    category: 'Programming',
    tags: ['test', 'api'],
    questions: [
      { question: '這是測試問題？', answer: '這是測試答案' }
    ]
  };

  const response = await fetch(`${API_BASE}/api/components`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(component)
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(`Create component failed: ${JSON.stringify(result)}`);
  }

  console.log('✅ Component created:', result.data.id);
  return result.data.id;
}

async function getMyComponents(token) {
  console.log('\n📋 Fetching my components...');

  const response = await fetch(`${API_BASE}/api/components/my`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(`Get my components failed: ${JSON.stringify(result)}`);
  }

  console.log(`✅ Found ${result.data.total} components`);
  return result.data;
}

function createTestZip() {
  console.log('\n📦 Creating test ZIP file...');

  // Create a minimal ZIP with index.html
  // ZIP format: local file header + file data + central directory + end of central directory

  const indexContent = `<!DOCTYPE html>
<html>
<head><title>Test Material</title></head>
<body><h1>Test Learning Material</h1><p>This is a test.</p></body>
</html>`;

  const contentBuffer = Buffer.from(indexContent);
  const filename = 'index.html';
  const filenameBuffer = Buffer.from(filename);

  // Calculate CRC32
  const crc32 = calculateCRC32(contentBuffer);

  // Local file header (30 bytes + filename + extra)
  const localHeader = Buffer.alloc(30);
  localHeader.writeUInt32LE(0x04034b50, 0); // Local file header signature
  localHeader.writeUInt16LE(20, 4); // Version needed to extract
  localHeader.writeUInt16LE(0, 6); // General purpose bit flag
  localHeader.writeUInt16LE(0, 8); // Compression method (store)
  localHeader.writeUInt16LE(0, 10); // Last mod file time
  localHeader.writeUInt16LE(0, 12); // Last mod file date
  localHeader.writeUInt32LE(crc32, 14); // CRC-32
  localHeader.writeUInt32LE(contentBuffer.length, 18); // Compressed size
  localHeader.writeUInt32LE(contentBuffer.length, 22); // Uncompressed size
  localHeader.writeUInt16LE(filenameBuffer.length, 26); // File name length
  localHeader.writeUInt16LE(0, 28); // Extra field length

  // Central directory header (46 bytes + filename + extra + comment)
  const centralDir = Buffer.alloc(46);
  centralDir.writeUInt32LE(0x02014b50, 0); // Central directory file header signature
  centralDir.writeUInt16LE(20, 4); // Version made by
  centralDir.writeUInt16LE(20, 6); // Version needed to extract
  centralDir.writeUInt16LE(0, 8); // General purpose bit flag
  centralDir.writeUInt16LE(0, 10); // Compression method
  centralDir.writeUInt16LE(0, 12); // Last mod file time
  centralDir.writeUInt16LE(0, 14); // Last mod file date
  centralDir.writeUInt32LE(crc32, 16); // CRC-32
  centralDir.writeUInt32LE(contentBuffer.length, 20); // Compressed size
  centralDir.writeUInt32LE(contentBuffer.length, 24); // Uncompressed size
  centralDir.writeUInt16LE(filenameBuffer.length, 28); // File name length
  centralDir.writeUInt16LE(0, 30); // Extra field length
  centralDir.writeUInt16LE(0, 32); // File comment length
  centralDir.writeUInt16LE(0, 34); // Disk number start
  centralDir.writeUInt16LE(0, 36); // Internal file attributes
  centralDir.writeUInt32LE(0, 38); // External file attributes
  centralDir.writeUInt32LE(0, 42); // Relative offset of local header

  const localFileSize = localHeader.length + filenameBuffer.length + contentBuffer.length;
  const centralDirSize = centralDir.length + filenameBuffer.length;

  // End of central directory (22 bytes)
  const endDir = Buffer.alloc(22);
  endDir.writeUInt32LE(0x06054b50, 0); // End of central dir signature
  endDir.writeUInt16LE(0, 4); // Number of this disk
  endDir.writeUInt16LE(0, 6); // Disk where central directory starts
  endDir.writeUInt16LE(1, 8); // Number of central directory records on this disk
  endDir.writeUInt16LE(1, 10); // Total number of central directory records
  endDir.writeUInt32LE(centralDirSize, 12); // Size of central directory
  endDir.writeUInt32LE(localFileSize, 16); // Offset of start of central directory
  endDir.writeUInt16LE(0, 20); // Comment length

  const zipBuffer = Buffer.concat([
    localHeader, filenameBuffer, contentBuffer,
    centralDir, filenameBuffer,
    endDir
  ]);

  console.log('✅ Test ZIP created in memory');
  return zipBuffer;
}

function calculateCRC32(buffer) {
  let crc = 0xffffffff;
  const table = new Uint32Array(256);

  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }

  for (const byte of buffer) {
    crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

async function uploadMaterial(token, componentId, zipBuffer) {
  console.log(`\n⬆️  Uploading material to component ${componentId}...`);

  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

  const header = `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="test-material.zip"\r\n` +
    `Content-Type: application/zip\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;

  const body = Buffer.concat([
    Buffer.from(header),
    zipBuffer,
    Buffer.from(footer)
  ]);

  const response = await fetch(`${API_BASE}/api/components/${componentId}/materials`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(`Upload material failed: ${JSON.stringify(result)}`);
  }

  console.log('✅ Material uploaded:', result.data);
  return result.data;
}

async function getMaterials(token, componentId) {
  console.log(`\n📥 Fetching materials for component ${componentId}...`);

  const response = await fetch(`${API_BASE}/api/components/${componentId}/materials`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(`Get materials failed: ${JSON.stringify(result)}`);
  }

  console.log('✅ Materials:', result.data.materials);
  return result.data;
}

async function getComponentById(token, componentId) {
  console.log(`\n🔍 Fetching component ${componentId}...`);

  const response = await fetch(`${API_BASE}/api/components/${componentId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(`Get component failed: ${JSON.stringify(result)}`);
  }

  console.log('✅ Component details:', JSON.stringify(result.data, null, 2));
  return result.data;
}

async function main() {
  const [email, password] = process.argv.slice(2);

  if (!email || !password) {
    console.log('Usage: node test-api.mjs <email> <password>');
    console.log('Example: node test-api.mjs pin0513@gmail.com yourpassword');
    process.exit(1);
  }

  try {
    console.log('🧪 Starting API Tests for Mido Learning');
    console.log('=' .repeat(50));

    // Step 1: Sign in
    const token = await signIn(email, password);

    // Step 2: Get my components (test new endpoint)
    await getMyComponents(token);

    // Step 3: Create a test component
    const componentId = await createComponent(token);

    // Step 4: Get component details
    await getComponentById(token, componentId);

    // Step 5: Create test ZIP
    const zipBuffer = createTestZip();

    // Step 6: Upload material
    const material = await uploadMaterial(token, componentId, zipBuffer);

    // Step 7: Get materials list
    await getMaterials(token, componentId);

    console.log('\n' + '=' .repeat(50));
    console.log('🎉 All tests passed!');
    console.log(`\nCreated component: ${componentId}`);
    console.log(`Uploaded material: ${material.materialId}`);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

main();
