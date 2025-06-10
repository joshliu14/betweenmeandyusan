// netlify/functions/upload-media.js
const { MongoClient, GridFSBucket } = require('mongodb');
const { Readable } = require('stream');

let cachedClient = null;
let cachedDb = null;

const connectToDatabase = async () => {
  if (!cachedClient || !cachedDb) {
    cachedClient = new MongoClient(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await cachedClient.connect();
    cachedDb = cachedClient.db('yusanstories');
  }
  return cachedDb;
};

const uploadToGridFS = async (db, fileBuffer, filename, contentType, type) => {
  const bucket = new GridFSBucket(db, { 
    bucketName: type === 'photo' ? 'photos' : 'videos' 
  });
  
  const uploadStream = bucket.openUploadStream(filename, {
    metadata: {
      contentType: contentType,
      uploadDate: new Date(),
      fileSize: fileBuffer.length,
      type: type
    }
  });
  
  // Convert buffer to readable stream
  const readable = new Readable();
  readable.push(fileBuffer);
  readable.push(null);
  
  return new Promise((resolve, reject) => {
    uploadStream.on('error', reject);
    uploadStream.on('finish', () => {
      resolve({
        id: uploadStream.id,
        filename: filename,
        contentType: contentType,
        size: fileBuffer.length,
        url: `/.netlify/functions/get-media?id=${uploadStream.id}&type=${type}`
      });
    });
    
    readable.pipe(uploadStream);
  });
};

// Simple multipart parser for Netlify Functions
const parseMultipartForm = (body, boundary) => {
  const parts = body.split(`--${boundary}`);
  const files = {};
  const fields = {};

  for (const part of parts) {
    if (!part.includes('Content-Disposition')) continue;

    const lines = part.split('\r\n');
    const dispositionLine = lines.find(line => line.includes('Content-Disposition'));
    const contentTypeLine = lines.find(line => line.includes('Content-Type'));
    
    if (!dispositionLine) continue;

    const nameMatch = dispositionLine.match(/name="([^"]+)"/);
    if (!nameMatch) continue;

    const fieldName = nameMatch[1];
    const contentStart = part.indexOf('\r\n\r\n') + 4;
    const contentEnd = part.lastIndexOf('\r\n');
    
    if (contentStart >= contentEnd) continue;

    const content = part.substring(contentStart, contentEnd);

    if (dispositionLine.includes('filename=')) {
      // This is a file
      const filenameMatch = dispositionLine.match(/filename="([^"]+)"/);
      const filename = filenameMatch ? filenameMatch[1] : 'unknown';
      const contentType = contentTypeLine ? contentTypeLine.split(': ')[1] : 'application/octet-stream';
      
      files[fieldName] = {
        filename: filename,
        contentType: contentType,
        buffer: Buffer.from(content, 'binary'),
        size: Buffer.from(content, 'binary').length
      };
    } else {
      // This is a regular field
      fields[fieldName] = content.trim();
    }
  }

  return { files, fields };
};

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const contentType = event.headers['content-type'] || '';
    
    if (!contentType.includes('multipart/form-data')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Content-Type must be multipart/form-data' }),
      };
    }

    // Extract boundary
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid multipart data - no boundary found' }),
      };
    }

    // Convert base64 body back to buffer
    const bodyBuffer = event.isBase64Encoded 
      ? Buffer.from(event.body, 'base64')
      : Buffer.from(event.body, 'utf8');
    
    // Parse multipart form
    const { files, fields } = parseMultipartForm(bodyBuffer.toString('binary'), boundary);
    
    if (!files.file) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No file provided' }),
      };
    }

    const file = files.file;
    const type = fields.type;

    if (!type || !['photo', 'video'].includes(type)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Type must be "photo" or "video"' }),
      };
    }

    // Validate file type
    const validTypes = type === 'photo' 
      ? ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      : ['video/mp4', 'video/webm', 'video/mov'];
    
    if (!validTypes.includes(file.contentType.toLowerCase())) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: `Invalid file type. Expected: ${validTypes.join(', ')}` 
        }),
      };
    }

    // Validate file size
    const maxSize = type === 'photo' ? 10 * 1024 * 1024 : 100 * 1024 * 1024; // 10MB for photos, 100MB for videos
    if (file.size > maxSize) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: `File too large. Maximum size: ${type === 'photo' ? '10MB' : '100MB'}` 
        }),
      };
    }

    // Connect to database and upload
    const db = await connectToDatabase();
    const result = await uploadToGridFS(db, file.buffer, file.filename, file.contentType, type);

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(result),
    };

  } catch (error) {
    console.error('Upload error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Upload failed',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      }),
    };
  }
};