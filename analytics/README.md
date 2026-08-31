# Pandas analiz çekirdeği

Bu klasör, web uygulamasından bağımsız test edilebilen üretim analizi kodunu içerir.

## Veri kuralları

- Tarihler saat dilimi taşımayan `YYYY-MM-DD` üretim günleridir.
- Aynı günün vardiya kayıtları günlük toplamda birleştirilir.
- Kayıt bulunmayan gün `0` değildir; `quantity: null` ve `is_missing: true` döner.
- Kaydedilmiş gerçek sıfır değeri `quantity: 0` ve `is_missing: false` olarak korunur.
- Ton ve kilogram yalnız açık bir hedef birim verilerek dönüştürülebilir.
- Metreküp ve adet, kütle birimleriyle aynı seride toplanamaz.
- Hareketli ortalama eksik günleri sıfır kabul etmez; penceredeki mevcut gözlemleri kullanır.
- Vardiya özeti toplam, kayıt ortalaması ve çalışma saati başına üretimi ayrı gösterir.

## Komut satırı sözleşmesi

Betik JSON girdisini standart girdiden alır ve sonucu standart çıktıya JSON olarak yazar.

```powershell
@'
{
  "start_date": "2026-08-28",
  "end_date": "2026-08-31",
  "output_unit": "TON",
  "records": [
    { "date": "2026-08-29", "quantity": 350.5, "unit": "TON" },
    { "date": "2026-08-31", "quantity": 300, "unit": "TON" }
  ]
}
'@ | & ".\.venv\Scripts\python.exe" ".\analytics\production_series.py"
```

## Test

```powershell
& ".\.venv\Scripts\python.exe" -m unittest discover -s analytics/tests -v
```
