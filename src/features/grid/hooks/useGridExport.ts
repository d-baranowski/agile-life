import { useCallback } from 'react'
import type { GridRow } from '../grid.types'

export function useGridExport() {
  const exportToExcel = useCallback(async (rows: GridRow[], boardName: string) => {
    const ExcelJS = (await import('exceljs')).default
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Board')

    sheet.columns = [
      { header: 'Title', key: 'name', width: 40 },
      { header: 'Column', key: 'columnName', width: 20 },
      { header: 'Labels', key: 'labels', width: 30 },
      { header: 'Members', key: 'members', width: 30 },
      { header: 'Epic', key: 'epicCardName', width: 25 },
      { header: 'Story Points', key: 'storyPoints', width: 14 },
      { header: 'Last Activity', key: 'dateLastActivity', width: 22 },
      { header: 'URL', key: 'shortUrl', width: 40 }
    ]

    for (const row of rows) {
      sheet.addRow({
        name: row.name,
        columnName: row.columnName,
        labels: row.labels.map((l) => l.name).join(', '),
        members: row.members.map((m) => m.fullName).join(', '),
        epicCardName: row.epicCardName ?? '',
        storyPoints: row.storyPoints ?? '',
        dateLastActivity: row.dateLastActivity
          ? new Date(row.dateLastActivity).toLocaleDateString()
          : '',
        shortUrl: row.shortUrl
      })
    }

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${boardName.replace(/\s+/g, '-').toLowerCase()}-export.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  return { exportToExcel }
}
