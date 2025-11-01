import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // Your middleware logic
  return NextResponse.next();
}

export const config = {
  matcher: [
    // ... your existing matchers
    {
      source: '/((?!_next/static|_next/image|favicon.ico|.well-known/workflow/).*)', 
    },
  ],
};