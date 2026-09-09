const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function formatCurrency(value: string): string {
  return currencyFormatter.format(Number(value))
}

function formatPercentage(value: number, total: number): string {
  if (total === 0) return '0%'

  return `${Math.round((value / total) * 100)}%`
}

export { formatCurrency, formatPercentage }
