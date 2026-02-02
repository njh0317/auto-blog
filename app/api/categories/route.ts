import { NextRequest, NextResponse } from 'next/server';
import { getCategories, saveCategories } from '@/lib/storage';
import { Category } from '@/lib/types';
import { verifyPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: 카테고리 목록 조회 (인증 불필요)
export async function GET() {
  try {
    const categories = await getCategories();
    return NextResponse.json({ categories });
  } catch (error) {
    console.error('카테고리 조회 실패:', error);
    return NextResponse.json(
      { error: '카테고리 조회에 실패했습니다' },
      { status: 500 }
    );
  }
}

// POST: 카테고리 추가 (인증 필요)
export async function POST(request: NextRequest) {
  const auth = request.headers.get('Authorization');
  if (!auth || !verifyPassword(auth)) {
    return NextResponse.json({ error: '인증 필요' }, { status: 401 });
  }

  try {
    const newCategory: Category = await request.json();
    
    const categories = await getCategories();
    
    // 중복 체크
    if (categories.some(c => c.id === newCategory.id || c.slug === newCategory.slug)) {
      return NextResponse.json(
        { error: '이미 존재하는 카테고리입니다' },
        { status: 400 }
      );
    }
    
    categories.push(newCategory);
    await saveCategories(categories);
    
    return NextResponse.json({ success: true, category: newCategory });
  } catch (error) {
    console.error('카테고리 추가 실패:', error);
    return NextResponse.json(
      { error: '카테고리 추가에 실패했습니다' },
      { status: 500 }
    );
  }
}

// PUT: 카테고리 수정 (인증 필요)
export async function PUT(request: NextRequest) {
  const auth = request.headers.get('Authorization');
  if (!auth || !verifyPassword(auth)) {
    return NextResponse.json({ error: '인증 필요' }, { status: 401 });
  }

  try {
    const updatedCategory: Category = await request.json();
    
    const categories = await getCategories();
    const index = categories.findIndex(c => c.id === updatedCategory.id);
    
    if (index === -1) {
      return NextResponse.json(
        { error: '카테고리를 찾을 수 없습니다' },
        { status: 404 }
      );
    }
    
    categories[index] = updatedCategory;
    await saveCategories(categories);
    
    return NextResponse.json({ success: true, category: updatedCategory });
  } catch (error) {
    console.error('카테고리 수정 실패:', error);
    return NextResponse.json(
      { error: '카테고리 수정에 실패했습니다' },
      { status: 500 }
    );
  }
}

// DELETE: 카테고리 삭제 (인증 필요)
export async function DELETE(request: NextRequest) {
  const auth = request.headers.get('Authorization');
  if (!auth || !verifyPassword(auth)) {
    return NextResponse.json({ error: '인증 필요' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID가 필요합니다' },
        { status: 400 }
      );
    }
    
    const categories = await getCategories();
    const filtered = categories.filter(c => c.id !== id);
    
    if (filtered.length === categories.length) {
      return NextResponse.json(
        { error: '카테고리를 찾을 수 없습니다' },
        { status: 404 }
      );
    }
    
    await saveCategories(filtered);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('카테고리 삭제 실패:', error);
    return NextResponse.json(
      { error: '카테고리 삭제에 실패했습니다' },
      { status: 500 }
    );
  }
}
