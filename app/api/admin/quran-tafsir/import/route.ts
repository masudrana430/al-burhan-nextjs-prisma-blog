import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SOURCE_SLUG = 'bn-tafsir-abu-bakr-zakaria';
const SOURCE_URL = 'https://qul.tarteel.ai/resources/translation/33';
const MAX_UPLOAD_BYTES = 3.8 * 1024 * 1024;
const MAX_JSON_BYTES = 64 * 1024 * 1024;

type AyahPosition = { surah: number; ayah: number };
type TafsirGroup = { groupAyahKey: string; ayahKeys: Set<string>; text: string };

function parseAyahKey(value: unknown): AyahPosition | null {
  if (typeof value !== 'string') return null;
  const match = value.match(/^(\d{1,3}):(\d{1,3})$/);
  if (!match) return null;
  const surah = Number(match[1]);
  const ayah = Number(match[2]);
  if (!Number.isInteger(surah) || !Number.isInteger(ayah) ||
      surah < 1 || surah > 114 || ayah < 1 || ayah > 286) return null;
  return { surah, ayah };
}

function compareAyahKeys(left: string, right: string): number {
  const a = parseAyahKey(left)!;
  const b = parseAyahKey(right)!;
  return a.surah - b.surah || a.ayah - b.ayah;
}

