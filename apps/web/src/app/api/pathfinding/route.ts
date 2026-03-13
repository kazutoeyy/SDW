import { NextRequest, NextResponse } from 'next/server';
import { PathfindingService } from '@/modules/pathfinding/pathfinding.service';
import type { WikiLanguage } from '@/types';

const pathfindingService = new PathfindingService();

/**
 * POST /api/pathfinding
 * Body: { source: string, target: string, language: "vi" | "en" }
 * Tra ve PathResult hoac loi
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { source, target, language } = body as {
      source?: string;
      target?: string;
      language?: WikiLanguage;
    };

    // Validation dau vao
    if (!source || !target) {
      return NextResponse.json(
        { error: 'Thieu tham so "source" hoac "target".' },
        { status: 400 },
      );
    }

    const lang = language || 'en';
    if (lang !== 'vi' && lang !== 'en') {
      return NextResponse.json(
        { error: 'Ngon ngu chi ho tro "vi" hoac "en".' },
        { status: 400 },
      );
    }

    const result = await pathfindingService.findPath(source, target, lang);

    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Loi he thong khong xac dinh.';
    console.error('Loi API /api/pathfinding:', message);

    // Phan biet loi logic (bai viet khong ton tai, khong tim thay duong)
    // va loi he thong (network, timeout)
    const isUserError =
      message.includes('khong ton tai') || message.includes('Khong tim thay');

    return NextResponse.json(
      { error: message },
      { status: isUserError ? 404 : 500 },
    );
  }
}
