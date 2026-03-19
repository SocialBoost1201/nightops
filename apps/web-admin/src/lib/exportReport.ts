/**
 * NightOps レポートPDF/Excel出力ユーティリティ
 * xlsxライブラリを使用してExcelファイルを出力。
 * PDF出力はブラウザのwindow.print()を活用。
 */
import * as XLSX from 'xlsx';

export interface ReportRow {
  name: string;
  sales: number;
  nominations: number;
  drinks: number;
  workDays: number;
  estimatedPay: number;
}

export function exportCastReportExcel(rows: ReportRow[], yearMonth: string) {
  const worksheetData = [
    ['キャスト名', '売上', '指名本数', 'ドリンク', '出勤日数', '推定給与'],
    ...rows.map(r => [
      r.name,
      r.sales,
      r.nominations,
      r.drinks,
      r.workDays,
      r.estimatedPay,
    ]),
    // 合計行
    [
      '合計',
      rows.reduce((s, r) => s + r.sales, 0),
      rows.reduce((s, r) => s + r.nominations, 0),
      rows.reduce((s, r) => s + r.drinks, 0),
      '',
      rows.reduce((s, r) => s + r.estimatedPay, 0),
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(worksheetData);

  // 列幅の設定
  ws['!cols'] = [
    { wch: 14 }, // キャスト名
    { wch: 14 }, // 売上
    { wch: 10 }, // 指名
    { wch: 10 }, // ドリンク
    { wch: 10 }, // 出勤日数
    { wch: 14 }, // 推定給与
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${yearMonth} キャスト実績`);

  XLSX.writeFile(wb, `NightOps_キャスト実績_${yearMonth}.xlsx`);
}

export function exportPayrollExcel(rows: ReportRow[], yearMonth: string) {
  const worksheetData = [
    ['キャスト名', '出勤日数', '売上貢献額', '指名本数', '推定給与（概算）'],
    ...rows.map(r => [
      r.name,
      r.workDays,
      r.sales,
      r.nominations,
      r.estimatedPay,
    ]),
    [
      '合計',
      '',
      rows.reduce((s, r) => s + r.sales, 0),
      rows.reduce((s, r) => s + r.nominations, 0),
      rows.reduce((s, r) => s + r.estimatedPay, 0),
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  ws['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 16 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${yearMonth} 給与レポート`);
  XLSX.writeFile(wb, `NightOps_給与レポート_${yearMonth}.xlsx`);
}

/**
 * ブラウザのprint APIを使ったPDF出力。
 * 対象エレメントのIDを渡すと、そのエリアだけを印刷用スタイルで出力。
 */
export function printAsPdf(title: string) {
  const prev = document.title;
  document.title = title;
  window.print();
  document.title = prev;
}