function parseQulDataset(payload: unknown): { groups: TafsirGroup[]; coveredAyahs: number } {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Expected a QUL Tafsir JSON object keyed by surah:ayah.');
  }

  const source = payload as Record<string, unknown>;
  const groups = new Map<string, TafsirGroup>();
  const pointers: Array<{ ayahKey: string; target: string }> = [];

  for (const [ayahKey, value] of Object.entries(source)) {
    if (!parseAyahKey(ayahKey)) {
      throw new Error('Invalid QUL ayah key: ' + ayahKey);
    }

    if (typeof value === 'string') {
      if (!parseAyahKey(value)) {
        throw new Error('Invalid QUL shared-passage pointer at ' + ayahKey);
      }
      pointers.push({ ayahKey, target: value });
      continue;
    }

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('Unexpected QUL value for ayah ' + ayahKey);
    }

    const item = value as Record<string, unknown>;
    if (typeof item.text !== 'string' || !item.text.trim()) {
      throw new Error('Missing Tafsir text for group ' + ayahKey);
    }
    if (item.text.length > 300000) {
      throw new Error('Tafsir passage is unexpectedly large for group ' + ayahKey);
    }
    if (!Array.isArray(item.ayah_keys) || item.ayah_keys.length === 0 ||
        item.ayah_keys.some((key) => !parseAyahKey(key))) {
      throw new Error('Invalid ayah_keys array for group ' + ayahKey);
    }

    const ayahKeys = new Set<string>((item.ayah_keys as string[]).map(String));
    ayahKeys.add(ayahKey);
    groups.set(ayahKey, { groupAyahKey: ayahKey, ayahKeys, text: item.text });
  }

  if (!groups.size) throw new Error('The selected QUL JSON contains no Tafsir groups.');

  for (const pointer of pointers) {
    const targetGroup = groups.get(pointer.target);
    if (!targetGroup) {
      throw new Error('Unresolved QUL passage pointer: ' + pointer.ayahKey + ' → ' + pointer.target);
    }
    targetGroup.ayahKeys.add(pointer.ayahKey);
  }

  let totalTextLength = 0;
  const uniqueAyahs = new Set<string>();
  const records = Array.from(groups.values()).map((group) => {
    const sorted = Array.from(group.ayahKeys).sort(compareAyahKeys);
    const first = parseAyahKey(sorted[0])!;
    const last = parseAyahKey(sorted[sorted.length - 1])!;
    sorted.forEach((key) => uniqueAyahs.add(key));
    totalTextLength += group.text.length;
    return {
      sourceSlug: SOURCE_SLUG,
      groupAyahKey: group.groupAyahKey,
      ayahKeys: sorted,
      fromSurah: first.surah,
      fromAyah: first.ayah,
      toSurah: last.surah,
      toAyah: last.ayah,
      text: group.text,
    };
  });

  if (totalTextLength > MAX_JSON_BYTES) {
    throw new Error('Expanded Tafsir text exceeds the import safety limit.');
  }

  return { groups: records, coveredAyahs: uniqueAyahs.size };
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const user = session?.user as ({ role?: string } | undefined);
  return user?.role === 'ADMIN';
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  try {
    const form = await request.formData();
    const upload = form.get('file');
    if (!upload || typeof upload === 'string' || typeof upload.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'Choose the QUL Tafsir JSON file first.' }, { status: 400 });
    }
    if (upload.size <= 0 || upload.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({
        error: 'Upload must be between 1 byte and 3.8 MB. For a larger QUL export, gzip it first and upload the .json.gz file.',
      }, { status: 413 });
    }
    if (form.get('licenseReviewed') !== 'true') {
      return NextResponse.json({
        error: 'Confirm that you have reviewed the resource-specific licence and are authorised to store and display this dataset.',
      }, { status: 400 });
    }

    const uploadedBytes = Buffer.from(await upload.arrayBuffer());
    const digest = createHash('sha256').update(uploadedBytes).digest('hex');
    const isGzip = uploadedBytes.length >= 2 && uploadedBytes[0] === 0x1f && uploadedBytes[1] === 0x8b;

    let jsonBytes: Buffer;
    try {
      jsonBytes = isGzip
        ? gunzipSync(uploadedBytes, { maxOutputLength: MAX_JSON_BYTES })
        : uploadedBytes;
    } catch {
      return NextResponse.json({ error: 'The .gz archive is invalid or expands beyond the 64 MB safety limit.' }, { status: 400 });
    }
    if (jsonBytes.length > MAX_JSON_BYTES) {
      return NextResponse.json({ error: 'Expanded JSON exceeds the 64 MB import safety limit.' }, { status: 413 });
    }

    let payload: unknown;
    try {
      const jsonText = jsonBytes.toString('utf8').replace(/^\uFEFF/, '');
      payload = JSON.parse(jsonText);
    } catch {
      return NextResponse.json({ error: 'The uploaded file is not valid UTF-8 JSON.' }, { status: 400 });
    }

    const parsed = parseQulDataset(payload);
    const sourceVersionRaw = form.get('sourceVersion');
    const sourceVersion = typeof sourceVersionRaw === 'string'
      ? sourceVersionRaw.trim().slice(0, 120) || null
      : null;

    await prisma.$transaction(async (tx) => {
      await tx.quranTafsirSource.upsert({
        where: { slug: SOURCE_SLUG },
        update: {
          title: 'Tafsir Abu Bakr Zakaria',
          author: 'Dr. Abu Bakar Muhammad Zakaria',
          language: 'bn',
          resourceId: '33',
          sourceUrl: SOURCE_URL,
          sourceVersion,
          importedGroups: parsed.groups.length,
          coveredAyahs: parsed.coveredAyahs,
          datasetSha256: digest,
          isActive: false,
          licenseReviewedAt: new Date(),
          importedAt: new Date(),
        },
        create: {
          slug: SOURCE_SLUG,
          title: 'Tafsir Abu Bakr Zakaria',
          author: 'Dr. Abu Bakar Muhammad Zakaria',
          language: 'bn',
          resourceId: '33',
          sourceUrl: SOURCE_URL,
          sourceVersion,
          importedGroups: parsed.groups.length,
          coveredAyahs: parsed.coveredAyahs,
          datasetSha256: digest,
          isActive: false,
          licenseReviewedAt: new Date(),
          importedAt: new Date(),
        },
      });

      await tx.quranTafsirPassage.deleteMany({ where: { sourceSlug: SOURCE_SLUG } });
      await tx.quranTafsirPassage.createMany({ data: parsed.groups });
      await tx.quranTafsirSource.update({
        where: { slug: SOURCE_SLUG },
        data: { isActive: true },
      });
    }, { maxWait: 10000, timeout: 45000 });

    return NextResponse.json({
      success: true,
      source: 'QUL resource #33 — Tafsir Abu Bakr Zakaria',
      importedGroups: parsed.groups.length,
      coveredAyahs: parsed.coveredAyahs,
      sourceVersion,
      datasetSha256: digest,
    });
  } catch (error) {
    console.error('[QUL Tafsir import] Failed.', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message.slice(0, 240) : 'Unknown error',
    });
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'QUL Tafsir import failed.',
    }, { status: 500 });
  }
}
