// Smanjivanje fotografije u pregledniku prije slanja na Cloudinary.
// S mobitela stiže 3–12 MB; ovako je fotografija objekta ~300–500 KB
// (dulja strana 2048 px, JPEG 82 %), a besplatni prostor traje puno dulje.
// Ako smanjivanje ne uspije ili ne štedi, šalje se izvornik. PNG s
// prozirnošću (logo) se ne dira. c.html ima vlastitu kopiju (1280 px, 70 %).
export async function smanjiSliku(f, { max = 2048, kvaliteta = 0.82 } = {}) {
  if (!f || !/^image\/(jpeg|png|webp|heic|heif)$/i.test(f.type || '') || f.type === 'image/png') return f
  try {
    const bmp = await createImageBitmap(f, { imageOrientation: 'from-image' })
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height))
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k)
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
    const b = await new Promise(r => c.toBlob(r, 'image/jpeg', kvaliteta))
    return b && b.size < f.size ? new File([b], (f.name || 'foto').replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : f
  } catch { return f }
}
