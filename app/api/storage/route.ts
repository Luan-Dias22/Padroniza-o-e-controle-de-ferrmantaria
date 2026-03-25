import { put, list } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  
  if (!key) {
    return NextResponse.json({ error: 'Key is required' }, { status: 400 });
  }

  try {
    // List blobs to find the one with our key
    const { blobs } = await list({ prefix: `${key}.json` });
    
    if (blobs.length > 0) {
      // Sort by uploadedAt descending to get the latest
      const latestBlob = blobs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())[0];
      
      const response = await fetch(latestBlob.url);
      const data = await response.json();
      return NextResponse.json({ data });
    }
    
    // If not found, return null data
    return NextResponse.json({ data: null });
  } catch (error) {
    console.error(`Error reading blob for key ${key}:`, error);
    return NextResponse.json({ error: 'Failed to read blob' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { key, data } = await request.json();
    
    if (!key || data === undefined) {
      return NextResponse.json({ error: 'Key and data are required' }, { status: 400 });
    }

    // Put the new data into Vercel Blob
    // addRandomSuffix: false will overwrite the existing file with the same name
    const blob = await put(`${key}.json`, JSON.stringify(data), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json'
    });

    return NextResponse.json({ success: true, url: blob.url });
  } catch (error) {
    console.error('Error writing blob:', error);
    return NextResponse.json({ error: 'Failed to write blob' }, { status: 500 });
  }
}
