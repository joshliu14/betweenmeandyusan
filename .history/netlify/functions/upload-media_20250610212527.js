// netlify/functions/upload-media.js
const { MongoClient, GridFSBucket } = require('mongodb');
const multiparty = require('multiparty');
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

const uploadToGridFS = async (db, file, type) => {
  const bucket = new GridFSBucket(db, { 
    bucketName: type === 'photo' ? 'photos' : 'videos' 
  });
  
  const uploadStream = bucket.openUploadStream(file.originalFilename, {
    metadata: {
      contentType: file.headers['content-type'],
      uploadDate: new Date(),
      fileSize: file.size,
      type: type
    }
  });
  
  // Convert buffer to readable stream
  const readable = new Readable();
  readable.push(file.buffer);
  readable.push(null);
  
  return new Promise((resolve, reject) => {
    uploadStream.on('error', reject);
    uploadStream.on('finish', () => {
      resolve({
        id: uploadStream.id,
        filename: file.originalFilename,
        contentType: file.headers['content-type'],
        size: file.size,
        url: `/.netlify/functions/get-media?id=${uploadStream.id}&type=${type}`
      });
    });
    
    readable.pipe(uploadStream);
  });
};

const parseForm = (event) => {
  return new Promise((resolve, reject) => {
    const form = new multiparty.Form();
    
    form.parse(event.body, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }
      
      resolve({ fields, files });
    });
  });
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
    // Parse multipart form data
    const contentType = event.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Content-Type must be multipart/form-data' }),
      };
    }

    // Convert base64 body back to buffer for multiparty
    const body = Buffer.from(event.body, 'base64');
    
    // Parse form manually since multiparty doesn't work with Netlify directly
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid multipart data' }),
      };
    }

    // Simple multipart parser for Netlify
    const parts = body.toString('binary').split(`--${boundary}`);
    let file = null;
    let type = null;

    for (const part of parts) {
      if (part.includes('Content-Disposition')) {
        const lines = part.split('\r\n');
        const dispositionLine = lines.find(line => line.includes('Content-Disposition'));
        const contentTypeLine = lines.find(line => line.includes('Content-Type'));
        
        if (dispositionLine && dispositionLine.includes('name="file"')) {
          const filename = dispositionLine.match(/filename="([^"]+)"/)?.[1];
          const contentType = contentTypeLine?.split(': ')[1];
          
          // Find the actual content (after double CRLF)
          const contentStart = part.indexOf('\r\n\r\n') + 4;
          const content = part.substring(contentStart, part.lastIndexOf('\r\n'));
          
          file = {
            originalFilename: filename,
            headers: { 'content-type': contentType },
            buffer: Buffer.from(content, 'binary'),
            size: Buffer.from(content, 'binary').length
          };
        } else if (dispositionLine && dispositionLine.includes('name="type"')) {
          const contentStart = part.indexOf('\r\n\r\n') + 4;
          type = part.substring(contentStart, part.lastIndexOf('\r\n')).trim();
        }
      }
    }

    if (!file || !type) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No file or type provided' }),
      };
    }

    // Validate file type
    const validTypes = type === 'photo' 
      ? ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      : ['video/mp4', 'video/webm', 'video/mov'];
    
    if (!validTypes.includes(file.headers['content-type'])) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: `Invalid file type. Expected: ${validTypes.join(', ')}` 
        }),
      };
    }

    // Validate file size
    const maxSize = type === 'photo' ? 10 * 1024 * 1024 : 100 * 1024 * 1024;
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
    const result = await uploadToGridFS(db, file, type);

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