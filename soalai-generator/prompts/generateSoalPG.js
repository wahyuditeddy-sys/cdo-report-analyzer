// prompts/generateSoalPG.js
import Anthropic from '@anthropic-ai/sdk';
import { MODEL, MAX_TOKENS } from '../config/examConfig.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function generateSoalPG({ info, indikator, ringkasanMateri, nomorAwal, nomorAkhir, soalSebelumnya }) {
  const jumlahBatch = nomorAkhir - nomorAwal + 1;

  const indikatorList = indikator.map(i => {
    const r = ringkasanMateri?.ringkasanPerIndikator?.[i.no];
    const ringkasan = typeof r === 'string' ? r : r?.ringkasan || '';
    const fakta = r?.faktaSpesifik || [];
    const stimulus = r?.stimulusHOTS || '';
    const istilah = r?.batasanIstilah || [];
    const kategori = i.kategoriKognitif || (i.level <= 'C2' ? 'LOTS' : i.level <= 'C4' ? 'MOTS' : 'HOTS');
    return `Indikator ${i.no}: [${i.materi}] — Level ${i.level} (${kategori})
  Indikator Soal: ${i.indikatorSoal}
  Kata Kunci: ${(i.katakunciMateri || []).join(', ')}
  Konten Buku: ${ringkasan.slice(0, 400)}
  Fakta Spesifik: ${fakta.slice(0, 3).join(' | ')}
  Stimulus HOTS: ${stimulus.slice(0, 300)}
  Batasan Istilah: ${istilah.join(', ')}`;
  }).join('\n\n');

  const jawabanSebelumnya = soalSebelumnya.map(s => s.jawaban).join('');
  const hitung = { A: 0, B: 0, C: 0, D: 0 };
  jawabanSebelumnya.split('').forEach(j => { if (hitung[j] !== undefined) hitung[j]++; });

  const topikSebelumnya = soalSebelumnya.slice(-10).map(s => `${s.indikator}:${s.materi}`).join(', ');

  const islamiInstruction = info.konteksIslami
    ? 'Gunakan nama tokoh Islami (Ahmad, Fatimah, Malik, Aisyah, Zaid, dll.) dan konteks keislaman (masjid, zakat, dll.) dalam soal kontekstual.'
    : '';

  const catatanTambahan = info.catatanTambahan
    ? `\nCatatan tambahan dari guru: ${info.catatanTambahan}`
    : '';

  const prompt = `Kamu adalah Ahli Kurikulum dan Penulis Soal Profesional untuk ujian ${info.mapel} Kelas ${info.kelas} Indonesia.
${islamiInstruction}${catatanTambahan}

⚠️ PRINSIP UTAMA: Gunakan HANYA konten dari kisi-kisi dan materi buku yang diberikan. DILARANG menggunakan pengetahuan umum di luar materi tersebut.

INFORMASI UJIAN:
- Mata Pelajaran: ${info.mapel} | Kelas: ${info.kelas} | Jenis: ${info.namaUjian}

INDIKATOR DAN MATERI BUKU:
${indikatorList}

DISTRIBUSI JAWABAN SEJAUH INI (${soalSebelumnya.length} soal):
A: ${hitung.A} | B: ${hitung.B} | C: ${hitung.C} | D: ${hitung.D}
⚠️ Sesuaikan distribusi batch ini agar keseluruhan MERATA.

TOPIK YANG SUDAH DIGUNAKAN (hindari pengulangan sudut pandang):
${topikSebelumnya || 'Belum ada'}

TUGAS: Buat soal PG nomor ${nomorAwal} sampai ${nomorAkhir} (${jumlahBatch} soal).

=== LANGKAH 1 — SINKRONISASI ===
Sebelum menulis soal, pastikan setiap soal:
✓ Terkait langsung dengan indikator dan materi buku di atas
✓ Menggunakan hanya istilah/konsep yang ada dalam materi buku
✓ Level Bloom sesuai kategoriKognitif indikator

=== LANGKAH 2 — KONSTRUKSI ===
Distribusi kognitif untuk ${jumlahBatch} soal ini:
- LOTS (C1-C2): 20% → ${Math.round(jumlahBatch * 0.2)} soal — ingat/pahami fakta dari buku
- MOTS (C3-C4): 50% → ${Math.round(jumlahBatch * 0.5)} soal — aplikasi/analisis dari buku
- HOTS (C5-C6): 30% → ${Math.round(jumlahBatch * 0.3)} soal — evaluasi/kreasi WAJIB gunakan stimulus

Aturan konstruksi:
- HOTS WAJIB ada field "stimulus" (kutipan teks/tabel/data dari buku, 2-4 kalimat)
- Semua pilihan jawaban: panjang setara, semua masuk akal (plausibel), TIDAK ada "semua benar/salah"
- Pengecoh (B/C/D) harus merepresentasikan kesalahan konsep yang umum — bukan asal salah
- Variasikan format: definisi, hitung-hitungan, analisis kasus, interpretasi data
- Hindari pengulangan sudut pandang soal dari topik yang sudah digunakan

=== LANGKAH 3 — REVIEW (lakukan sebelum output) ===
Periksa setiap soal:
✓ Hanya satu jawaban benar secara absolut
✓ Kunci jawaban tidak bisa diketahui tanpa memahami materi buku
✓ Rasional menjelaskan MENGAPA jawaban benar DAN mengapa pilihan lain salah
✓ Tidak ada clue gramatikal (pilihan terpanjang bukan selalu benar)

⚠️ DISTRIBUSI JAWABAN WAJIB MERATA:
Untuk ${jumlahBatch} soal ini, HARUS ada campuran A, B, C, dan D sebagai jawaban benar.
DILARANG semua atau mayoritas jawaban adalah "A".
Targetkan masing-masing A/B/C/D sekitar 25% dari total soal batch ini.
Posisikan jawaban benar secara acak di pilihan A, B, C, atau D — tidak boleh pola berurutan.

Kembalikan HANYA JSON array (tanpa markdown, tanpa teks lain):
[
  {
    "no": ${nomorAwal},
    "indikator": 1,
    "materi": "sub-topik spesifik dari buku",
    "level": "C2",
    "kategori": "LOTS",
    "stimulus": "",
    "soal": "teks soal lengkap",
    "pilihan": ["teks pilihan A (tanpa prefix A.)", "teks pilihan B", "teks pilihan C", "teks pilihan D"],
    "jawaban": "C",
    "rasional": "C benar karena [alasan dari buku]. A salah karena [...]. B salah karena [...]. D salah karena [...].",
    "pembahasan": "penjelasan lengkap untuk siswa, termasuk langkah perhitungan jika ada"
  },
  {
    "no": ${nomorAwal + 1},
    "indikator": 1,
    "materi": "sub-topik spesifik dari buku",
    "level": "C3",
    "kategori": "MOTS",
    "stimulus": "",
    "soal": "teks soal berikutnya",
    "pilihan": ["teks pilihan A", "teks pilihan B", "teks pilihan C", "teks pilihan D"],
    "jawaban": "B",
    "rasional": "B benar karena [alasan dari buku]. A salah karena [...]. C salah karena [...]. D salah karena [...].",
    "pembahasan": "penjelasan lengkap untuk siswa"
  }
]

Catatan: "stimulus" diisi hanya untuk soal HOTS, kosongkan ("") untuk LOTS/MOTS.
Catatan: field "jawaban" HARUS bervariasi antara A, B, C, dan D — sesuaikan pilihan jawaban sehingga yang benar sesuai field "jawaban".`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: 'Kamu adalah Ahli Kurikulum dan Penulis Soal Profesional Indonesia. Kembalikan HANYA JSON array valid tanpa markdown.',
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content.map(b => b.text || '').join('');
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}
