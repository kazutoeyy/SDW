import { NextRequest, NextResponse } from 'next/server';
import { SearchService } from '@/modules/search/search.service';
import type { WikiLanguage } from '@/types';

const searchService = new SearchService();

/**
 * GET /api/search?q=<search_term>&lang=<vi|en>&limit=<number>
 * API Route phuc vu Autocomplete tim bai viet Wikipedia
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const lang = (searchParams.get('lang') || 'en') as WikiLanguage;
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 20);

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Tham so "q" can co it nhat 2 ky tu.' },
        { status: 400 },
      );
    }

    // Validate ngon ngu
    if (lang !== 'vi' && lang !== 'en') {
      return NextResponse.json(
        { error: 'Ngon ngu chi ho tro "vi" hoac "en".' },
        { status: 400 },
      );
    }

    const results = await searchService.search(query, lang, limit);

    return NextResponse.json({ results });
  } catch (err) {
    console.error('Loi API /api/search:', err);
    return NextResponse.json(
      { error: 'Loi he thong khi tim kiem. Vui long thu lai.' },
      { status: 500 },
    );
  }
}
